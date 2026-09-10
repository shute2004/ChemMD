import { applyRingSkeletalRule } from "./rules/ring-skeletal.js";
import { computeValenceWarnings } from "./valence.js";

export const DEFAULT_SOURCE = `formula: C6H6

# ChemMD - Benzene Example
atoms:
  C1: C
  C2: C
  C3: C
  C4: C
  C5: C
  C6: C
  H1: H
  H2: H
  H3: H
  H4: H
  H5: H
  H6: H

bonds:
  C1 = C2
  C2 - C3
  C3 = C4
  C4 - C5
  C5 = C6
  C6 - C1
  C1 - H1
  C2 - H2
  C3 - H3
  C4 - H4
  C5 - H5
  C6 - H6
`;

const SECTION_RE = /^(atoms|bonds|metadata|formula|imports|components|ports):\s*(.*)$/;
const ATOM_RE = /^([A-Za-z0-9_-]+):\s*([A-Za-z][A-Za-z0-9+\-]*)\s*$/;
const BOND_RE = /^([A-Za-z0-9_\-\.]+)\s*(-|=|≡|\.)\s*([A-Za-z0-9_\-\.]+)\s*$/;
const POSITION_RE = /^([A-Za-z0-9_-]+):\s*\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]\s*$/;
const IMPORT_RE = /^\-\s+([A-Za-z0-9_-]+)\s+from\s+"([^"]+)"$/;
const COMPONENT_RE = /^([A-Za-z0-9_-]+):\s*\[([A-Za-z0-9_-]+)\](?:\s*n=(\d+|[a-zA-Z]))?$/;
const PORT_RE = /^([A-Za-z0-9_-]+):\s*([A-Za-z0-9_-]+)$/;

export function parseChemMD(source) {
  const atoms = new Map();
  const bonds = [];
  const positions = new Map();
  const imports = [];
  const ports = {};
  const errors = [];
  let section = null;
  let inPositions = false;
  let formulaStr = "";

  source.split(/\r?\n/).forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const line = stripComment(rawLine).trim();
    if (!line) return;

    const sectionMatch = line.match(SECTION_RE);
    if (sectionMatch) {
      section = sectionMatch[1];
      inPositions = false;
      if (section === "formula" && sectionMatch[2]) formulaStr = sectionMatch[2].trim();
      return;
    }

    if (section === "formula") {
      if (!formulaStr) formulaStr = line;
      return;
    }

    if (section === "metadata") {
      if (line === "positions:") {
        inPositions = true;
        return;
      }
      if (line.startsWith("formula:")) {
        formulaStr = line.split("formula:")[1].trim();
        return;
      }
      if (inPositions) {
        const match = line.match(POSITION_RE);
        if (!match) {
          errors.push(`Line ${lineNumber}: invalid position "${line}"`);
          return;
        }
        positions.set(match[1], [Number(match[2]), Number(match[3])]);
      }
      return;
    }

    if (section === "atoms") {
      const match = line.match(ATOM_RE);
      if (!match) {
        errors.push(`Line ${lineNumber}: invalid atom "${line}"`);
        return;
      }
      atoms.set(match[1], { id: match[1], label: match[2] });
      return;
    }

    if (section === "components") {
      const match = line.match(COMPONENT_RE);
      if (!match) {
        errors.push(`Line ${lineNumber}: invalid component "${line}"`);
        return;
      }
      atoms.set(match[1], { id: match[1], label: match[2], isComponent: true, repeat: match[3] || null });
      return;
    }

    if (section === "imports") {
      const match = line.match(IMPORT_RE);
      if (!match) {
        errors.push(`Line ${lineNumber}: invalid import "${line}"`);
        return;
      }
      imports.push({ name: match[1], path: match[2] });
      return;
    }

    if (section === "ports") {
      const match = line.match(PORT_RE);
      if (!match) {
        errors.push(`Line ${lineNumber}: invalid port "${line}"`);
        return;
      }
      ports[match[1]] = match[2];
      return;
    }

    if (section === "bonds") {
      const match = line.match(BOND_RE);
      if (!match) {
        errors.push(`Line ${lineNumber}: invalid bond "${line}"`);
        return;
      }
      bonds.push({ from: match[1], type: normalizeBond(match[2]), to: match[3] });
      return;
    }

    errors.push(`Line ${lineNumber}: content must be inside atoms, bonds, metadata, or formula`);
  });

  if (atoms.size === 0 && formulaStr) {
    for (const atom of generateAtomsFromFormula(formulaStr)) atoms.set(atom.id, atom);
  }

  const atomsArray = [...atoms.values()];
  for (const bond of bonds) {
    const fromBase = bond.from.split(".")[0];
    const toBase = bond.to.split(".")[0];
    if (!atoms.has(fromBase)) errors.push(`Bond references missing atom/component "${fromBase}"`);
    if (!atoms.has(toBase)) errors.push(`Bond references missing atom/component "${toBase}"`);
  }

  const valences = computeValenceWarnings(atomsArray, bonds);
  return {
    atoms: atomsArray,
    bonds,
    positions: Object.fromEntries(positions),
    formula: formulaStr || computeFormula(atomsArray),
    imports,
    ports,
    errors,
    warnings: valences.warnings,
    warningAtoms: valences.warningAtoms
  };
}

export function computeFormula(atoms) {
  if (!atoms || atoms.length === 0) return "";
  const counts = {};
  for (const a of atoms) counts[a.label] = (counts[a.label] || 0) + 1;
  let formula = "";
  if (counts.C) {
    formula += "C" + (counts.C > 1 ? counts.C : "");
    delete counts.C;
    if (counts.H) {
      formula += "H" + (counts.H > 1 ? counts.H : "");
      delete counts.H;
    }
  }
  for (const el of Object.keys(counts).sort()) formula += el + (counts[el] > 1 ? counts[el] : "");
  return formula;
}

export function generateAtomsFromFormula(formula) {
  const regex = /([A-Z][a-z]*)(\d*)/g;
  let match;
  const atoms = [];
  const counters = {};
  while ((match = regex.exec(formula)) !== null) {
    const element = match[1];
    const count = match[2] ? parseInt(match[2], 10) : 1;
    for (let i = 0; i < count; i++) {
      counters[element] = (counters[element] || 0) + 1;
      atoms.push({ id: `${element}${counters[element]}`, label: element });
    }
  }
  return atoms;
}

export function ensurePositions(structure, width = 900, height = 620) {
  const result = { ...structure.positions };
  const generated = autoArrangePositions(structure, width, height);
  for (const atom of structure.atoms) if (!result[atom.id]) result[atom.id] = generated[atom.id];
  return result;
}

export function autoArrangePositions(structure, width = 900, height = 620) {
  const result = {};
  const centerX = width / 2;
  const centerY = height / 2;
  const atomIds = structure.atoms.map((atom) => atom.id);
  const neighbors = new Map(atomIds.map((id) => [id, []]));
  const bondLength = 78;
  const branchAngles = [-Math.PI / 3, Math.PI / 3, 0, -Math.PI * 2 / 3, Math.PI * 2 / 3, Math.PI];

  structure.bonds.forEach((bond) => {
    neighbors.get(bond.from)?.push(bond.to);
    neighbors.get(bond.to)?.push(bond.from);
  });

  let componentIndex = 0;
  for (const rootId of atomIds) {
    if (result[rootId]) continue;
    result[rootId] = [round1(centerX + componentIndex * 170), round1(centerY + componentIndex * 24)];
    const queue = [{ id: rootId, parent: null, angle: 0 }];
    while (queue.length) {
      const current = queue.shift();
      const currentPosition = result[current.id];
      const openNeighbors = (neighbors.get(current.id) || []).filter((id) => id !== current.parent);
      openNeighbors.forEach((neighborId, index) => {
        if (result[neighborId]) return;
        const angle = current.parent === null ? branchAngles[index % branchAngles.length] : current.angle + branchAngles[index % branchAngles.length];
        result[neighborId] = [
          round1(currentPosition[0] + Math.cos(angle) * bondLength),
          round1(currentPosition[1] + Math.sin(angle) * bondLength)
        ];
        queue.push({ id: neighborId, parent: current.id, angle });
      });
    }
    componentIndex += 1;
  }
  return result;
}

export function writePositions(source, positions, atoms = []) {
  let body = stripMetadata(source).trimEnd();
  body = body.replace(/^formula:\s*.*(?:\r?\n|$)/m, "").trim();
  if (!body.includes("atoms:") && atoms.length > 0) {
    const atomsLines = ["atoms:", ...atoms.map((a) => `  ${a.id}: ${a.label}`)];
    body = `${atomsLines.join("\n")}\n\n${body}`.trimStart();
  }
  const lines = [
    `formula: ${computeFormula(atoms)}`,
    "",
    body,
    "",
    "metadata:",
    "  positions:",
    ...Object.entries(positions)
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))
      .map(([id, [x, y]]) => `    ${id}: [${round1(x).toFixed(1)}, ${round1(y).toFixed(1)}]`)
  ];
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

const displayRules = [applyRingSkeletalRule];
export function publicationVisibility(structure) {
  const visibility = { hiddenLabels: new Set(), hiddenAtoms: new Set(), hiddenBonds: new Set() };
  for (const rule of displayRules) rule(structure, visibility);
  return visibility;
}

function stripMetadata(source) {
  const lines = source.split(/\r?\n/);
  const index = lines.findIndex((line) => line.trim() === "metadata:");
  return index === -1 ? source : lines.slice(0, index).join("\n");
}
function stripComment(line) { const index = line.indexOf("#"); return index === -1 ? line : line.slice(0, index); }
function normalizeBond(type) { if (type === "≡") return "triple"; if (type === "=") return "double"; if (type === ".") return "dotted"; return "single"; }
function round1(value) { return Math.round(value * 10) / 10; }

/** SVG rendering for ChemMD. */
const SVG_NS = "http://www.w3.org/2000/svg";

export function renderBonds(bondsLayer, bonds, atoms, positions, displayMode, visibility) {
  bondsLayer.replaceChildren(...bonds.map((bond, index) => renderBond(bond, index, atoms, positions, displayMode, visibility)));
}

export function renderAtoms(atomsLayer, atoms, positions, displayMode, visibility, warningAtoms = new Set()) {
  const rendered = atoms
    .filter((atom) => !visibility?.hiddenAtoms.has(atom.id))
    .map((atom) => ({ element: renderAtom(atom, positions, displayMode, visibility, warningAtoms), id: atom.id }));
  atomsLayer.replaceChildren(...rendered.map((r) => r.element));
  return rendered;
}

function renderBond(bond, index, atoms, positions, displayMode, visibility) {
  const group = svgElement("g", { class: `bond bond-${bond.type}` });
  if (visibility?.hiddenBonds.has(index)) return group;
  const from = positions[bond.from];
  const to = positions[bond.to];
  if (!from || !to) return group;
  const atomFrom = atoms.find((atom) => atom.id === bond.from);
  const atomTo = atoms.find((atom) => atom.id === bond.to);
  const trimmed = trimBondForLabels(from, to, atomFrom, atomTo, displayMode, visibility);
  const [x1, y1] = trimmed.from;
  const [x2, y2] = trimmed.to;
  for (const offset of bondOffsets(bond.type, x1, y1, x2, y2, displayMode)) {
    group.append(svgElement("line", { x1: x1 + offset.x, y1: y1 + offset.y, x2: x2 + offset.x, y2: y2 + offset.y }));
  }
  return group;
}

function renderAtom(atom, positions, displayMode, visibility, warningAtoms = new Set()) {
  const [x, y] = positions[atom.id] || [0, 0];
  const group = svgElement("g", { class: "atom", tabindex: "0", transform: `translate(${x}, ${y})`, "data-id": atom.id });
  if (atom.isComponent) {
    const textStr = `[-${atom.label}-]${atom.repeat ? atom.repeat : "n"}`;
    const rectWidth = Math.max(80, textStr.length * 9);
    group.append(
      svgElement("rect", { x: -rectWidth / 2, y: -18, width: rectWidth, height: 36, rx: 4, fill: "#f2f7f4", stroke: "#2f6f5b", "stroke-width": "1.5" }),
      svgTextElement(textStr, { y: 5, fill: "#173d31", "font-weight": "600", "font-size": "13px", "text-anchor": "middle" })
    );
    return group;
  }
  if (displayMode === "edit") {
    const circle = svgElement("circle", { r: 18 });
    if (warningAtoms.has(atom.id)) circle.setAttribute("class", "atom-warning");
    group.append(circle, svgTextElement(atom.label, { y: 5, class: `atom-label atom-${atom.label.toLowerCase()}` }), svgTextElement(atom.id, { y: 33, class: "atom-id" }));
  } else if (!visibility?.hiddenLabels.has(atom.id)) {
    group.append(svgElement("rect", { class: "atom-bg", x: -14, y: -14, width: 28, height: 28, rx: 2 }), svgTextElement(atom.label, { y: 6, class: `atom-label atom-${atom.label.toLowerCase()}` }));
  }
  return group;
}

export function trimBondForLabels(from, to, atomFrom, atomTo, displayMode, visibility) {
  if (displayMode !== "publish") return { from, to };
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const fromTrim = visibility?.hiddenLabels.has(atomFrom?.id) || visibility?.hiddenAtoms.has(atomFrom?.id) ? 0 : labelTrim(atomFrom);
  const toTrim = visibility?.hiddenLabels.has(atomTo?.id) || visibility?.hiddenAtoms.has(atomTo?.id) ? 0 : labelTrim(atomTo);
  return { from: [from[0] + ux * fromTrim, from[1] + uy * fromTrim], to: [to[0] - ux * toTrim, to[1] - uy * toTrim] };
}

function labelTrim(atom) { if (!atom) return 0; if (atom.isComponent) return Math.max(80, `[-${atom.label}-]${atom.repeat || "n"}`.length * 9) / 2 + 2; return atom.label.length >= 2 ? 22 : 17; }
export function bondOffsets(type, x1, y1, x2, y2, displayMode) {
  if (type === "single" || type === "dotted") return [{ x: 0, y: 0 }];
  const dx = x2 - x1; const dy = y2 - y1; const length = Math.hypot(dx, dy) || 1; const distance = displayMode === "publish" ? 3 : 5;
  const normal = { x: (-dy / length) * distance, y: (dx / length) * distance };
  return type === "double" ? [normal, { x: -normal.x, y: -normal.y }] : [normal, { x: 0, y: 0 }, { x: -normal.x, y: -normal.y }];
}
export function svgElement(name, attrs = {}) { const el = document.createElementNS(SVG_NS, name); for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value)); return el; }
export function svgTextElement(text, attrs = {}) { const el = svgElement("text", attrs); el.textContent = text; return el; }

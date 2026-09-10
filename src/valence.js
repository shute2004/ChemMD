const STANDARD_VALENCES = { H: 1, C: 4, N: 3, O: 2, F: 1, S: 2, P: 3, Cl: 1, Br: 1, I: 1 };

export function computeValenceWarnings(atoms, bonds) {
  const warnings = [];
  const warningAtoms = new Set();
  const degrees = new Map();
  atoms.forEach((a) => degrees.set(a.id, 0));
  bonds.forEach((b) => {
    let weight = 1;
    if (b.type === "double") weight = 2;
    if (b.type === "triple") weight = 3;
    if (b.type !== "dotted") {
      degrees.set(b.from, (degrees.get(b.from) || 0) + weight);
      degrees.set(b.to, (degrees.get(b.to) || 0) + weight);
    }
  });
  atoms.forEach((a) => {
    const expected = STANDARD_VALENCES[a.label];
    const current = degrees.get(a.id);
    if (expected !== undefined && current !== expected) {
      warnings.push(`⚠ ${a.id} (${a.label}) has ${current} bond(s), expected ${expected}.`);
      warningAtoms.add(a.id);
    }
  });
  return { warnings, warningAtoms };
}

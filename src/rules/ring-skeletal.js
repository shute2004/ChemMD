export function getRingAtoms(structure) {
  const adj = new Map();
  const active = new Set();
  for (const atom of structure.atoms) {
    if (atom.label !== "H") {
      adj.set(atom.id, new Set());
      active.add(atom.id);
    }
  }
  for (const bond of structure.bonds) {
    if (active.has(bond.from) && active.has(bond.to)) {
      adj.get(bond.from).add(bond.to);
      adj.get(bond.to).add(bond.from);
    }
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of active) {
      let degree = 0;
      for (const neighbor of adj.get(id)) if (active.has(neighbor)) degree++;
      if (degree <= 1) { active.delete(id); changed = true; }
    }
  }
  return active;
}

export function applyRingSkeletalRule(structure, visibility) {
  const atomsById = new Map(structure.atoms.map((atom) => [atom.id, atom]));
  const ringAtoms = getRingAtoms(structure);
  for (const atom of structure.atoms) if (atom.label === "C" && ringAtoms.has(atom.id)) visibility.hiddenLabels.add(atom.id);
  structure.bonds.forEach((bond, index) => {
    const from = atomsById.get(bond.from); const to = atomsById.get(bond.to);
    if (!from || !to) return;
    const fromIsHiddenC = from.label === "C" && ringAtoms.has(from.id);
    const toIsHiddenC = to.label === "C" && ringAtoms.has(to.id);
    const hidesCarbonHydrogen = (from.label === "H" && toIsHiddenC) || (from.label === "C" && fromIsHiddenC && to.label === "H");
    if (hidesCarbonHydrogen) {
      visibility.hiddenBonds.add(index);
      visibility.hiddenAtoms.add(from.label === "H" ? from.id : to.id);
    }
  });
}

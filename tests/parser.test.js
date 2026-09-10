import test from "node:test";
import assert from "node:assert/strict";
import { ensurePositions, parseChemMD, publicationVisibility, writePositions } from "../src/chemmd.js";

test("parses atoms, bonds, and positions", () => {
  const parsed = parseChemMD(`atoms:\n  a: C\n  b: O\n\nbonds:\n  a = b\n\nmetadata:\n  positions:\n    a: [10.0, 20.5]\n    b: [40, 80]\n`);
  assert.equal(parsed.errors.length, 0);
  assert.deepEqual(parsed.bonds, [{ from: "a", type: "double", to: "b" }]);
  assert.deepEqual(parsed.positions, { a: [10, 20.5], b: [40, 80] });
});

test("reports missing bond atoms", () => {
  const parsed = parseChemMD(`atoms:\n  1: C\n\nbonds:\n  1 - 2\n`);
  assert.match(parsed.errors.join("\n"), /missing atom\/component "2"/);
});

test("writes deterministic metadata positions", () => {
  const source = `atoms:\n  2: O\n  1: C\n\nbonds:\n  1 - 2\n`;
  const output = writePositions(source, { 2: [20.04, 30.05], 1: [10, 11] }, [{ id: "2", label: "O" }, { id: "1", label: "C" }]);
  assert.match(output, /formula: CO/);
  assert.match(output, /1: \[10\.0, 11\.0\]/);
  assert.match(output, /2: \[20\.0, 30\.1\]/);
});

test("ensurePositions fills missing coordinates", () => {
  const positions = ensurePositions(parseChemMD(`atoms:\n  1: C\n`));
  assert.ok(Array.isArray(positions["1"]));
});

test("publication visibility hides ring-carbon labels and carbon-bound hydrogens", () => {
  const parsed = parseChemMD(`atoms:\n  1: C\n  2: C\n  3: C\n  4: H\n  5: O\n  6: H\n\nbonds:\n  1 - 2\n  2 - 3\n  3 - 1\n  1 - 4\n  2 - 5\n  5 - 6\n`);
  const visibility = publicationVisibility(parsed);
  assert.equal(visibility.hiddenLabels.has("1"), true);
  assert.equal(visibility.hiddenLabels.has("5"), false);
  assert.equal(visibility.hiddenAtoms.has("4"), true);
  assert.equal(visibility.hiddenAtoms.has("6"), false);
});

test("parses imports without claiming cross-file resolution", () => {
  const parsed = parseChemMD(`imports:\n  - Styrene from "Styrene.chemmd"\n`);
  assert.deepEqual(parsed.imports, [{ name: "Styrene", path: "Styrene.chemmd" }]);
  assert.equal(parsed.errors.length, 0);
});

test("parses component declarations and repeat counts", () => {
  const parsed = parseChemMD(`components:\n  Polymer1: [Styrene] n=100\n`);
  assert.deepEqual(parsed.atoms, [{ id: "Polymer1", label: "Styrene", isComponent: true, repeat: "100" }]);
  assert.equal(parsed.errors.length, 0);
});

test("parses named ports", () => {
  const parsed = parseChemMD(`atoms:\n  C1: C\n\nports:\n  head: C1\n  tail: C1\n`);
  assert.deepEqual(parsed.ports, { head: "C1", tail: "C1" });
  assert.equal(parsed.errors.length, 0);
});

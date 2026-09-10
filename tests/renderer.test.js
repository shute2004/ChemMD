import test from "node:test";
import assert from "node:assert/strict";
import { bondOffsets, trimBondForLabels } from "../src/renderer.js";

test("double and triple bonds produce symmetric offsets", () => {
  assert.deepEqual(
    bondOffsets("double", 0, 0, 10, 0, "publish"),
    [
      { x: 0, y: 3 },
      { x: 0, y: -3 },
    ],
  );

  assert.deepEqual(
    bondOffsets("triple", 0, 0, 10, 0, "edit"),
    [
      { x: 0, y: 5 },
      { x: 0, y: 0 },
      { x: 0, y: -5 },
    ],
  );
});

test("publish rendering trims visible atom labels from bond endpoints", () => {
  const visibility = {
    hiddenLabels: new Set(),
    hiddenAtoms: new Set(),
  };
  const result = trimBondForLabels(
    [0, 0],
    [100, 0],
    { id: "a", label: "C" },
    { id: "b", label: "Cl" },
    "publish",
    visibility,
  );

  assert.deepEqual(result.from, [17, 0]);
  assert.deepEqual(result.to, [78, 0]);
});

test("hidden labels do not trim a publish bond", () => {
  const visibility = {
    hiddenLabels: new Set(["a", "b"]),
    hiddenAtoms: new Set(),
  };
  const result = trimBondForLabels(
    [1, 2],
    [9, 2],
    { id: "a", label: "C" },
    { id: "b", label: "O" },
    "publish",
    visibility,
  );
  assert.deepEqual(result, { from: [1, 2], to: [9, 2] });
});

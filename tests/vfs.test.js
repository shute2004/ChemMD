import test from "node:test";
import assert from "node:assert/strict";

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }
  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }
  setItem(key, value) {
    this.values.set(key, String(value));
  }
  removeItem(key) {
    this.values.delete(key);
  }
  clear() {
    this.values.clear();
  }
}

globalThis.localStorage = new MemoryStorage();
const { VFS, defaultFiles } = await import("../src/vfs.js");

test("VFS starts from defaults and persists file changes", () => {
  localStorage.clear();
  const first = new VFS();
  assert.equal(first.getFile("main.chemmd"), defaultFiles["main.chemmd"]);

  first.setFile("custom.chemmd", "atoms:\n  C1: C\n");
  const second = new VFS();
  assert.equal(second.getFile("custom.chemmd"), "atoms:\n  C1: C\n");
  assert.deepEqual(second.list(), ["custom.chemmd", "main.chemmd"]);

  second.deleteFile("custom.chemmd");
  const third = new VFS();
  assert.equal(third.getFile("custom.chemmd"), undefined);
});

test("active file falls back when persisted selection no longer exists", () => {
  localStorage.clear();
  const vfs = new VFS();
  vfs.setFile("other.chemmd", "formula: H2O\n");
  vfs.setActiveFile("other.chemmd");
  assert.equal(vfs.getActiveFile(), "other.chemmd");

  vfs.deleteFile("other.chemmd");
  assert.equal(vfs.getActiveFile(), "main.chemmd");
});

test("corrupt stored JSON falls back to default files", () => {
  localStorage.clear();
  localStorage.setItem("chemmd_files", "{broken-json");
  const originalError = console.error;
  console.error = () => {};
  try {
    const vfs = new VFS();
    assert.equal(vfs.getFile("main.chemmd"), defaultFiles["main.chemmd"]);
  } finally {
    console.error = originalError;
  }
});

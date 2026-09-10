const STORAGE_KEY = "chemmd_files";
const ACTIVE_KEY = "chemmd_active_file";

export const defaultFiles = {
  "main.chemmd": `formula: C6H6\n\natoms:\n  C1: C\n  C2: C\n  C3: C\n  C4: C\n  C5: C\n  C6: C\n\nbonds:\n  C1 = C2\n  C2 - C3\n  C3 = C4\n  C4 - C5\n  C5 = C6\n  C6 - C1\n`
};

export class VFS {
  constructor() { this.files = this.load(); }
  load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (error) {
      console.error("Failed to load VFS", error);
    }
    return { ...defaultFiles };
  }
  save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.files)); }
  getFile(path) { return this.files[path]; }
  setFile(path, content) { this.files[path] = content; this.save(); }
  deleteFile(path) { delete this.files[path]; this.save(); }
  list() { return Object.keys(this.files).sort(); }
  getActiveFile() {
    const active = localStorage.getItem(ACTIVE_KEY);
    if (active && this.files[active] !== undefined) return active;
    return "main.chemmd";
  }
  setActiveFile(path) { localStorage.setItem(ACTIVE_KEY, path); }
}

export const vfs = new VFS();

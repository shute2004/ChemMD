# ChemMD

ChemMD is a lightweight, text-first chemical structure editor. Molecular topology is defined in a readable text format while 2D coordinates can be edited visually in the browser.

By separating chemical topology from presentation data such as coordinates and styling, ChemMD keeps structures easy to inspect, reproduce, and version-control.

## Features

- Text-first topology using `atoms:`, `bonds:`, and molecular formulas.
- Parser support for `imports:`, `components:`, and `ports:` syntax.
- Graph-based ring detection for skeletal rendering.
- Edit and Preview modes with draggable coordinates and camera controls.
- SVG and PNG export.
- Automatic 2D arrangement for structures without explicit positions.
- Valence warnings for common elements.
- Local multi-file workspace for storing multiple `.chemmd` documents.

`imports:` / `components:` / `ports:` are currently parsed as structured syntax, but cross-file component resolution and expansion are not implemented yet. The multi-file workspace therefore stores documents locally without automatically resolving one `.chemmd` file into another.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Tests

```bash
npm test
```

The parser suite covers atoms, bonds, positions, missing references, deterministic metadata writing, generated positions, skeletal visibility, and the current `imports` / `components` / `ports` syntax.

## License

Source-visible, all rights reserved. See [LICENSE](LICENSE).

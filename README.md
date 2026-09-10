# ChemMD

ChemMD is a lightweight, text-first chemical structure editor. Molecular topology is defined in a readable text format while 2D coordinates can be edited visually in the browser.

By separating chemical topology from presentation data such as coordinates and styling, ChemMD keeps structures easy to inspect, reproduce, and version-control.

## Features

- Text-first topology using `atoms:`, `bonds:`, formulas, components, and ports.
- Graph-based ring detection for skeletal rendering.
- Edit and Preview modes with draggable coordinates and camera controls.
- SVG and PNG export.
- Automatic 2D arrangement for structures without explicit positions.
- Valence warnings for common elements.
- Local multi-file workspace for reusable `.chemmd` components.

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

## License

Source-visible, all rights reserved. See [LICENSE](LICENSE).

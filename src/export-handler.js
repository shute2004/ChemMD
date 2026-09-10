/** Export functionality for ChemMD. */
const VIEWBOX = { width: 900, height: 620 };

export function buildExportSvg(canvas) {
  const clone = canvas.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(VIEWBOX.width));
  clone.setAttribute("height", String(VIEWBOX.height));
  clone.querySelector("#grid")?.remove();
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = `
    svg { background: #fff; }
    .bond line { stroke: #1f2521; stroke-linecap: round; stroke-width: 2.4; }
    .bond-dotted line { stroke-dasharray: 1.4 7; }
    .atom-bg { fill: #fff; stroke: none; }
    .atom-label { fill: #1f2521; font: 650 19px Arial, sans-serif; text-anchor: middle; }
    .atom-o { fill: #bd2f27; } .atom-n { fill: #275fb3; } .atom-s { fill: #8b6e0c; }
    .atom-cl, .atom-f, .atom-br, .atom-i { fill: #08764f; } .atom-id { display: none; }
  `;
  clone.insertBefore(style, clone.firstChild);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}\n`;
}

export function downloadCode(source) { downloadText("structure.chemmd", source, "text/plain;charset=utf-8"); }
export function downloadSvg(canvas) { downloadText("structure.svg", buildExportSvg(canvas), "image/svg+xml;charset=utf-8"); }
export async function downloadPng(canvas) {
  const blob = new Blob([buildExportSvg(canvas)], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.decoding = "async";
  await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = url; });
  const output = document.createElement("canvas");
  output.width = VIEWBOX.width * 2; output.height = VIEWBOX.height * 2;
  const context = output.getContext("2d");
  context.fillStyle = "#ffffff"; context.fillRect(0, 0, output.width, output.height); context.drawImage(image, 0, 0, output.width, output.height);
  URL.revokeObjectURL(url);
  output.toBlob((pngBlob) => { if (pngBlob) downloadBlob("structure.png", pngBlob); }, "image/png");
}
function downloadText(filename, text, type) { downloadBlob(filename, new Blob([text], { type })); }
function downloadBlob(filename, blob) { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url); }

import mermaid from 'mermaid';
import { JSDOM } from 'jsdom';

const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
global.window = dom.window;
global.document = dom.window.document;

mermaid.initialize({ startOnLoad: false, theme: "dark", flowchart: { htmlLabels: false } });

const chart = `
graph TD
    A["Bilgi Güvenliğinin 3 Temel Özelliği (CIA)"] --> B["Gizlilik (Confidentiality)"]
    A --> C["Bütünlük (Integrity)"]
    A --> D["Erişilebilirlik (Availability)"]
`;

try {
  const { svg } = await mermaid.render('mermaid-123', chart);
  console.log("SVG Length:", svg.length);
  if (svg.length < 500) console.log(svg);
} catch (e) {
  console.error("ERROR:", e);
}

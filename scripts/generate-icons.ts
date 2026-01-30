import { Resvg } from "@resvg/resvg-js";

const ICONS_DIR = new URL("../icons/", import.meta.url);
const SIZES = [16, 32, 48, 128] as const;
const VARIANTS = ["icon", "icon-light", "icon-dark"] as const;

for (const variant of VARIANTS) {
  const svgPath = new URL(`${variant}.svg`, ICONS_DIR);
  const svg = await Bun.file(svgPath).text();

  for (const size of SIZES) {
    const resvg = new Resvg(svg, {
      fitTo: { mode: "width", value: size },
    });
    const png = resvg.render().asPng();
    const outPath = new URL(`${variant}-${size}.png`, ICONS_DIR);
    await Bun.write(outPath, png);
    console.log(`Generated: ${variant}-${size}.png`);
  }
}

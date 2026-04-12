import { Resvg } from '@resvg/resvg-js';
import { writeFileSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(__dirname, '../src/app/icon.svg');
const svg = readFileSync(svgPath, 'utf-8');

for (const size of [192, 512]) {
  const scaled = svg
    .replace('width="32"', `width="${size}"`)
    .replace('height="32"', `height="${size}"`);

  const resvg = new Resvg(scaled, {
    fitTo: { mode: 'width', value: size },
  });
  const png = resvg.render().asPng();
  const outPath = resolve(__dirname, `../public/icon-${size}.png`);
  writeFileSync(outPath, png);
  console.log(`Generated ${outPath} (${png.length} bytes)`);
}

// Also generate apple-touch-icon (180x180)
const appleScaled = svg
  .replace('width="32"', 'width="180"')
  .replace('height="32"', 'height="180"');
const appleResvg = new Resvg(appleScaled, {
  fitTo: { mode: 'width', value: 180 },
});
const applePng = appleResvg.render().asPng();
writeFileSync(resolve(__dirname, '../src/app/apple-icon.png'), applePng);
console.log(`Generated apple-icon.png (${applePng.length} bytes)`);

import sharp from "sharp";
import { mkdir, readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const source = await readFile(new URL("../invitation.svg", import.meta.url));
const output = new URL("../assets/", import.meta.url);
await mkdir(output, { recursive: true });

await sharp(source, { density: 144 })
  .resize(1056, 1632)
  .webp({ quality: 85 })
  .toFile(fileURLToPath(new URL("invitation.webp", output)));

await sharp(source, { density: 144 })
  .resize(1200, 1855)
  .extract({ left: 0, top: 0, width: 1200, height: 630 })
  .jpeg({ quality: 85, mozjpeg: true })
  .toFile(fileURLToPath(new URL("preview.jpg", output)));

const { size } = await stat(new URL("invitation.webp", output));
if (size > 350_000) {
  throw new Error(`Mobile artwork exceeds the 350 KB budget: ${size} bytes.`);
}
console.log(`Built mobile artwork (${Math.round(size / 1024)} KB) and link preview.`);

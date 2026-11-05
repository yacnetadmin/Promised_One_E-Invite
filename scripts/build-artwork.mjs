import sharp from "sharp";
import { mkdir, readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const output = new URL("../assets/", import.meta.url);
await mkdir(output, { recursive: true });

const hero = await readFile(new URL("common-panel-source.png", output));
await sharp(hero)
  .webp({ quality: 90 })
  .toFile(fileURLToPath(new URL("hero.webp", output)));

await sharp(hero)
  .resize(1200, 630, { fit: "contain", background: "#252b44" })
  .jpeg({ quality: 85, mozjpeg: true })
  .toFile(fileURLToPath(new URL("preview.jpg", output)));

const heroSize = (await stat(new URL("hero.webp", output))).size;
if (heroSize > 300_000) {
  throw new Error(`Common panel artwork exceeds the 300 KB budget: ${heroSize} bytes.`);
}
console.log(`Built common panel (${Math.round(heroSize / 1024)} KB) and link preview.`);

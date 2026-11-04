import sharp from "sharp";
import { mkdir, readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const output = new URL("../assets/", import.meta.url);
await mkdir(output, { recursive: true });

const subhero = await readFile(new URL("subhero-source.png", output));
await sharp(subhero)
  .webp({ quality: 90 })
  .toFile(fileURLToPath(new URL("subhero.webp", output)));

const hero = await readFile(new URL("hero-source.png", output));
await sharp(hero)
  .webp({ quality: 90 })
  .toFile(fileURLToPath(new URL("hero.webp", output)));

await sharp(hero)
  .resize(1200, 630, { fit: "contain", background: "#252b44" })
  .jpeg({ quality: 85, mozjpeg: true })
  .toFile(fileURLToPath(new URL("preview.jpg", output)));

const { size } = await stat(new URL("subhero.webp", output));
if (size > 150_000) {
  throw new Error(`Story artwork exceeds the 150 KB budget: ${size} bytes.`);
}
const heroSize = (await stat(new URL("hero.webp", output))).size;
if (heroSize > 150_000) {
  throw new Error(`Hero artwork exceeds the 150 KB budget: ${heroSize} bytes.`);
}
console.log(`Built story artwork (${Math.round(size / 1024)} KB), hero (${Math.round(heroSize / 1024)} KB), and link preview.`);

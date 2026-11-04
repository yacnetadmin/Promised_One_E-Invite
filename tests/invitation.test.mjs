import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const html = await readFile(new URL("index.html", root), "utf8");
const expected = [
  {
    id: "york-afternoon",
    start: "20261205T190000Z",
    end: "20261205T210000Z",
    address: "501 Rathton Road, York, PA 17402"
  },
  {
    id: "york-evening",
    start: "20261206T000000Z",
    end: "20261206T020000Z",
    address: "501 Rathton Road, York, PA 17402"
  },
  {
    id: "spring-grove",
    start: "20261212T200000Z",
    end: "20261212T220000Z",
    address: "1472 Roths Church Road, Spring Grove, PA 17362"
  }
];

function utcStamp(value) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(".000", "");
}

for (const event of expected) {
  test(`${event.id}: visible time, calendar chooser data, and ICS agree`, async () => {
    const article = html.match(new RegExp(`<article[^>]+id="${event.id}"[^>]*>([\\s\\S]*?)</article>`));
    assert.ok(article, "Performance must be visible without JavaScript");
    assert.ok(article[0].includes(`data-start="${event.start}"`));
    assert.ok(article[0].includes(`data-end="${event.end}"`));
    assert.ok(article[0].includes(`data-calendar="${event.id}.ics"`));
    assert.ok(article[0].includes(event.address));
    const datetime = article[1].match(/datetime="([^"]+)"/)[1];
    assert.equal(utcStamp(datetime), event.start);
    assert.ok(article[0].includes(`data-event="${event.id}"`));

    const raw = await readFile(new URL(`${event.id}.ics`, root), "utf8");
    const unfolded = raw.replace(/\r?\n[ \t]/g, "");
    assert.ok(unfolded.includes(`DTSTART:${event.start}`));
    assert.ok(unfolded.includes(`DTEND:${event.end}`));
    assert.ok(unfolded.includes(`LOCATION:${event.address.replaceAll(",", "\\,")}`));
    assert.ok(unfolded.includes("https://yafc.churchcenter.com/people/forms/1358593"));
    assert.equal((unfolded.match(/BEGIN:VEVENT/g) || []).length, 1);
    assert.ok(!/(?<!\r)\n/.test(raw), "ICS must use CRLF line endings");
    for (const line of raw.split("\r\n")) {
      assert.ok(Buffer.byteLength(line) <= 75, "ICS lines must be folded at 75 octets");
    }
  });
}

test("calendar identifiers are unique", async () => {
  const uids = await Promise.all(expected.map(async event => {
    const ics = await readFile(new URL(`${event.id}.ics`, root), "utf8");
    return ics.match(/^UID:(.+)$/m)[1].trim();
  }));
  assert.equal(new Set(uids).size, 3);
});

test("story artwork stays below 150 KB and replaces the combined invitation", async () => {
  assert.ok((await stat(new URL("assets/subhero.webp", root))).size <= 150_000);
  assert.ok(Buffer.byteLength(html) < 25_000);
  assert.ok(!html.includes("data:image/"));
  assert.ok(!html.includes("assets/invitation.webp"));
  assert.match(html, /<section class="hero"[\s\S]*?<\/section>\s*<section class="subhero"/);
  assert.ok(html.indexOf('class="subhero"') < html.indexOf('class="locations"'));
  assert.ok(html.indexOf('class="locations"') < html.indexOf('id="performances"'));
  assert.ok(!html.includes("subhero-actions"));
  const image = await readFile(new URL("assets/subhero.webp", root));
  assert.equal(image.toString("ascii", 8, 12), "WEBP");
});

test("published link, social preview, and local resources resolve", async () => {
  const canonical = html.match(/rel="canonical" href="([^"]+)"/)[1];
  assert.equal(canonical, "https://yacnetadmin.github.io/Promised_One_E-Invite/");
  assert.ok(html.includes(`property="og:url" content="${canonical}"`));
  assert.ok(html.includes(`property="og:image" content="${canonical}assets/preview.jpg"`));
  for (const path of ["invitation.js", "styles.css", "assets/preview.jpg"]) {
    assert.ok((await stat(new URL(path, root))).size > 0);
  }
  for (const id of ["performances-button", "share-bar-button"]) {
    assert.equal((html.match(new RegExp(`id="${id}"`, "g")) || []).length, 1);
  }
});

test("card actions skip performance and location questions", () => {
  assert.ok(!html.includes('id="calendar-choices"'));
  assert.ok(!html.includes('id="directions-dialog"'));
  assert.ok(html.includes('href="#performances" id="performances-button"'));
  assert.ok(html.includes('href="#share-title" id="share-bar-button"'));
  for (const event of expected) {
    const article = html.match(new RegExp(`<article[^>]+id="${event.id}"[^>]*>([\\s\\S]*?)</article>`))[0];
    const mapHref = article.match(/href="([^"]+)" class="device-directions"/)[1].replaceAll("&amp;", "&");
    assert.equal(new URL(mapHref).searchParams.get("destination"), event.address);
  }
});

test("shared childcare panel follows performances and precedes sharing", () => {
  const panel = html.match(/<section class="childcare-panel"[\s\S]*?<\/section>/)[0];
  assert.ok(html.indexOf('id="spring-grove"') < html.indexOf(panel));
  assert.ok(html.indexOf(panel) < html.indexOf('class="share-section"'));
  assert.ok(panel.includes('aria-labelledby="childcare-title"'));
  assert.ok(panel.includes("Bringing little ones?"));
  assert.ok(panel.includes("<strong>1st grade and younger</strong>"));
  assert.ok(panel.includes("Register for childcare"));
  assert.ok(panel.includes('href="https://yafc.churchcenter.com/people/forms/1358593"'));
  assert.ok(panel.includes('rel="noopener noreferrer"'));
  assert.equal((html.match(/id="childcare-register"/g) || []).length, 1);
});

test("hero uses optimized artwork with accessible floating text and a compact header", async () => {
  const hero = html.match(/<section class="hero"[\s\S]*?<\/section>/)[0];
  assert.ok(hero.includes('src="assets/hero.webp"'));
  assert.ok(hero.includes('width="552" height="432"'));
  assert.ok(hero.includes('fetchpriority="high"'));
  assert.ok(hero.includes('<h2 id="hero-title">A Narrative Christmas Experience</h2>'));
  assert.ok(html.includes('class="header-links" aria-label="Explore the invitation"'));
  assert.ok(html.includes('loading="lazy"'));
  assert.ok((await stat(new URL("assets/hero.webp", root))).size <= 150_000);
  const heroImage = await readFile(new URL("assets/hero.webp", root));
  assert.equal(heroImage.toString("ascii", 8, 12), "WEBP");
});

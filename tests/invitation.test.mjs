import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { runInNewContext } from "node:vm";

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

test("single common panel replaces the two previous artwork panels", () => {
  assert.ok(Buffer.byteLength(html) < 25_000);
  assert.ok(!html.includes("data:image/"));
  assert.ok(!html.includes("assets/invitation.webp"));
  assert.ok(!html.includes('class="subhero"'));
  assert.equal((html.match(/src="assets\/hero.webp"/g) || []).length, 1);
  assert.ok(html.indexOf('class="hero"') < html.indexOf('class="locations"'));
  assert.ok(html.indexOf('class="locations"') < html.indexOf('id="performances"'));
  assert.ok(!html.includes("subhero-actions"));
});

test("published link, social preview, and local resources resolve", async () => {
  const canonical = html.match(/rel="canonical" href="([^"]+)"/)[1];
  assert.equal(canonical, "https://yacnetadmin.github.io/Promised_One_E-Invite/");
  assert.ok(html.includes(`property="og:url" content="${canonical}"`));
  assert.ok(html.includes(`property="og:image" content="${canonical}assets/preview.jpg"`));
  for (const path of ["schedule.js", "invitation.js", "styles.css", "assets/preview.jpg"]) {
    assert.ok((await stat(new URL(path, root))).size > 0);
  }
  for (const id of ["performances-button", "share-bar-button"]) {
    assert.equal((html.match(new RegExp(`id="${id}"`, "g")) || []).length, 1);
  }
});

test("Plausible page-view tracking loads once asynchronously in the head", () => {
  const head = html.match(/<head>[\s\S]*?<\/head>/)[0];
  assert.equal((html.match(/src="https:\/\/plausible\.io\/js\/pa-4VSDVsuOmvQkDOwIGOItP\.js"/g) || []).length, 1);
  assert.ok(head.includes('<script async src="https://plausible.io/js/pa-4VSDVsuOmvQkDOwIGOItP.js"></script>'));
  const bootstrap = head.match(/<script>([\s\S]*?plausible\.init\(\)[\s\S]*?)<\/script>/)[1];
  const context = {};
  context.window = context;
  runInNewContext(bootstrap, context);
  assert.equal(typeof context.plausible, "function");
  assert.deepEqual(Object.keys(context.plausible.o), []);
  context.plausible("test-event");
  assert.equal(context.plausible.q[0][0], "test-event");
});

test("schedule helper loads before invitation behavior and provides an ended state", () => {
  assert.ok(html.indexOf('src="schedule.js" defer') < html.indexOf('src="invitation.js" defer'));
  assert.ok(html.includes('id="finished-message" hidden'));
  assert.ok(html.includes('class="locations" aria-live="polite"'));
  assert.ok(html.includes("Enable JavaScript to automatically hide performances that have ended."));
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

test("footer links to all four York Alliance family churches", () => {
  const footer = html.match(/<footer>[\s\S]*?<\/footer>/)[0];
  assert.ok(footer.includes('aria-label="York Alliance Family of Churches"'));
  for (const url of [
    "https://yorkalliance.org/",
    "https://springgrovealliance.org/",
    "https://stewartstownalliance.org/",
    "http://valleyviewcma.org/"
  ]) {
    assert.ok(footer.includes(`href="${url}" target="_blank" rel="noopener noreferrer"`));
  }
});

test("calendar options explain web and file behavior without forcing downloads or subscriptions", () => {
  const google = html.match(/<a id="google-calendar"[^>]*>[^<]+<\/a>/)[0];
  const ics = html.match(/<a id="ics-calendar"[^>]*>[^<]+<\/a>/)[0];
  assert.ok(google.includes("Google Calendar (web)"));
  assert.ok(google.includes('aria-describedby="google-calendar-help"'));
  assert.ok(ics.includes('aria-describedby="ics-calendar-help"'));
  assert.ok(!ics.includes("download"));
  assert.ok(!ics.includes("target="));
  assert.ok(!html.includes("webcal:"));
});

test("hero uses optimized artwork with accessible floating text and a compact header", async () => {
  const hero = html.match(/<section class="hero"[\s\S]*?<\/section>/)[0];
  assert.ok(hero.includes('src="assets/hero.webp"'));
  assert.ok(hero.includes('width="768" height="1187"'));
  assert.ok(hero.includes('fetchpriority="high"'));
  assert.ok(hero.includes('<h2 id="hero-title"><span>A Narrative</span> <span>Christmas</span> <span>Experience</span></h2>'));
  assert.ok(html.includes('class="header-links" aria-label="Explore the invitation"'));
  assert.ok((await stat(new URL("assets/hero.webp", root))).size <= 300_000);
  const heroImage = await readFile(new URL("assets/hero.webp", root));
  assert.equal(heroImage.toString("ascii", 8, 12), "WEBP");
});

test("parallax visibly tracks scrolling, stays bounded, and respects motion preferences", async () => {
  const script = await readFile(new URL("invitation.js", root), "utf8");
  const parallax = script.slice(script.indexOf('const hero ='), script.indexOf('function choosePerformance'));
  let top = 120;
  let offset;
  let frame;
  let preferenceChanged;
  const listeners = new Map();
  const motion = {
    matches: false,
    addEventListener(type, callback) { preferenceChanged = callback; }
  };
  runInNewContext(parallax, {
    document: {
      querySelector: () => ({ getBoundingClientRect: () => ({ top }) }),
      getElementById: () => ({
        style: {
          setProperty(name, value) { offset = value; },
          removeProperty() { offset = undefined; }
        }
      })
    },
    window: {
      matchMedia: () => motion,
      addEventListener(type, callback) { listeners.set(type, callback); },
      removeEventListener(type) { listeners.delete(type); }
    },
    requestAnimationFrame(callback) { frame = callback; return 1; },
    cancelAnimationFrame() { frame = undefined; }
  });
  frame();
  assert.equal(offset, "0px");
  top = -100;
  listeners.get("scroll")();
  frame();
  assert.equal(offset, "12px");
  top = -1000;
  listeners.get("resize")();
  frame();
  assert.equal(offset, "28px");
  motion.matches = true;
  preferenceChanged();
  assert.equal(offset, undefined);
  assert.equal(listeners.size, 0);
  assert.equal(frame, undefined);
  motion.matches = false;
  preferenceChanged();
  frame();
  assert.equal(offset, "28px");
  assert.ok(listeners.has("scroll"));
});

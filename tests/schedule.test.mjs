import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const context = vm.createContext({});
vm.runInContext(await readFile(new URL("../schedule.js", import.meta.url), "utf8"), context);
const events = [
  { id: "york-afternoon", end: "20261205T210000Z" },
  { id: "york-evening", end: "20261206T020000Z" },
  { id: "spring-grove", end: "20261212T220000Z" }
];

for (const [time, ids] of [
  ["2026-11-04T00:00:00Z", ["york-afternoon", "york-evening", "spring-grove"]],
  ["2026-12-05T19:00:00Z", ["york-afternoon", "york-evening", "spring-grove"]],
  ["2026-12-05T20:59:59.999Z", ["york-afternoon", "york-evening", "spring-grove"]],
  ["2026-12-05T21:00:00Z", ["york-evening", "spring-grove"]],
  ["2026-12-05T21:00:00-05:00", ["spring-grove"]],
  ["2026-12-12T21:59:59.999Z", ["spring-grove"]],
  ["2026-12-12T22:00:00Z", []],
  ["2027-01-01T00:00:00Z", []]
]) {
  test(`remaining performances at ${time}`, () => {
    const actual = context.getRemainingPerformances(events, Date.parse(time));
    assert.deepEqual(Array.from(actual, event => event.id), ids);
  });
}

test("invalid dates surface explicit errors", () => {
  for (const end of ["bad", "20260230T210000Z"]) {
    assert.throws(() => context.getRemainingPerformances([{ end }], Date.now()), /Invalid performance/);
  }
  assert.throws(() => context.getRemainingPerformances(events, NaN), /Invalid schedule time/);
});

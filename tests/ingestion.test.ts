import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { addNationalCategories, buildSnapshot, decodePsaJson, validateSnapshot } from "../src/lib/data/ingestion.ts";
import { makeSocialDraft, socialFacts } from "../src/lib/data/social.ts";
import type { JsonStatDataset } from "../src/lib/data/types.ts";

const fixturePath = new URL("./fixtures/psa-openstat/regional.json", import.meta.url);

async function fixture(): Promise<JsonStatDataset> {
  return JSON.parse(await readFile(fixturePath, "utf8"));
}

test("buildSnapshot flattens configured national and regional observations", async () => {
  const snapshot = buildSnapshot(await fixture(), "2026-09-22T00:00:00.000Z");

  assert.equal(snapshot.latestPeriod, "2025-08");
  assert.equal(snapshot.observations.length, 57);
  assert.equal(snapshot.observations.at(-1)?.geography, "negros-island-region");
  assert.equal(snapshot.observations.at(-1)?.value, "5.0");
});

test("decodePsaJson converts PSA row JSON without losing decimal precision", () => {
  const decoded = decodePsaJson({
    columns: [
      { code: "Geolocation", text: "Geolocation", type: "d" },
      { code: "Commodity Description", text: "Commodity Description", type: "d" },
      { code: "Year", text: "Year", type: "t" },
      { code: "Period", text: "Period", type: "d" },
      { code: "measure", text: "Inflation", type: "c" },
    ],
    data: [
      { key: ["0", "0", "7", "6"], values: ["6.2"] },
      { key: ["0", "0", "7", "7"], values: ["6.1"] },
    ],
  }, {
    title: "Inflation",
    variables: [
      { code: "Geolocation", text: "Geolocation", values: ["0"], valueTexts: ["PHILIPPINES"] },
      { code: "Commodity Description", text: "Commodity Description", values: ["0"], valueTexts: ["0 - ALL ITEMS"] },
      { code: "Year", text: "Year", values: ["7"], valueTexts: ["2026"] },
      { code: "Period", text: "Period", values: ["6", "7"], valueTexts: ["Jul", "Aug"] },
    ],
  });

  assert.deepEqual(decoded.size, [1, 1, 1, 2]);
  assert.deepEqual(decoded.value, [6.2, 6.1]);
});

test("validation blocks a snapshot with a missing configured region", async () => {
  const data = await fixture();
  data.dimension.Geolocation.category.index["115"] = 99;
  const snapshot = buildSnapshot(data, "2026-09-22T00:00:00.000Z");
  const report = validateSnapshot(snapshot);

  assert.ok(report.errors.some((error) => error.includes("Negros Island Region")));
});

test("buildSnapshot rejects an unknown source schema", async () => {
  const data = await fixture();
  data.id[0] = "Place";

  assert.throws(() => buildSnapshot(data, "2026-09-22T00:00:00.000Z"), /schema/i);
});

test("buildSnapshot rejects a configured geography label change", async () => {
  const data = await fixture();
  data.dimension.Geolocation.category.label["11"] = "..Region I (Unexpected Label)";

  assert.throws(() => buildSnapshot(data, "2026-09-22T00:00:00.000Z"), /label/i);
});

test("buildSnapshot uses the latest period complete across all regions", async () => {
  const data = await fixture();
  data.size = [19, 1, 1, 4];
  data.dimension.Period.category.index.Sep = 3;
  data.dimension.Period.category.label.Sep = "Sep";
  const oldValues = data.value as Array<number | null>;
  data.value = Array.from({ length: 19 }, (_, geography) => [
    ...oldValues.slice(geography * 3, geography * 3 + 3),
    geography === 0 ? 4.2 : null,
  ]).flat();

  const snapshot = buildSnapshot(data, "2026-09-22T00:00:00.000Z");

  assert.equal(snapshot.latestPeriod, "2025-08");
});

test("addNationalCategories keeps only top-level commodity groups", async () => {
  const data = await fixture();
  data.size = [1, 3, 1, 3];
  data.dimension.Geolocation.category.index = { "0": 0 };
  data.dimension.Geolocation.category.label = { "0": "PHILIPPINES" };
  data.dimension["Commodity Description"].category.index = { "0": 0, "1": 1, "2": 2 };
  data.dimension["Commodity Description"].category.label = {
    "0": "0 - ALL ITEMS",
    "1": "01 - FOOD AND NON-ALCOHOLIC BEVERAGES",
    "2": "01.1 - FOOD",
  };
  data.value = [3.7, 3.9, 4.1, 9.0, 9.2, 9.4, 5.5, 5.6, 5.7];
  const snapshot = buildSnapshot(await fixture(), "2026-09-22T00:00:00.000Z");

  addNationalCategories(snapshot, data);

  assert.equal(snapshot.observations.filter((item) => item.category === "01").length, 3);
  assert.equal(snapshot.observations.some((item) => item.category === "01.1"), false);
  assert.equal(validateSnapshot(snapshot).warnings.some((warning) => warning.startsWith("Philippines")), false);
});

test("social draft contains only facts supplied by the snapshot", async () => {
  const snapshot = buildSnapshot(await fixture(), "2026-09-22T00:00:00.000Z");
  const facts = socialFacts(snapshot);
  const draft = makeSocialDraft(facts);

  assert.match(draft, /4\.1%/);
  assert.match(draft, /3\.9%/);
  assert.doesNotMatch(draft, /5\.0%/);
});

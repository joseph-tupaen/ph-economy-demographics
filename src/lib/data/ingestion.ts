import { createHash } from "node:crypto";
import { GEOGRAPHIES, PSA_API_URL, PSA_TABLE_ID } from "./config.ts";
import type { JsonStatDataset, Observation, PsaJsonResponse, PsaMetadata, Snapshot, ValidationReport } from "./types.ts";

const EXPECTED_DIMENSIONS = ["Geolocation", "Commodity Description", "Year", "Period"];
const MONTHS: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

function valueAt(data: JsonStatDataset, coordinates: number[]): number | null {
  const flatIndex = coordinates.reduce((index, coordinate, dimension) => {
    const trailingSize = data.size.slice(dimension + 1).reduce((total, size) => total * size, 1);
    return index + coordinate * trailingSize;
  }, 0);
  const value = Array.isArray(data.value) ? data.value[flatIndex] : data.value[String(flatIndex)];
  return typeof value === "number" ? value : null;
}

function decimal(value: number | null): string | null {
  return value === null ? null : value.toFixed(1);
}

function periodsFor(data: JsonStatDataset) {
  const yearDimension = data.dimension.Year.category;
  const periodDimension = data.dimension.Period.category;
  return Object.entries(yearDimension.index).flatMap(([yearCode, yearPosition]) =>
    Object.entries(periodDimension.index).flatMap(([periodCode, periodPosition]) => {
      const month = MONTHS[periodDimension.label[periodCode]];
      return month ? [{ key: `${yearDimension.label[yearCode]}-${month}`, yearPosition, periodPosition }] : [];
    }),
  ).sort((a, b) => a.key.localeCompare(b.key));
}

export function decodePsaJson(response: PsaJsonResponse, metadata: PsaMetadata): JsonStatDataset {
  const dimensions = response.columns.slice(0, -1).map((column) => column.code);
  if (JSON.stringify(dimensions) !== JSON.stringify(EXPECTED_DIMENSIONS)) {
    throw new Error("PSA row response schema does not match the configured dimensions");
  }
  const codesByDimension = dimensions.map((_, dimension) => [
    ...new Set(response.data.map((row) => row.key[dimension])),
  ]);
  const size = codesByDimension.map((codes) => codes.length);
  const values = Array<number | null>(size.reduce((total, count) => total * count, 1)).fill(null);
  const dimension: JsonStatDataset["dimension"] = {};

  dimensions.forEach((code, dimensionIndex) => {
    const variable = metadata.variables.find((item) => item.code === code);
    if (!variable) throw new Error(`PSA metadata is missing dimension ${code}`);
    const labels = new Map(variable.values.map((value, index) => [value, variable.valueTexts[index]]));
    const codes = codesByDimension[dimensionIndex];
    dimension[code] = {
      label: variable.text,
      category: {
        index: Object.fromEntries(codes.map((value, index) => [value, index])),
        label: Object.fromEntries(codes.map((value) => [value, labels.get(value) ?? value])),
      },
    };
  });

  for (const row of response.data) {
    const coordinates = row.key.map((key, index) => codesByDimension[index].indexOf(key));
    const index = coordinates.reduce((flat, coordinate, current) =>
      flat + coordinate * size.slice(current + 1).reduce((total, count) => total * count, 1), 0);
    const raw = row.values[0]?.trim() ?? "";
    if (["", "..", "...", "-"].includes(raw)) continue;
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new Error(`Unknown PSA value marker: ${raw}`);
    values[index] = value;
  }

  return {
    class: "dataset",
    label: metadata.title,
    source: "Philippine Statistics Authority (PSA)",
    id: dimensions,
    size,
    dimension,
    value: values,
  };
}

export function buildSnapshot(
  data: JsonStatDataset,
  retrievedAt: string,
  previous?: Snapshot,
): Snapshot {
  if (JSON.stringify(data.id) !== JSON.stringify(EXPECTED_DIMENSIONS) || data.size.length !== 4) {
    throw new Error("PSA source schema does not match the configured dimensions");
  }

  for (const [sourceCode, , expectedName] of GEOGRAPHIES) {
    const actualName = data.dimension.Geolocation.category.label[sourceCode];
    const normalized = actualName?.replace(/^\.+/, "").trim().toLowerCase();
    if (normalized !== expectedName.toLowerCase()) {
      throw new Error(`PSA geography label changed for code ${sourceCode}: ${actualName ?? "missing"}`);
    }
  }
  if (data.dimension["Commodity Description"].category.label["0"] !== "0 - ALL ITEMS") {
    throw new Error("PSA all-items category label changed");
  }

  const categoryPosition = data.dimension["Commodity Description"].category.index["0"];
  const periods = periodsFor(data);

  if (periods.length === 0 || categoryPosition === undefined) {
    throw new Error("PSA source schema contains no supported periods or all-items category");
  }

  const observations: Observation[] = [];
  for (const [sourceCode, slug, name] of GEOGRAPHIES) {
    const geographyPosition = data.dimension.Geolocation.category.index[sourceCode];
    for (const period of periods) {
      observations.push({
        geography: slug,
        geographyName: name,
        category: "all-items",
        categoryName: "All items",
        period: period.key,
        value: geographyPosition === undefined
          ? null
          : decimal(valueAt(data, [geographyPosition, categoryPosition, period.yearPosition, period.periodPosition])),
      });
    }
  }

  const contentHash = createHash("sha256").update(JSON.stringify(data)).digest("hex");
  const latestCompletePeriod = periods
    .filter((period) => GEOGRAPHIES.every(([, slug]) =>
      observations.some((item) => item.geography === slug && item.period === period.key && item.value !== null),
    ))
    .at(-1)?.key;
  const latestNationalPeriod = observations
    .filter((item) => item.geography === "philippines" && item.value !== null)
    .at(-1)?.period;
  const latestPeriod = latestCompletePeriod ?? latestNationalPeriod;
  if (!latestPeriod) throw new Error("PSA response contains no published national observations");
  const revisions = previous
    ? observations.flatMap((item) => {
        const old = previous.observations.find((candidate) =>
          candidate.geography === item.geography && candidate.category === item.category && candidate.period === item.period,
        );
        return old && old.value !== item.value ? [`${item.geography}/${item.period}: ${old.value} → ${item.value}`] : [];
      })
    : [];

  return {
    source: {
      agency: "Philippine Statistics Authority",
      dataset: data.label,
      tableId: PSA_TABLE_ID,
      url: PSA_API_URL,
      retrievedAt,
      contentHash,
    },
    latestPeriod,
    observations,
    revisions,
  };
}

export function addNationalCategories(snapshot: Snapshot, data: JsonStatDataset): void {
  if (JSON.stringify(data.id) !== JSON.stringify(EXPECTED_DIMENSIONS)) {
    throw new Error("PSA category source schema does not match the configured dimensions");
  }
  const geographyPosition = data.dimension.Geolocation.category.index["0"];
  const periods = periodsFor(data);
  if (geographyPosition === undefined) throw new Error("National category response is missing Philippines");

  for (const [sourceCode, categoryPosition] of Object.entries(data.dimension["Commodity Description"].category.index)) {
    const sourceName = data.dimension["Commodity Description"].category.label[sourceCode];
    const match = sourceName.match(/^(\d{2}) - (.+)$/);
    if (!match) continue;
    for (const period of periods) {
      snapshot.observations.push({
        geography: "philippines",
        geographyName: "Philippines",
        category: match[1],
        categoryName: match[2].toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase()),
        period: period.key,
        value: decimal(valueAt(data, [geographyPosition, categoryPosition, period.yearPosition, period.periodPosition])),
      });
    }
  }
}

export function validateSnapshot(snapshot: Snapshot): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const latest = snapshot.observations.filter((item) => item.period === snapshot.latestPeriod);

  for (const [, slug, name] of GEOGRAPHIES) {
    const observation = latest.find((item) => item.geography === slug && item.category === "all-items");
    if (!observation || observation.value === null) errors.push(`Missing current value for ${name}`);
  }

  const keys = new Set<string>();
  for (const item of snapshot.observations) {
    const key = `${item.geography}/${item.category}/${item.period}`;
    if (keys.has(key)) errors.push(`Duplicate observation: ${key}`);
    keys.add(key);
  }

  for (const [, slug, name] of GEOGRAPHIES) {
    const history = snapshot.observations
      .filter((item) => item.geography === slug && item.category === "all-items" && item.value !== null)
      .sort((a, b) => a.period.localeCompare(b.period));
    const current = history.at(-1);
    const prior = history.at(-2);
    if (current && prior && Math.abs(Number(current.value) - Number(prior.value)) >= 3) {
      warnings.push(`${name} changed by at least 3.0 percentage points`);
    }
  }

  return { errors, warnings };
}

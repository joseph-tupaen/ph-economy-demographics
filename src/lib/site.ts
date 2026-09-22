import snapshotData from "../../data/snapshots/inflation.json";
import type { Observation, Snapshot } from "./data/types.ts";

export const snapshot = snapshotData as Snapshot;
export const regions = [...new Map(
  snapshot.observations
    .filter((item) => item.geography !== "philippines" && item.category === "all-items")
    .map((item) => [item.geography, { slug: item.geography, name: item.geographyName }]),
).values()];

export function history(geography: string, category = "all-items"): Observation[] {
  return snapshot.observations
    .filter((item) => item.geography === geography && item.category === category && item.value !== null)
    .sort((a, b) => a.period.localeCompare(b.period));
}

export function latest(geography: string, category = "all-items"): Observation {
  const item = history(geography, category).at(-1);
  if (!item) throw new Error(`No published observation for ${geography}/${category}`);
  return item;
}

export function formatPeriod(period: string): string {
  return new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${period}-01T00:00:00Z`));
}

export function change(current: Observation, previous?: Observation): string {
  if (!previous || current.value === null || previous.value === null) return "No prior comparison";
  const difference = Math.round((Number(current.value) - Number(previous.value)) * 10) / 10;
  if (difference === 0) return "Unchanged from the previous month";
  return `${Math.abs(difference).toFixed(1)} percentage points ${difference > 0 ? "higher" : "lower"} than the previous month`;
}

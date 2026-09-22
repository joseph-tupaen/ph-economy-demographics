import type { Snapshot, SocialFacts } from "./types.ts";

function shiftYear(period: string, years: number): string {
  const [year, month] = period.split("-");
  return `${Number(year) + years}-${month}`;
}

export function socialFacts(snapshot: Snapshot): SocialFacts {
  const history = snapshot.observations
    .filter((item) => item.geography === "philippines" && item.category === "all-items" && item.value !== null)
    .sort((a, b) => a.period.localeCompare(b.period));
  const current = history.at(-1);
  const previous = history.at(-2);
  if (!current || !previous || current.value === null || previous.value === null) {
    throw new Error("At least two national observations are required for a social draft");
  }
  const yearAgo = history.find((item) => item.period === shiftYear(current.period, -1));

  return {
    indicator: "Headline inflation",
    geography: "Philippines",
    referencePeriod: current.period,
    value: current.value,
    previousValue: previous.value,
    yearAgoValue: yearAgo?.value ?? null,
    unit: "percent",
    sourceName: "Philippine Statistics Authority",
    sourceUrl: snapshot.source.url,
    retrievedAt: snapshot.source.retrievedAt,
  };
}

export function makeSocialDraft(facts: SocialFacts): string {
  const date = new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${facts.referencePeriod}-01T00:00:00Z`));
  const yearAgo = facts.yearAgoValue ? ` and ${facts.yearAgoValue}% a year earlier` : "";
  return `---\nstatus: pending_review\nreference_period: ${facts.referencePeriod}\n---\n\n${date} inflation update\n\nThe official headline inflation rate was ${facts.value}% in ${date}, compared with ${facts.previousValue}% in the previous month${yearAgo}.\n\nSource: ${facts.sourceName}. ${facts.sourceUrl}`;
}

export function assertSocialDraftClaims(facts: SocialFacts, draft: string): void {
  const actual = [...draft.matchAll(/-?\d+(?:\.\d+)?%/g)].map(([claim]) => claim);
  const expected = [facts.value, facts.previousValue, facts.yearAgoValue]
    .filter((value): value is string => value !== null)
    .map((value) => `${value}%`);
  if (actual.join("|") !== expected.join("|")) throw new Error("Social draft numeric claims do not match approved facts");
}

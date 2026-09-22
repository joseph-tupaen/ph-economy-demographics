export interface Observation {
  geography: string;
  geographyName: string;
  category: string;
  categoryName: string;
  period: string;
  value: string | null;
}

export interface Snapshot {
  source: {
    agency: string;
    dataset: string;
    tableId: string;
    url: string;
    retrievedAt: string;
    contentHash: string;
  };
  latestPeriod: string;
  observations: Observation[];
  revisions: string[];
}

export interface Release {
  source: Snapshot["source"];
  period: string;
  observations: Observation[];
  revisions: string[];
}

export interface ValidationReport {
  errors: string[];
  warnings: string[];
}

export interface JsonStatDataset {
  class: "dataset";
  label: string;
  source?: string;
  id: string[];
  size: number[];
  dimension: Record<string, {
    label: string;
    category: {
      index: Record<string, number>;
      label: Record<string, string>;
    };
  }>;
  value: Array<number | null> | Record<string, number>;
}

export interface PsaMetadata {
  title: string;
  variables: Array<{
    code: string;
    text: string;
    values: string[];
    valueTexts: string[];
  }>;
}

export interface PsaJsonResponse {
  columns: Array<{ code: string; text: string; type: string }>;
  data: Array<{ key: string[]; values: string[] }>;
}

export interface SocialFacts {
  indicator: "Headline inflation";
  geography: "Philippines";
  referencePeriod: string;
  value: string;
  previousValue: string;
  yearAgoValue: string | null;
  unit: "percent";
  sourceName: "Philippine Statistics Authority";
  sourceUrl: string;
  retrievedAt: string;
}

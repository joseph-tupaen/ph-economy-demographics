import { createHash } from "node:crypto";
import { gzip } from "node:zlib";
import { promisify } from "node:util";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { addNationalCategories, buildSnapshot, decodePsaJson, validateSnapshot } from "../src/lib/data/ingestion.ts";
import { GEOGRAPHIES, PSA_API_URL } from "../src/lib/data/config.ts";
import { assertSocialDraftClaims, makeSocialDraft, socialFacts } from "../src/lib/data/social.ts";
import type { JsonStatDataset, PsaJsonResponse, PsaMetadata, Release, Snapshot } from "../src/lib/data/types.ts";

const gzipAsync = promisify(gzip);
const root = resolve(import.meta.dirname, "..");
const fixtureFlag = process.argv.indexOf("--fixture");
const fixturePath = fixtureFlag >= 0 ? process.argv[fixtureFlag + 1] : undefined;

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000), redirect: "error" });
      if (!response.ok) throw new Error(`PSA returned HTTP ${response.status}`);
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("json")) throw new Error(`Unexpected PSA content type: ${contentType}`);
      const body = await response.text();
      if (body.length === 0 || body.length > 10_000_000) throw new Error("PSA response is empty or exceeds 10 MB");
      return JSON.parse(body.replace(/^\uFEFF/, ""));
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((done) => setTimeout(done, attempt * 500));
    }
  }
  throw lastError;
}

function query(geographies: string[], commodities: string[] | "all") {
  return {
    query: [
      { code: "Geolocation", selection: { filter: "item", values: geographies } },
      commodities === "all"
        ? { code: "Commodity Description", selection: { filter: "all", values: ["*"] } }
        : { code: "Commodity Description", selection: { filter: "item", values: commodities } },
      { code: "Year", selection: { filter: "all", values: ["*"] } },
      { code: "Period", selection: { filter: "all", values: ["*"] } },
    ],
    response: { format: "json" },
  };
}

async function liveData(): Promise<{ regional: JsonStatDataset; categories?: JsonStatDataset }> {
  const headers = { "content-type": "application/json", "user-agent": "PH-Economic-Updates/0.1 (+https://github.com/joseph-tupaen/ph-economy-demographics)" };
  const metadata = await fetchJson(PSA_API_URL) as PsaMetadata;
  const regionalRows = await fetchJson(PSA_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(query(GEOGRAPHIES.map(([code]) => code), ["0"])),
  }) as PsaJsonResponse;
  const categoryRows = await fetchJson(PSA_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(query(["0"], "all")),
  }) as PsaJsonResponse;
  return {
    regional: decodePsaJson(regionalRows, metadata),
    categories: decodePsaJson(categoryRows, metadata),
  };
}

async function loadPrevious(): Promise<Snapshot | undefined> {
  try {
    return JSON.parse(await readFile(resolve(root, "data/snapshots/inflation.json"), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

async function atomicWrite(path: string, contents: string | Uint8Array): Promise<void> {
  const temporary = `${path}.tmp`;
  await writeFile(temporary, contents);
  await rename(temporary, path);
}

function releaseFor(snapshot: Snapshot): Release {
  return {
    source: snapshot.source,
    period: snapshot.latestPeriod,
    observations: snapshot.observations.filter((item) => item.period === snapshot.latestPeriod),
    revisions: snapshot.revisions.filter((item) => item.includes(`/${snapshot.latestPeriod}:`)),
  };
}

async function main(): Promise<void> {
  const retrievedAt = new Date().toISOString();
  const source = fixturePath
    ? { regional: JSON.parse(await readFile(resolve(root, fixturePath), "utf8")) as JsonStatDataset }
    : await liveData();
  const previous = await loadPrevious();
  const snapshot = buildSnapshot(source.regional, retrievedAt, previous);
  if (source.categories) addNationalCategories(snapshot, source.categories);
  const raw = JSON.stringify(source);
  snapshot.source.contentHash = createHash("sha256").update(raw).digest("hex");
  const report = validateSnapshot(snapshot);
  if (report.errors.length > 0) throw new Error(`Validation blocked promotion:\n- ${report.errors.join("\n- ")}`);
  if (previous?.source.contentHash === snapshot.source.contentHash) {
    process.stdout.write("No source changes detected.\n");
    return;
  }

  const rawDirectory = resolve(root, "data/raw/psa");
  const snapshotDirectory = resolve(root, "data/snapshots");
  const releaseDirectory = resolve(root, "data/releases");
  const draftDirectory = resolve(root, "data/drafts");
  await Promise.all([rawDirectory, snapshotDirectory, releaseDirectory, draftDirectory].map((path) => mkdir(path, { recursive: true })));
  const stamp = retrievedAt.replace(/[:.]/g, "-");
  const facts = socialFacts(snapshot);
  const draft = makeSocialDraft(facts);
  assertSocialDraftClaims(facts, draft);
  await atomicWrite(resolve(rawDirectory, `${stamp}-${snapshot.source.contentHash.slice(0, 12)}.json.gz`), await gzipAsync(raw));
  await atomicWrite(resolve(releaseDirectory, `${snapshot.latestPeriod}.json`), `${JSON.stringify(releaseFor(snapshot), null, 2)}\n`);
  await atomicWrite(resolve(draftDirectory, `${snapshot.latestPeriod}.md`), `${draft}\n`);
  await atomicWrite(resolve(snapshotDirectory, "inflation.json"), `${JSON.stringify(snapshot, null, 2)}\n`);

  process.stdout.write(`Prepared ${snapshot.latestPeriod}: ${snapshot.observations.length} observations.\n`);
  if (report.warnings.length) process.stdout.write(`Review warnings:\n- ${report.warnings.join("\n- ")}\n`);
  if (fixturePath) process.stdout.write(`Fixture: ${basename(fixturePath)}\n`);
}

await main();

export const PSA_TABLE_ID = "0012M4ACP23.px";
export const PSA_API_URL = `https://openstat.psa.gov.ph/PXWeb/api/v1/en/DB/2M/PI/CPI/2018NEW/${PSA_TABLE_ID}`;

export const GEOGRAPHIES = [
  ["0", "philippines", "Philippines"],
  ["1", "ncr", "National Capital Region (NCR)"],
  ["3", "car", "Cordillera Administrative Region (CAR)"],
  ["11", "ilocos-region", "Region I (Ilocos Region)"],
  ["16", "cagayan-valley", "Region II (Cagayan Valley)"],
  ["22", "central-luzon", "Region III (Central Luzon)"],
  ["32", "calabarzon", "Region IV-A (CALABARZON)"],
  ["39", "mimaropa", "MIMAROPA Region"],
  ["46", "bicol-region", "Region V (Bicol Region)"],
  ["53", "western-visayas", "Region VI (Western Visayas)"],
  ["60", "central-visayas", "Region VII (Central Visayas)"],
  ["66", "eastern-visayas", "Region VIII (Eastern Visayas)"],
  ["74", "zamboanga-peninsula", "Region IX (Zamboanga Peninsula)"],
  ["80", "northern-mindanao", "Region X (Northern Mindanao)"],
  ["88", "davao-region", "Region XI (Davao Region)"],
  ["95", "soccsksargen", "Region XII (SOCCSKSARGEN)"],
  ["101", "barmm", "Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)"],
  ["108", "caraga", "Region XIII (Caraga)"],
  ["115", "negros-island-region", "Negros Island Region (NIR)"],
] as const;

export const REGION_SLUGS = GEOGRAPHIES.slice(1).map(([, slug]) => slug);

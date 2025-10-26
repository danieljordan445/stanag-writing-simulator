// /lib/misspellings.ts
// EDITUJ POUZE TENTO SOUBOR: seznam chyb -> správných tvarů.
// Klíče i hodnoty používej v malých písmenech. Názvy vlastních jmen sem nedávej.

const RAW_MISSPELLINGS: Record<string, string> = {
  // --- PŘÍKLADY (klidně smaž a nahraď svým seznamem) ---
  "recieve": "receive",
  "seperate": "separate",
  "definately": "definitely",
  "occurence": "occurrence",
  "adress": "address",
  "accomodation": "accommodation",
  "acheive": "achieve",
  "beleive": "believe",
  "enviroment": "environment",
  "goverment": "government",
  "independant": "independent",
  "inteligent": "intelligent",
  "neccessary": "necessary",
  "posession": "possession",
  "recomend": "recommend",
  "suceed": "succeed",
  "thier": "their",
  "teh": "the",
  "embarass": "embarrass",
  "publically": "publicly",
  "arguement": "argument",
  "concensus": "consensus",
  "liason": "liaison",
  "maintanance": "maintenance",
};

// Normalizace (pro jistotu): převede klíče i hodnoty na lowercase a vyhodí prázdné zápisy
function normalizeMap(map: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(map)) {
    const key = (k || "").trim().toLowerCase();
    const val = (v || "").trim().toLowerCase();
    if (!key || !val) continue;
    if (key === val) continue;
    out[key] = val;
  }
  return out;
}

export const COMMON_MISSPELLINGS: Record<string, string> = normalizeMap(RAW_MISSPELLINGS);

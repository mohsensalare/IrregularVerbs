import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const source = path.resolve(
  process.argv[2] ||
    "/Users/mohsensalare/AndroidStudioProjects/IrregularVerbs/app/src/main/assets/irregular-verbs.json",
);
const output = path.join(projectRoot, "verbs-data.js");

const document = JSON.parse(fs.readFileSync(source, "utf8"));
if (!Array.isArray(document.verbs) || document.verbs.length !== 244) {
  throw new Error(`Expected 244 verbs in ${source}`);
}

const verbs = document.verbs.map((verb) => ({
  infinitive: verb.base,
  past_simple: verb.past_simple,
  past_participle: verb.past_participle,
  fa: {
    infinitive: verb.fa.base,
    past_simple: verb.fa.past_simple,
    past_participle: verb.fa.past_participle,
  },
}));

const javascript =
  `/* Generated from the mobile app's 244-verb JSON. Do not edit manually. */\n` +
  `window.VERB_DATA=${JSON.stringify(verbs)};\n`;

fs.writeFileSync(output, javascript);
console.log(`Synced ${verbs.length} verbs to ${output}`);

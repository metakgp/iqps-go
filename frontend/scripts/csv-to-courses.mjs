// Converts a CSV of IIT Bhilai courses into src/data/courses.json
// Usage: node scripts/csv-to-courses.mjs courses.csv
// CSV format (header optional): course_code,course_name   e.g.  CSL101,Data Structures
import { readFileSync, writeFileSync } from "node:fs";

const input = process.argv[2];
if (!input) {
  console.error("Usage: node scripts/csv-to-courses.mjs <courses.csv>");
  process.exit(1);
}

const courses = {};
for (const rawLine of readFileSync(input, "utf8").split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line) continue;
  const comma = line.indexOf(",");
  if (comma === -1) continue;
  const code = line.slice(0, comma).trim().toUpperCase().replace(/[\s-]/g, "");
  const name = line.slice(comma + 1).trim().replace(/^"|"$/g, "").toUpperCase();
  if (!/^[A-Z]{2,3}\d{3}$/.test(code)) continue; // skips header and bad rows
  courses[code] = name;
}

const sorted = Object.fromEntries(Object.entries(courses).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(new URL("../src/data/courses.json", import.meta.url), JSON.stringify(sorted, null, 2) + "\n");
console.log(`Wrote ${Object.keys(sorted).length} courses to src/data/courses.json`);

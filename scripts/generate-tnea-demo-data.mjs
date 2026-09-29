import { createWriteStream, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const output = resolve(
  process.argv[2] ?? "src/data/demo/tnea-synthetic-demo-10000.csv",
);
const recordCount = 10_000;
const branches = [
  ["CS", "Computer Science and Engineering"],
  ["IT", "Information Technology"],
  ["EC", "Electronics and Communication Engineering"],
  ["EE", "Electrical and Electronics Engineering"],
  ["ME", "Mechanical Engineering"],
  ["CE", "Civil Engineering"],
  ["AD", "Artificial Intelligence and Data Science"],
  ["CY", "Cyber Security"],
];

mkdirSync(dirname(output), { recursive: true });
const stream = createWriteStream(output);
stream.write(
  "record_status,college_code,college_name,branch_code,branch_name,annual_intake,source_year,disclaimer\n",
);

for (let index = 0; index < recordCount; index += 1) {
  const collegeNumber = Math.floor(index / branches.length) + 1;
  const [branchCode, branchName] = branches[index % branches.length];
  const intake = 30 + ((collegeNumber + index) % 4) * 30;
  const values = [
    "synthetic_demo",
    `DEMO${String(collegeNumber).padStart(4, "0")}`,
    `Synthetic Demo Engineering College ${String(collegeNumber).padStart(4, "0")}`,
    branchCode,
    branchName,
    intake,
    2025,
    "TEST DATA ONLY - NOT OFFICIAL TNEA DATA",
  ];
  stream.write(`${values.map(value => JSON.stringify(value)).join(",")}\n`);
}

stream.end();
console.log(`Generated ${recordCount} isolated synthetic records at ${output}`);

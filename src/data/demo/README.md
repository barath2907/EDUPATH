# Synthetic TNEA demo data

`tnea-synthetic-demo-10000.csv` contains deterministic test records only.

The records:

- use `DEMO` college codes that cannot be confused with official TNEA codes;
- contain an explicit `synthetic_demo` status and disclaimer;
- must never be imported into verified TNEA tables;
- must never be used for recommendations, predictions, cutoffs, ranks, or
  claims about real colleges.

Regenerate the file with `pnpm data:demo`.

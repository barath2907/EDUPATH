# TNEA extracted datasets

These files are reproducibly extracted from the PDFs supplied to EduPath.

- `tnea-college-branches-2023.csv` contains college/branch rows whose branch
  names were present in the booklet's course-code index.
- `tnea-college-branches-2023-unresolved.csv` preserves rows whose branch code
  appeared in a college table but had no extractable name in that index. These
  records must not be approved until manually resolved from an official source.
- `tnea-government-school-rank-distribution-2024.csv` contains aggregated,
  non-PII statistics. Candidate names, application numbers, and dates of birth
  from the provisional rank-list PDF are deliberately excluded.
- `extraction-summary.json` records source hashes, counts, and verification
  status.

All extracted records remain pending until the original official source URL and
document version are independently verified.

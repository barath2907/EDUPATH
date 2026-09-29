#!/usr/bin/env python3
"""Extract non-PII TNEA reference data from the supplied official PDFs.

The college booklet is converted into import-ready and unresolved CSV files.
The provisional rank list is aggregated by mark/community; candidate names,
application numbers, and dates of birth are never written to disk.
"""

from __future__ import annotations

import csv
import hashlib
import json
import re
import subprocess
import tempfile
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COLLEGE_PDF = ROOT / "src/imports/Information_about_colleges_compressed.pdf"
RANK_PDF = ROOT / "src/imports/9a2089c765a3c4a3de82.pdf"
OUTPUT = ROOT / "src/data/official"

BRANCH_ROW = re.compile(
    r"\b\d{1,2}\s+([A-Z]{2}(?:/[A-Z]{2})?)\s+(\d{1,4})\s+(\d{4})\s+(Yes|No)\b"
)
RANK_ROW = re.compile(
    r"^\s*(\d+)\s+\d{6}\s+.+?\s+\d{2}-\d{2}-\d{4}\s+"
    r"(\d+(?:\.\d+)?)\s+(OC|BCM|BC|MBC|SCA|SC|ST)(?:\s+\d+)?\s*$"
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def pdf_text(path: Path) -> str:
    with tempfile.NamedTemporaryFile(suffix=".txt") as target:
        subprocess.run(
            ["pdftotext", "-layout", str(path), target.name],
            check=True,
            capture_output=True,
        )
        return Path(target.name).read_text(errors="replace")


def branch_catalog(pages: list[str]) -> dict[str, str]:
    catalog: dict[str, str] = {}
    section = "\n".join(pages[51:54])
    for line in section.splitlines():
        match = re.match(
            r"^\s*([A-Z]{2}(?:/[A-Z]{2})?)\s{2,}(.+?)\s*$", line
        )
        if match:
            catalog.setdefault(match.group(1), match.group(2).strip())
    return catalog


def college_header(lines: list[str]) -> tuple[str, str] | None:
    header: list[str] = []
    for line in lines:
        if line.strip():
            header.append(line.rstrip())
        elif header:
            break
    for line in header[:4]:
        match = re.match(r"^\s*(\d{1,4})\s{2,}(.*)$", line)
        if not match:
            continue
        code = match.group(1)
        title_parts = []
        for title_line in header[:4]:
            cleaned = re.sub(
                rf"^\s*{re.escape(code)}\s*", "", title_line
            ).strip()
            if cleaned:
                title_parts.append(cleaned)
        return code, " ".join(title_parts)
    return None


def labelled_value(lines: list[str], label: str) -> str | None:
    pattern = re.compile(rf"^\s*{label}\s+(.+?)(?:\s{{3,}}|$)", re.I)
    for line in lines:
        match = pattern.match(line)
        if match:
            return match.group(1).strip()
    return None


def write_college_data(text: str) -> tuple[int, int, int]:
    pages = text.split("\f")
    catalog = branch_catalog(pages)
    resolved: list[dict[str, object]] = []
    unresolved: list[dict[str, object]] = []
    college_codes: set[str] = set()

    for page_number, page in enumerate(pages[54:], start=54):
        lines = page.splitlines()
        header = college_header(lines)
        if not header:
            continue
        college_code, college_name = header
        college_codes.add(college_code)
        district = labelled_value(lines, "District")
        pincode_value = labelled_value(lines, "Pincode")
        pincode = (
            re.sub(r"\D", "", pincode_value or "")[:6] or None
        )

        for line in lines:
            match = BRANCH_ROW.search(line)
            if not match:
                continue
            branch_code, intake, _introduced, _nba = match.groups()
            row = {
                "college_code": college_code,
                "college_name": college_name,
                "official_name": college_name,
                "college_type": "",
                "university_affiliation": "",
                "autonomous_status": (
                    "Autonomous"
                    if "autonomous" in college_name.lower()
                    else ""
                ),
                "district": district or "",
                "city": "",
                "address": college_name,
                "pincode": pincode or "",
                "branch_code": branch_code,
                "branch_name": catalog.get(branch_code, ""),
                "short_name": branch_code,
                "degree": "",
                "department": "",
                "annual_intake": int(intake),
                "active": "true",
                "source_year": 2023,
                "source_page": page_number - 53,
            }
            (resolved if row["branch_name"] else unresolved).append(row)

    fields = list(resolved[0].keys())
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for filename, rows in (
        ("tnea-college-branches-2023.csv", resolved),
        ("tnea-college-branches-2023-unresolved.csv", unresolved),
    ):
        with (OUTPUT / filename).open("w", newline="", encoding="utf-8") as file:
            writer = csv.DictWriter(file, fieldnames=fields)
            writer.writeheader()
            writer.writerows(rows)
    return len(college_codes), len(resolved), len(unresolved)


def write_rank_distribution(text: str) -> tuple[int, int]:
    aggregates: dict[tuple[float, str], dict[str, int]] = defaultdict(
        lambda: {"candidate_count": 0, "minimum_rank": 10**9, "maximum_rank": 0}
    )
    parsed = 0
    for line in text.splitlines():
        match = RANK_ROW.match(line)
        if not match:
            continue
        overall_rank = int(match.group(1))
        mark = float(match.group(2))
        community = match.group(3)
        bucket = aggregates[(mark, community)]
        bucket["candidate_count"] += 1
        bucket["minimum_rank"] = min(bucket["minimum_rank"], overall_rank)
        bucket["maximum_rank"] = max(bucket["maximum_rank"], overall_rank)
        parsed += 1

    path = OUTPUT / "tnea-government-school-rank-distribution-2024.csv"
    with path.open("w", newline="", encoding="utf-8") as file:
        fields = [
            "year", "reservation", "stream", "aggregate_mark", "community",
            "candidate_count", "minimum_overall_rank", "maximum_overall_rank",
        ]
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        for (mark, community), values in sorted(
            aggregates.items(), key=lambda item: (-item[0][0], item[0][1])
        ):
            writer.writerow({
                "year": 2024,
                "reservation": "Government School 7.5%",
                "stream": "Academic",
                "aggregate_mark": mark,
                "community": community,
                "candidate_count": values["candidate_count"],
                "minimum_overall_rank": values["minimum_rank"],
                "maximum_overall_rank": values["maximum_rank"],
            })
    return parsed, len(aggregates)


def main() -> None:
    college_text = pdf_text(COLLEGE_PDF)
    rank_text = pdf_text(RANK_PDF)
    college_count, resolved_count, unresolved_count = write_college_data(
        college_text
    )
    rank_count, rank_bucket_count = write_rank_distribution(rank_text)
    summary = {
        "sources": [
            {
                "document": COLLEGE_PDF.name,
                "sha256": sha256(COLLEGE_PDF),
                "document_year": 2023,
                "authority": "Tamil Nadu Engineering Admissions",
                "verification_status": "pending_source_url_verification",
            },
            {
                "document": RANK_PDF.name,
                "sha256": sha256(RANK_PDF),
                "document_year": 2024,
                "authority": "Directorate of Technical Education, Chennai",
                "verification_status": "pending_source_url_verification",
                "privacy": "Only aggregated non-PII output is retained.",
            },
        ],
        "college_count": college_count,
        "resolved_college_branch_records": resolved_count,
        "unresolved_college_branch_records": unresolved_count,
        "rank_rows_aggregated_without_pii": rank_count,
        "rank_distribution_buckets": rank_bucket_count,
    }
    (OUTPUT / "extraction-summary.json").write_text(
        json.dumps(summary, indent=2) + "\n"
    )
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()

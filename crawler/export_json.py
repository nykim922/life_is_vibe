# -*- coding: utf-8 -*-
"""SQLite 크롤링 캐시를 앱 공지와 같은 구조의 검토용 JSON으로 내보낸다."""

from __future__ import annotations

from collections import Counter
import argparse
import json
import os
from pathlib import Path
import sqlite3
from typing import Any

CRAWLER_DIR = Path(__file__).resolve().parent
DB_PATH = CRAWLER_DIR / "notices.db"
DEFAULT_OUT = CRAWLER_DIR / "output" / "notices.crawled.json"

CATEGORY_TO_TEAM = {
    "장학금": "장학금",
    "채용": "채용·인턴",
    "대외활동": "공모전·대회",
    "교육": "교육·특강",
}


def to_raw_notice(row: dict[str, Any]) -> dict[str, Any]:
    tags = [tag.strip() for tag in (row.get("interest_tags") or "").split(",") if tag.strip()]
    deadline = row.get("deadline") or None
    posted = row.get("posted_date") or ""
    summary = f"{row.get('college_name', '')} 공지" + (f" · 게시일 {posted}" if posted else "")

    return {
        "id": row["id"],
        "title": row["title"],
        "source": row.get("source") or f"국민대 {row.get('college_name', '')}",
        "category": CATEGORY_TO_TEAM.get(row.get("category"), "교육·특강"),
        "interestTags": tags,
        "gradeCodes": None,
        "degreeLevels": None,
        "majorOpen": True,
        "majorList": [],
        "majorStatus": "unknown",
        "events": [],
        "applyPeriod": {"start": None, "end": deadline},
        "deadlineDates": [deadline] if deadline else [],
        "reviewRequired": True,
        "link": row.get("link"),
        "summary": summary,
    }


def read_existing(path: Path) -> dict[str, dict[str, Any]]:
    if not path.exists():
        return {}
    try:
        items = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return {
        item["id"]: item
        for item in items
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }


def export_notices(db_path: Path = DB_PATH, out_path: Path = DEFAULT_OUT) -> list[dict[str, Any]]:
    if not db_path.exists():
        raise FileNotFoundError(f"크롤링 DB가 없습니다: {db_path}")

    with sqlite3.connect(f"file:{db_path}?mode=ro", uri=True) as con:
        con.row_factory = sqlite3.Row
        rows = [
            dict(row)
            for row in con.execute("SELECT * FROM notices ORDER BY posted_date DESC, id ASC")
        ]

    previous = read_existing(out_path)
    notices: list[dict[str, Any]] = []
    for row in rows:
        fresh = to_raw_notice(row)
        old = previous.get(fresh["id"])
        # 이미 검토·승인한 항목은 사람이 보완한 날짜/태그/요약을 보존한다.
        if old and old.get("reviewRequired") is False:
            fresh = {**fresh, **old}
        notices.append(fresh)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = out_path.with_suffix(out_path.suffix + ".tmp")
    tmp_path.write_text(
        json.dumps(notices, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    os.replace(tmp_path, out_path)
    return notices


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("output", nargs="?", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--db", type=Path, default=DB_PATH)
    args = parser.parse_args()

    notices = export_notices(args.db.resolve(), args.output.resolve())
    print(f"검토용 JSON 생성: {len(notices)}건 → {args.output.resolve()}")
    for category, count in Counter(item["category"] for item in notices).items():
        print(f"  {category}: {count}건")
    print("reviewRequired를 false로 바꾼 공지만 publish_notices.py가 운영 데이터에 병합합니다.")


if __name__ == "__main__":
    main()

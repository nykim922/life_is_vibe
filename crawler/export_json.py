# -*- coding: utf-8 -*-
"""
notices.db(SQLite) → 앱용 notices.data.json 내보내기.

앱의 src/data/adaptNotices.ts 가 소비하는 RawNotice 형식으로 변환한다.
adaptNotices 를 그대로 재활용하기 위해, 크롤러의 앱 카테고리(4종)를
adaptNotices.mapCategory 가 이해하는 팀 카테고리 문자열로 역매핑한다.

사용법:
  python export_json.py           # 기본 경로(../src/data/notices.data.json)로 내보냄
  python export_json.py 경로.json  # 지정 경로로 내보냄
"""

import sys
import json
import sqlite3
import os

DB_PATH = "notices.db"
DEFAULT_OUT = os.path.join("..", "src", "data", "notices.data.json")

# 크롤러 앱카테고리(4종) → adaptNotices.mapCategory 입력용 팀 카테고리 문자열
# (mapCategory: '장학금'→장학금, '채용·인턴'→채용, '공모전·대회'→대외활동, 그 외→교육)
CATEGORY_TO_TEAM = {
    "장학금": "장학금",
    "채용": "채용·인턴",
    "대외활동": "공모전·대회",
    "교육": "교육·특강",
}


def to_raw_notice(row: dict) -> dict:
    # interest_tags 는 콤마 문자열 → 배열
    tags = [t for t in (row.get("interest_tags") or "").split(",") if t.strip()]

    # deadline(YYYY-MM-DD) → deadlineDates 배열 + applyPeriod.end
    deadline = row.get("deadline")
    deadline_dates = [deadline] if deadline else []

    # posted_date 를 요약에 간단히 활용
    posted = row.get("posted_date") or ""
    summary = f"{row.get('college_name', '')} 공지" + (f" · 게시일 {posted}" if posted else "")

    return {
        "id": row["id"],
        "title": row["title"],
        "source": row.get("source") or f"국민대 {row.get('college_name', '')}",
        "category": CATEGORY_TO_TEAM.get(row.get("category"), "교육·특강"),
        "interestTags": tags,
        "gradeCodes": None,          # 크롤러 데이터엔 학년 정보 없음 → 전체 대상
        "degreeLevels": None,        # 학위 정보 없음
        "majorOpen": True,           # 전공 무관으로 취급(과도한 필터링 방지)
        "majorList": [],
        "majorStatus": "unknown",
        "events": [],
        "applyPeriod": {"start": None, "end": deadline},
        "deadlineDates": deadline_dates,
        "reviewRequired": True,      # 크롤링 요약이라 원문 확인 권장
        "link": row.get("link"),
        "summary": summary,
    }


def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_OUT

    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    cur = con.cursor()
    rows = [dict(r) for r in cur.execute("SELECT * FROM notices")]
    con.close()

    raws = [to_raw_notice(r) for r in rows]

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(raws, f, ensure_ascii=False, indent=2)

    print(f"내보내기 완료: {len(raws)}건 → {os.path.abspath(out_path)}")
    # 카테고리 분포 요약
    from collections import Counter
    c = Counter(r["category"] for r in raws)
    for k, v in c.items():
        print(f"  {k}: {v}건")


if __name__ == "__main__":
    main()

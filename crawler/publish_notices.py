# -*- coding: utf-8 -*-
"""검토가 끝난 크롤링 공지만 기존 운영 공지 JSON에 안전하게 병합한다."""

from __future__ import annotations

import argparse
from datetime import datetime
import json
import os
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit, urlunsplit

CRAWLER_DIR = Path(__file__).resolve().parent
DEFAULT_CANDIDATES = CRAWLER_DIR / "output" / "notices.crawled.json"
DEFAULT_TARGET = CRAWLER_DIR.parent / "src" / "data" / "notices.data.json"
ALLOWED_CATEGORIES = {
    "장학금",
    "채용·인턴",
    "공모전·대회",
    "연구·프로젝트",
    "교육·특강",
    "학사·행정",
}


def load_list(path: Path) -> list[dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list) or not all(isinstance(item, dict) for item in data):
        raise ValueError(f"JSON 최상위 값은 객체 배열이어야 합니다: {path}")
    return data


def canonical_link(value: str) -> str:
    parts = urlsplit(value.strip())
    path = parts.path.rstrip("/") or "/"
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), path, parts.query, ""))


def validate_date(value: Any, field: str) -> None:
    if value in (None, ""):
        return
    if not isinstance(value, str):
        raise ValueError(f"{field}는 문자열이어야 합니다")
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"{field} 날짜 형식이 잘못됐습니다: {value}") from exc


def validate_candidate(item: dict[str, Any]) -> None:
    for field in ("id", "title", "source", "category", "link"):
        if not isinstance(item.get(field), str) or not item[field].strip():
            raise ValueError(f"{item.get('id', '<id 없음>')}: {field} 값이 필요합니다")
    if item["category"] not in ALLOWED_CATEGORIES:
        raise ValueError(f"{item['id']}: 알 수 없는 category {item['category']}")
    link = urlsplit(item["link"])
    if link.scheme not in {"http", "https"} or not link.netloc:
        raise ValueError(f"{item['id']}: 올바른 원문 링크가 필요합니다")
    for field in ("interestTags", "events", "deadlineDates", "majorList"):
        if not isinstance(item.get(field), list):
            raise ValueError(f"{item['id']}: {field}는 배열이어야 합니다")
    period = item.get("applyPeriod") or {}
    if not isinstance(period, dict):
        raise ValueError(f"{item['id']}: applyPeriod는 객체여야 합니다")
    validate_date(period.get("start"), f"{item['id']}.applyPeriod.start")
    validate_date(period.get("end"), f"{item['id']}.applyPeriod.end")
    for index, value in enumerate(item["deadlineDates"]):
        validate_date(value, f"{item['id']}.deadlineDates[{index}]")
    for index, event in enumerate(item["events"]):
        if not isinstance(event, dict):
            raise ValueError(f"{item['id']}.events[{index}]는 객체여야 합니다")
        validate_date(event.get("startAt"), f"{item['id']}.events[{index}].startAt")
        validate_date(event.get("endAt"), f"{item['id']}.events[{index}].endAt")


def merge_approved(
    current: list[dict[str, Any]], candidates: list[dict[str, Any]]
) -> tuple[list[dict[str, Any]], int, int]:
    ids = {item.get("id") for item in current}
    links = {
        canonical_link(item["link"])
        for item in current
        if isinstance(item.get("link"), str) and item["link"].strip()
    }
    merged = list(current)
    added = 0
    skipped = 0

    for item in candidates:
        if item.get("reviewRequired") is not False:
            skipped += 1
            continue
        validate_candidate(item)
        link = canonical_link(item["link"])
        if item["id"] in ids or link in links:
            skipped += 1
            continue
        merged.append(item)
        ids.add(item["id"])
        links.add(link)
        added += 1
    return merged, added, skipped


def publish(candidates_path: Path, target_path: Path, dry_run: bool = False) -> tuple[int, int, int]:
    current = load_list(target_path)
    candidates = load_list(candidates_path)
    merged, added, skipped = merge_approved(current, candidates)
    if not dry_run and added:
        tmp_path = target_path.with_suffix(target_path.suffix + ".tmp")
        tmp_path.write_text(
            json.dumps(merged, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        os.replace(tmp_path, target_path)
    return len(merged), added, skipped


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidates", type=Path, default=DEFAULT_CANDIDATES)
    parser.add_argument("--target", type=Path, default=DEFAULT_TARGET)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    total, added, skipped = publish(
        args.candidates.resolve(), args.target.resolve(), args.dry_run
    )
    mode = "검사 완료" if args.dry_run else "병합 완료"
    print(f"{mode}: 신규 {added}건, 보류·중복 {skipped}건, 운영 공지 총 {total}건")


if __name__ == "__main__":
    main()

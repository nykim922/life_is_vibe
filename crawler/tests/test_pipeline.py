import json
from pathlib import Path
import sqlite3
import sys
import tempfile
import unittest

CRAWLER_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(CRAWLER_DIR))

from categorize import extract_deadline
from export_json import export_notices
from publish_notices import merge_approved, validate_candidate


def candidate(**overrides):
    item = {
        "id": "cs-1",
        "title": "AI 특강",
        "source": "국민대 소프트웨어융합대학",
        "category": "교육·특강",
        "interestTags": ["AI·데이터"],
        "gradeCodes": None,
        "degreeLevels": None,
        "majorOpen": True,
        "majorList": [],
        "majorStatus": "unknown",
        "events": [],
        "applyPeriod": {"start": None, "end": "2026-09-30"},
        "deadlineDates": ["2026-09-30"],
        "reviewRequired": False,
        "link": "https://cs.kookmin.ac.kr/notice/1",
        "summary": "소프트웨어융합대학 공지",
    }
    item.update(overrides)
    return item


class ExportTests(unittest.TestCase):
    def test_export_uses_app_schema_and_preserves_approved_edits(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            db_path = root / "notices.db"
            out_path = root / "notices.crawled.json"
            with sqlite3.connect(db_path) as con:
                con.execute(
                    """CREATE TABLE notices (
                        id TEXT PRIMARY KEY, college_key TEXT, college_name TEXT,
                        source TEXT, title TEXT, category TEXT, deadline TEXT,
                        posted_date TEXT, link TEXT, interest_tags TEXT, crawled_at TEXT
                    )"""
                )
                con.execute(
                    "INSERT INTO notices VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        "cs-1", "cs", "소프트웨어융합대학", "국민대 소프트웨어융합대학",
                        "AI 특강", "교육", "2026-09-30", "2026-09-20",
                        "https://cs.kookmin.ac.kr/notice/1", "AI·데이터", "2026-09-20",
                    ),
                )
            first = export_notices(db_path, out_path)
            self.assertEqual(first[0]["category"], "교육·특강")
            self.assertTrue(first[0]["reviewRequired"])
            first[0]["reviewRequired"] = False
            first[0]["summary"] = "사람이 확인한 설명"
            out_path.write_text(json.dumps(first, ensure_ascii=False), encoding="utf-8")

            second = export_notices(db_path, out_path)
            self.assertFalse(second[0]["reviewRequired"])
            self.assertEqual(second[0]["summary"], "사람이 확인한 설명")


class PublishTests(unittest.TestCase):
    def test_only_approved_new_notices_are_merged(self):
        current = [candidate(id="old", link="https://example.com/old")]
        waiting = candidate(id="waiting", link="https://example.com/waiting", reviewRequired=True)
        approved = candidate(id="new", link="https://example.com/new")
        merged, added, skipped = merge_approved(current, [waiting, approved])
        self.assertEqual([item["id"] for item in merged], ["old", "new"])
        self.assertEqual((added, skipped), (1, 1))

    def test_existing_link_is_not_overwritten(self):
        current = [candidate(id="old", title="수작업 공지")]
        duplicate = candidate(id="new", title="크롤링 공지", link=current[0]["link"] + "#top")
        merged, added, skipped = merge_approved(current, [duplicate])
        self.assertEqual(merged[0]["title"], "수작업 공지")
        self.assertEqual((added, skipped), (0, 1))

    def test_invalid_date_is_rejected(self):
        item = candidate(deadlineDates=["2026-02-31"])
        with self.assertRaises(ValueError):
            validate_candidate(item)

    def test_deadline_parser_validates_calendar_date(self):
        self.assertEqual(extract_deadline("접수 ~9/30", 2026), "2026-09-30")
        self.assertIsNone(extract_deadline("접수 ~2/31", 2026))


if __name__ == "__main__":
    unittest.main()

# -*- coding: utf-8 -*-
"""
국민대 학과 사이트 공지 크롤러.

동작:
1) 각 학과 sitemap.xml 을 읽어 게시판 URL 자동 발견
2) 게시판 목록 페이지를 긁어 공지(제목/날짜/링크) 추출
3) URL/제목으로 카테고리 분류
4) SQLite DB(notices.db)에 저장 (중복 제거)

사용법:
  python crawl.py            # 전체 학과 크롤링
  python crawl.py ee cs      # 특정 학과만 (key)
"""

import sys
import time
import sqlite3
import re
from urllib.parse import urljoin
from xml.etree import ElementTree as ET

import requests
from bs4 import BeautifulSoup

from colleges import COLLEGES, BOARD_HINTS, EXCLUDE_HINTS
from categorize import categorize, infer_interests, extract_deadline

# 게시판당 최대 수집 공지 수
MAX_PER_BOARD = 15
# 학과당 최대 게시판 수 (너무 많은 게시판 방지)
MAX_BOARDS_PER_COLLEGE = 5
# 요청 사이 대기(초) - 서버 부담 방지
SLEEP = 1.0
# HTTP 타임아웃(초)
TIMEOUT = 15

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; KMU-CampusSecretary-Crawler/1.0)"
}

DB_PATH = "notices.db"


def fetch(url: str) -> str | None:
    """URL 의 HTML 을 가져온다. 실패하면 None."""
    try:
        res = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        res.encoding = res.apparent_encoding or "utf-8"
        if res.status_code == 200:
            return res.text
    except Exception as e:
        print(f"    [!] 요청 실패 {url}: {e}")
    return None


def find_boards(base: str) -> list[str]:
    """sitemap.xml 에서 게시판 후보 URL 을 찾는다."""
    sitemap = fetch(urljoin(base, "/sitemap.xml"))
    if not sitemap:
        return []
    urls = []
    try:
        # 네임스페이스 무시하고 <loc> 텍스트만 추출
        for m in re.finditer(r"<loc>\s*([^<]+?)\s*</loc>", sitemap):
            urls.append(m.group(1).strip())
    except Exception:
        return []

    boards = []
    for u in urls:
        low = u.lower()
        if any(ex in low for ex in EXCLUDE_HINTS):
            continue
        if any(h in low for h in BOARD_HINTS):
            boards.append(u)
    # 중복 제거 + 상한
    seen = []
    for b in boards:
        if b not in seen:
            seen.append(b)
    return seen[:MAX_BOARDS_PER_COLLEGE]


def _norm_date(text: str) -> str:
    """행 텍스트에서 날짜를 뽑아 YYYY-MM-DD 로 정규화.
    지원 형식: 2026-09-18 / 2026.09.18 / 26.09.18 (YY.MM.DD)"""
    # 4자리 연도
    dm = re.search(r"(20\d{2})[-.](\d{1,2})[-.](\d{1,2})", text)
    if dm:
        y, mo, d = dm.groups()
        return f"{int(y)}-{int(mo):02d}-{int(d):02d}"
    # 2자리 연도 (예: 26.09.18)
    dm = re.search(r"\b(\d{2})[.\-](\d{1,2})[.\-](\d{1,2})\b", text)
    if dm:
        y, mo, d = dm.groups()
        return f"20{y}-{int(mo):02d}-{int(d):02d}"
    return ""


def parse_notice_bg(soup: BeautifulSoup, board_url: str) -> list[dict]:
    """국민대 신형 CMS 목록 구조.
    각 게시물이 <ul class="notice-bg"> 이고 그 안에
    제목=li.subject > a[href], 날짜=li.date 로 들어있다. (예: cs 소프트웨어융합대학)"""
    items = []
    for ul in soup.select("ul.notice-bg"):
        a = ul.select_one("li.subject a[href]")
        if not a:
            continue
        title = a.get_text(strip=True)
        if not title or len(title) < 5:
            continue
        href = urljoin(board_url, a.get("href", ""))
        date_li = ul.select_one("li.date")
        date = _norm_date(date_li.get_text(" ", strip=True)) if date_li else ""
        items.append({"title": title, "link": href, "date": date})
    return items


def parse_list(html: str, board_url: str) -> list[dict]:
    """게시판 목록 페이지에서 공지 항목들을 뽑는다.
    1) 신형 CMS(ul.notice-bg) 우선 처리
    2) 없으면 <table class="list"> 등 테이블 구조 처리
    (gnb / menu-box 같은 네비게이션 테이블은 제외해야 함)"""
    soup = BeautifulSoup(html, "html.parser")

    # 1) 신형 CMS 목록 구조 우선
    ng = parse_notice_bg(soup, board_url)
    if ng:
        return ng[:MAX_PER_BOARD]

    items = []

    # 2) 실제 게시판 목록 테이블만 대상 (class 에 list/board 포함)
    tables = soup.select("table.list, table.board, table.bbs")
    # 위 클래스가 없으면, 링크가 많은 테이블을 목록으로 추정
    if not tables:
        cand = [t for t in soup.select("table") if len(t.select("a[href]")) >= 3]
        # gnb/menu 성격의 테이블 제외
        tables = [t for t in cand if "menu" not in " ".join(t.get("class") or []).lower()]

    for table in tables:
        rows = table.select("tbody tr") or table.select("tr")
        for tr in rows:
            tds = tr.select("td")
            if len(tds) < 2:
                continue  # 헤더행 등
            # 행 안의 모든 링크 중 '가장 긴 텍스트'를 제목으로 (번호 칸 링크 회피)
            best_title = ""
            best_href = ""
            for a in tr.select("a[href]"):
                txt = a.get_text(strip=True)
                if len(txt) > len(best_title):
                    best_title = txt
                    best_href = a.get("href", "")
            # 제목이 너무 짧거나 숫자만이면 제외 (번호 칸 등)
            if not best_title or len(best_title) < 5 or best_title.isdigit():
                continue
            href = urljoin(board_url, best_href)
            # 행 전체에서 날짜 추출 (YYYY-MM-DD / YYYY.MM.DD / YY.MM.DD)
            date = _norm_date(tr.get_text(" "))
            items.append({"title": best_title, "link": href, "date": date})

    return items[:MAX_PER_BOARD]


def board_path(url: str) -> str:
    """URL 에서 도메인 뒤 경로만."""
    m = re.search(r"https?://[^/]+(/.*)?", url)
    return (m.group(1) or "") if m else url


def init_db(conn: sqlite3.Connection):
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS notices (
            id TEXT PRIMARY KEY,          -- college_key + 링크 해시
            college_key TEXT,
            college_name TEXT,
            source TEXT,
            title TEXT NOT NULL,
            category TEXT,
            deadline TEXT,                -- YYYY-MM-DD or NULL
            posted_date TEXT,             -- 게시일
            link TEXT,
            interest_tags TEXT,           -- 콤마로 join
            crawled_at TEXT
        )
        """
    )
    conn.commit()


def make_id(college_key: str, link: str) -> str:
    import hashlib
    h = hashlib.md5(link.encode("utf-8")).hexdigest()[:10]
    return f"{college_key}-{h}"


def save(conn: sqlite3.Connection, rows: list[dict]):
    now = time.strftime("%Y-%m-%d %H:%M:%S")
    for r in rows:
        conn.execute(
            """
            INSERT INTO notices
            (id, college_key, college_name, source, title, category, deadline, posted_date, link, interest_tags, crawled_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                title=excluded.title,
                category=excluded.category,
                deadline=excluded.deadline,
                posted_date=excluded.posted_date,
                crawled_at=excluded.crawled_at
            """,
            (
                r["id"], r["college_key"], r["college_name"], r["source"],
                r["title"], r["category"], r["deadline"], r["posted_date"],
                r["link"], r["interest_tags"], now,
            ),
        )
    conn.commit()


def crawl_college(conn: sqlite3.Connection, college: dict):
    key, name, base = college["key"], college["name"], college["base"]
    print(f"\n=== {name} ({base}) ===")
    boards = find_boards(base)
    if not boards:
        print("    게시판을 sitemap 에서 못 찾음 (건너뜀)")
        return 0
    print(f"    게시판 {len(boards)}개 발견")

    total = 0
    for board in boards:
        time.sleep(SLEEP)
        html = fetch(board)
        if not html:
            continue
        items = parse_list(html, board)
        path = board_path(board)
        rows = []
        for it in items:
            cat = categorize(path, it["title"])
            deadline = extract_deadline(it["title"])
            rows.append({
                "id": make_id(key, it["link"]),
                "college_key": key,
                "college_name": name,
                "source": f"국민대 {name}",
                "title": it["title"],
                "category": cat,
                "deadline": deadline,
                "posted_date": it["date"],
                "link": it["link"],
                "interest_tags": ",".join(infer_interests(it["title"])),
            })
        if rows:
            save(conn, rows)
            total += len(rows)
            print(f"    [{path}] {len(rows)}건 저장")
    return total


def main():
    targets = COLLEGES
    if len(sys.argv) > 1:
        keys = set(sys.argv[1:])
        targets = [c for c in COLLEGES if c["key"] in keys]

    conn = sqlite3.connect(DB_PATH)
    init_db(conn)

    grand = 0
    for college in targets:
        grand += crawl_college(conn, college)

    # 요약
    cur = conn.execute("SELECT category, COUNT(*) FROM notices GROUP BY category")
    print("\n===== 저장 결과 =====")
    for cat, cnt in cur.fetchall():
        print(f"  {cat}: {cnt}건")
    total = conn.execute("SELECT COUNT(*) FROM notices").fetchone()[0]
    print(f"  총 {total}건 (DB: {DB_PATH})")
    conn.close()


if __name__ == "__main__":
    main()

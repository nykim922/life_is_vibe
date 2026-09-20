# 공지 크롤러

국민대 학과/단과대학 사이트에서 공지를 수집해 앱 데이터로 변환합니다.

## 구성

- `colleges.py` — 크롤링 대상 단과대학 목록 + 게시판 힌트 키워드
- `categorize.py` — URL/제목 기반 카테고리(교육/채용/대외활동/장학금) 분류, 관심사 태그 추론, 마감일 추출
- `crawl.py` — sitemap 분석 → 게시판 발견 → 목록 파싱 → SQLite(`notices.db`) 저장
- `export_json.py` — `notices.db` → 앱용 `../src/data/notices.data.json` 내보내기
- `notices.db` — 수집 결과(SQLite)

## 사용법

```bash
# 의존성 (최초 1회)
pip install requests beautifulsoup4 lxml

# 크롤링
python crawl.py            # 전체 학과
python crawl.py ee cs      # 특정 학과만(키)

# DB → 앱 JSON 내보내기
python export_json.py
```

## 지원 게시판 구조

- 테이블형(`table.list` 등)과 신형 CMS 목록(`ul.notice-bg`) 모두 파싱합니다.
- 일부 학과(경영/자동차/KIBS 등)는 목록을 JS로 렌더링해 정적 크롤링이 안 됩니다. 이 경우 추후 헤드리스 브라우저 도입이 필요합니다.

## 참고

- `robots.txt`를 확인해 크롤링이 허용된 학과 사이트만 대상으로 합니다. (career.kookmin.ac.kr 등 Disallow 사이트는 제외)
- 요청 간 대기(SLEEP)를 둬 서버 부담을 줄입니다.

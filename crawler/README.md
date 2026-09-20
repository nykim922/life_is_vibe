# 공지 크롤러

국민대학교 학과·단과대학 사이트에서 공지를 수집하고, CampusFit이 사용하는 공지 JSON 형식으로 검토·병합합니다.

## 데이터 흐름

```text
학과 사이트
→ notices.db                    # 실행 중 사용하는 로컬 캐시(Git 제외)
→ output/notices.crawled.json  # 기존 공지와 같은 구조의 검토 목록
→ src/data/notices.data.json   # 승인된 공지만 들어가는 운영 원본
```

프론트엔드와 Express Calendar 백엔드는 모두 `src/data/notices.data.json`을 읽습니다. 크롤러가 이 파일을 직접 덮어쓰지 않으며, 기존에 정리한 공지는 항상 보존합니다.

## 실행

저장소 루트에서 실행합니다.

```bash
python3 -m pip install -r crawler/requirements.txt

# 전체 또는 일부 학과 수집
python3 crawler/crawl.py
python3 crawler/crawl.py ee cs

# DB를 검토용 JSON으로 변환
python3 crawler/export_json.py

# output/notices.crawled.json에서 검토 완료 항목의
# reviewRequired를 false로 바꾼 뒤 병합 결과 확인
python3 crawler/publish_notices.py --dry-run

# 승인 항목을 운영 공지에 병합
python3 crawler/publish_notices.py
```

`export_json.py`를 다시 실행해도 이미 `reviewRequired: false`로 승인하고 보완한 항목은 유지됩니다. `publish_notices.py`는 ID나 원문 링크가 같은 기존 공지를 건너뛰므로 수작업으로 정리한 날짜·태그를 덮어쓰지 않습니다.

## 구성

- `colleges.py` — 크롤링 대상 단과대학 목록과 게시판 경로 힌트
- `categorize.py` — 카테고리·관심 태그·제목 속 마감일 추론
- `crawl.py` — sitemap 분석, 목록 파싱, SQLite 캐시 저장
- `export_json.py` — 캐시를 검토용 JSON으로 변환
- `publish_notices.py` — 승인된 신규 공지를 운영 JSON에 병합
- `requirements.txt` — 크롤러 Python 의존성

테이블형 게시판과 신형 CMS 목록을 지원합니다. JavaScript 렌더링 게시판, 상세 본문의 행사 일시, 제목에 없는 마감일은 아직 자동 추출하지 못하므로 원문 검토가 필요합니다. 대상 사이트는 운영 전에 `robots.txt` 정책을 다시 확인해야 합니다.

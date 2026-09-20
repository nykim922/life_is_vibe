# 공지의 URL 경로와 제목을 보고 카테고리를 자동 분류.
# 앱 카테고리 4종: 교육 / 채용 / 대외활동 / 장학금

import re
from datetime import date


def categorize(url_path: str, title: str) -> str:
    text = f"{url_path} {title}".lower()
    t = title

    # 장학금
    if "scholar" in text or "장학" in t or "장학금" in t:
        return "장학금"

    # 채용 (채용/취업/인턴/모집/공채)
    if (
        "recruit" in text or "employ" in text or "job" in text
        or "채용" in t or "취업" in t or "인턴" in t or "공채" in t
        or "신입사원" in t or "모집" in t
    ):
        return "채용"

    # 대외활동 (공모전/대회/경진대회/해커톤/봉사/대외활동)
    if (
        "공모전" in t or "대회" in t or "경진" in t or "해커톤" in t
        or "챌린지" in t or "봉사" in t or "대외활동" in t or "contest" in text
    ):
        return "대외활동"

    # 교육 (특강/세미나/워크숍/프로그램/교육) - 기본값 포함
    return "교육"


# 제목에서 관심사 태그를 추론 (앱 Interest 와 느슨히 매칭)
INTEREST_KEYWORDS = {
    "반도체": ["반도체", "소자", "공정", "semiconductor"],
    "AI·데이터": ["ai", "인공지능", "데이터", "머신러닝", "딥러닝", "빅데이터"],
    "소프트웨어": ["소프트웨어", "sw", "프로그래밍", "코딩", "개발", "앱"],
    "디자인": ["디자인", "ux", "ui", "콘텐츠", "영상"],
    "마케팅": ["마케팅", "홍보", "브랜드", "광고"],
    "창업": ["창업", "스타트업", "ir", "벤처"],
    "공정·장비": ["장비", "설비", "생산", "품질", "제조"],
}


def infer_interests(title: str) -> list:
    t = title.lower()
    tags = []
    for interest, kws in INTEREST_KEYWORDS.items():
        if any(kw in t for kw in kws):
            tags.append(interest)
    return tags


# 제목에서 마감일(YYYY-MM-DD)을 추출 시도 (예: ~9/29, ~12/31(목))
def extract_deadline(title: str, year_hint: int | None = None) -> str | None:
    # ~M/D 또는 ~MM/DD 패턴
    m = re.search(r"~\s*(\d{1,2})/(\d{1,2})", title)
    if m:
        year = year_hint or date.today().year
        month, day = int(m.group(1)), int(m.group(2))
        try:
            return date(year, month, day).isoformat()
        except ValueError:
            return None
    return None

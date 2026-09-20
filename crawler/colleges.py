# 국민대 단과대학/학부 사이트 목록.
# robots.txt 확인 결과 학과 사이트는 Allow: / (크롤링 허용).
# career.kookmin.ac.kr 은 Disallow: / 라서 제외함.

COLLEGES = [
    {"key": "biz", "name": "경영대학", "base": "https://biz.kookmin.ac.kr"},
    {"key": "cha", "name": "글로벌인문·지역대학", "base": "https://cha.kookmin.ac.kr"},
    {"key": "social", "name": "사회과학대학", "base": "https://social.kookmin.ac.kr"},
    {"key": "cst", "name": "과학기술대학", "base": "https://cst.kookmin.ac.kr"},
    {"key": "cs", "name": "소프트웨어융합대학", "base": "https://cs.kookmin.ac.kr"},
    {"key": "auto", "name": "자동차모빌리티대학", "base": "https://auto.kookmin.ac.kr"},
    {"key": "eng", "name": "창의공과대학", "base": "https://eng.kookmin.ac.kr"},
    {"key": "ee", "name": "전자공학부", "base": "https://ee.kookmin.ac.kr"},
    {"key": "kibs", "name": "KIBS", "base": "https://kibs.kookmin.ac.kr"},
]

# 게시판으로 볼 URL 조각 (sitemap 에서 이 키워드가 들어간 경로를 게시판 후보로 봄)
BOARD_HINTS = [
    "notice",       # 공지
    "recruit",      # 채용
    "scholarship",  # 장학
    "lecture",      # 특강/교육
    "employ",       # 취업
    "job",          # 취업/채용
    "program",      # 프로그램
    "board",        # 일반 게시판
]

# 게시판이 아니라 제외할 경로 키워드 (소개/인사말 등)
EXCLUDE_HINTS = [
    "introduce", "greetings", "history", "location", "professor",
    "curriculum", "research/intro", "sitemap", "search", "people",
    "library", "ucc", "press", "perfor", "special/",
]

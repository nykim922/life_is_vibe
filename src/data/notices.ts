import type { NoticeSeed, Notice } from './types'
import { buildDate } from './dates'

/**
 * 데모용 시드 공지.
 * 국민대 실제 공지 흐름을 참고해 재구성한 예시 데이터이며, 실제 신청 링크는 없다.
 * 날짜는 최초 실행일 기준 offsetDays 로 런타임에 계산된다.
 *
 * 포함 사례: 무료/유료, 온라인/오프라인, 평일/주말, 마감임박/마감완료,
 * 자격 확인 필요, 기존 수업과 겹치는 행사, 시간 미명시 공지.
 */
export const NOTICE_SEEDS: NoticeSeed[] = [
  {
    id: 'N01',
    title: '반도체 소자·공정 실무 직무교육 (5주 과정)',
    source: '경력개발지원단 · 교육/행사',
    category: '교육',
    summary: '반도체 8대 공정과 소자 동작 원리를 현업 엔지니어와 함께 배우는 실습 중심 교육.',
    detail:
      '삼성전자·SK하이닉스 현직 엔지니어가 진행하는 반도체 직무교육입니다. 소자 물리, 포토·식각·증착 공정, 수율 관리 기초를 다루며 매 회차 실습 과제가 있습니다. 수료 시 수료증이 발급됩니다.',
    eligibleGrades: [2, 3, 4],
    eligibleMajors: ['전자공학부', '신소재공학부', '기계공학부'],
    interestTags: ['반도체', '공정·장비'],
    relatedGoals: ['교육 수강', '직무 탐색'],
    cost: 'free',
    online: false,
    location: '공학관 401호',
    deadlineOffsetDays: 4,
    deadlineTime: '18:00',
    eventStartOffsetDays: 6,
    eventEndOffsetDays: 6,
    eventStartTime: '10:00',
    eventEndTime: '12:00',
    eventNote: '이후 매주 화요일 5주간 진행',
  },
  {
    id: 'N02',
    title: '반도체 장비 엔지니어 현직자 멘토링 데이',
    source: '전자공학부 · 취업정보',
    category: '교육',
    summary: '장비 유지보수·PM 직무를 준비하는 학생을 위한 1:1 현직자 멘토링.',
    detail:
      '반도체 장비사(어플라이드, 램리서치 등) 현직 엔지니어와 소규모로 진행하는 멘토링입니다. 직무 소개, 준비 로드맵, 이력서 피드백을 받을 수 있습니다. 온라인(Zoom)으로 진행됩니다.',
    eligibleGrades: [3, 4],
    eligibleMajors: ['전자공학부', '기계공학부'],
    interestTags: ['공정·장비', '반도체'],
    relatedGoals: ['직무 탐색', '인턴 준비'],
    cost: 'free',
    online: true,
    deadlineOffsetDays: 2,
    deadlineTime: '23:59',
    eventStartOffsetDays: 5,
    eventEndOffsetDays: 5,
    eventStartTime: '19:00',
    eventEndTime: '21:00',
  },
  {
    id: 'N03',
    title: '2026 국민 AI 해커톤 (48시간)',
    source: 'SW중심대학사업단 · 교내외경진대회',
    category: '대외활동',
    summary: '주말 무박 2일 동안 팀을 이뤄 AI 서비스 프로토타입을 만드는 해커톤.',
    detail:
      '생성형 AI를 활용한 캠퍼스 문제 해결 아이디어를 48시간 안에 구현합니다. 팀당 3~4명, AWS 크레딧과 멘토가 제공됩니다. 총상금 500만원. 노트북 지참 필수.',
    eligibleGrades: [1, 2, 3, 4],
    eligibleMajors: [],
    interestTags: ['AI·데이터', '소프트웨어', '창업'],
    relatedGoals: ['대외활동', '직무 탐색'],
    cost: 'free',
    online: false,
    location: '미래관 창의라운지',
    deadlineOffsetDays: 3,
    deadlineTime: '17:00',
    eventStartOffsetDays: 5,
    eventEndOffsetDays: 6,
    eventStartTime: '10:00',
    eventEndTime: '18:00',
    eventNote: '토·일 무박 2일',
  },
  {
    id: 'N04',
    title: '대학생 UX/UI 디자인 공모전',
    source: '경력개발지원단 · 교육/행사',
    category: '대외활동',
    summary: '실제 서비스 개선 주제로 화면 설계를 겨루는 디자인 공모전.',
    detail:
      '모바일 서비스 UX 개선안을 제출하는 공모전입니다. 개인 또는 팀 참가 가능. 수상작은 포트폴리오로 활용할 수 있고, 대상 200만원. 온라인 제출.',
    eligibleGrades: [1, 2, 3, 4],
    eligibleMajors: [],
    interestTags: ['디자인', '창업'],
    relatedGoals: ['대외활동'],
    cost: 'free',
    online: true,
    deadlineOffsetDays: 12,
    deadlineTime: '18:00',
    eventStartOffsetDays: null,
    eventEndOffsetDays: null,
    eventNote: '접수 후 4주간 온라인 심사',
  },
  {
    id: 'N05',
    title: '현대모비스 소프트웨어 부문 동계 인턴 채용',
    source: '전자공학부 · 취업정보',
    category: '채용',
    summary: '임베디드·자율주행 SW 직무 동계 인턴. 정규직 전환 연계형.',
    detail:
      '차량용 소프트웨어 개발 직무의 동계 인턴을 모집합니다. 6주 근무, 우수 인턴은 정규직 전환 검토. C/C++ 또는 Python 사용 경험 우대. 서류 후 온라인 코딩테스트.',
    eligibleGrades: [3, 4],
    eligibleMajors: ['전자공학부', '소프트웨어학부', '컴퓨터공학부'],
    eligibilityNote: '졸업 예정자 및 3학년 이상 지원 가능',
    interestTags: ['소프트웨어', 'AI·데이터'],
    relatedGoals: ['인턴 준비', '직무 탐색'],
    cost: 'free',
    online: true,
    deadlineOffsetDays: 8,
    deadlineTime: '10:00',
    eventStartOffsetDays: null,
    eventEndOffsetDays: null,
  },
  {
    id: 'N06',
    title: 'AI·데이터 분석 부트캠프 (유료·주말반)',
    source: '경력개발지원단 · 교육/행사',
    category: '교육',
    summary: '주말에 진행하는 실무형 데이터 분석 부트캠프. 수료증 발급.',
    detail:
      'Python, SQL, 시각화, 머신러닝 기초를 다루는 8주 주말 부트캠프입니다. 교재비와 클라우드 실습 비용이 포함된 유료 과정입니다. 재학생 할인 적용.',
    eligibleGrades: [1, 2, 3, 4],
    eligibleMajors: [],
    interestTags: ['AI·데이터', '소프트웨어'],
    relatedGoals: ['교육 수강', '직무 탐색'],
    cost: 'paid',
    costNote: '재학생 12만원 (교재·실습비 포함)',
    online: false,
    location: '경상관 209호',
    deadlineOffsetDays: 9,
    deadlineTime: '18:00',
    eventStartOffsetDays: 12,
    eventEndOffsetDays: 12,
    eventStartTime: '10:00',
    eventEndTime: '17:00',
    eventNote: '이후 매주 토요일 8주간',
  },
  {
    id: 'N07',
    title: '스타트업 IR·마케팅 실전 특강',
    source: '창업지원단 · 특강',
    category: '교육',
    summary: '초기 창업팀을 위한 투자 유치와 그로스 마케팅 전략 특강.',
    detail:
      '실제 시드 투자를 받은 창업가가 IR 덱 구성, 시장 검증, 퍼포먼스 마케팅 기초를 전달합니다. 창업 동아리 소속이 아니어도 참여 가능. 온라인 진행.',
    eligibleGrades: [1, 2, 3, 4],
    eligibleMajors: [],
    interestTags: ['마케팅', '창업'],
    relatedGoals: ['교육 수강', '대외활동'],
    cost: 'free',
    online: true,
    deadlineOffsetDays: 6,
    deadlineTime: '12:00',
    eventStartOffsetDays: 7,
    eventEndOffsetDays: 7,
    eventStartTime: '14:00',
    eventEndTime: '16:00',
  },
  {
    id: 'N08',
    title: '창의공과대학 성적우수 장학금 신청',
    source: '학부공지 · 장학금',
    category: '장학금',
    summary: '직전 학기 성적 기준 충족 시 등록금 일부를 감면하는 교내 장학금.',
    detail:
      '직전 학기 15학점 이상 이수, 평점 3.5 이상인 공과대학 재학생 대상입니다. ON국민에서 신청하며, 서류 심사 후 선발합니다. 타 교내 장학과 중복 수혜는 제한될 수 있습니다.',
    eligibleGrades: [2, 3, 4],
    eligibleMajors: ['전자공학부', '기계공학부', '신소재공학부', '소프트웨어학부'],
    interestTags: [],
    relatedGoals: ['장학금 찾기'],
    cost: 'free',
    online: true,
    deadlineOffsetDays: 15,
    deadlineTime: '17:00',
    eventStartOffsetDays: null,
    eventEndOffsetDays: null,
  },
  {
    id: 'N09',
    title: 'SL이충곤재단 생활비 장학금 (공학계열)',
    source: '대표 홈페이지 · 장학공지',
    category: '장학금',
    summary: '공학계열 재학생 대상 생활비성 장학금. 소득 요건 확인 필요.',
    detail:
      '공학계열 학부 재학생 중 가계 소득 요건을 충족하는 학생에게 생활비를 지원합니다. 소득분위 증빙이 필요하며, 세부 자격은 재단 공고 원문을 확인해야 합니다.',
    eligibleGrades: [1, 2, 3, 4],
    eligibleMajors: ['전자공학부', '기계공학부', '신소재공학부', '소프트웨어학부'],
    eligibilityNote: '소득분위 등 세부 요건은 재단 공고 확인 필요',
    needsEligibilityCheck: true,
    interestTags: [],
    relatedGoals: ['장학금 찾기'],
    cost: 'free',
    online: true,
    deadlineOffsetDays: 20,
    deadlineTime: '18:00',
    eventStartOffsetDays: null,
    eventEndOffsetDays: null,
  },
  {
    id: 'N10',
    title: '대기업 취업 준비 특강 — 자소서·면접',
    source: '경력개발지원단 · 교육/행사',
    category: '교육',
    summary: '하반기 공채 대비 자기소개서 작성과 면접 대응 노하우 특강.',
    detail:
      '현직 인사담당자가 직무별 자소서 작성법과 실전 면접 대응을 안내합니다. 3·4학년 취업 준비생에게 특히 유용합니다. 오프라인 진행, 선착순 마감.',
    eligibleGrades: [3, 4],
    eligibleMajors: [],
    interestTags: ['마케팅'],
    relatedGoals: ['직무 탐색', '인턴 준비'],
    cost: 'free',
    online: false,
    location: '본부관 대강당',
    deadlineOffsetDays: 1,
    deadlineTime: '12:00',
    eventStartOffsetDays: 2,
    eventEndOffsetDays: 2,
    eventStartTime: '15:00',
    eventEndTime: '17:00',
  },
  {
    id: 'N11',
    title: '3D 프린팅 창작 경진대회',
    source: '전자공학부 · 교내외경진대회',
    category: '대외활동',
    summary: '아이디어를 3D 모델링·출력물로 구현해 겨루는 메이커 대회.',
    detail:
      '자유 주제로 3D 모델을 설계하고 출력물을 제출하는 대회입니다. 장비 대여 지원. 개인 참가 가능. 접수 마감일만 공지되어 있고 시상식 일정은 추후 안내됩니다.',
    eligibleGrades: [1, 2, 3, 4],
    eligibleMajors: [],
    interestTags: ['디자인', '공정·장비', '창업'],
    relatedGoals: ['대외활동'],
    cost: 'free',
    online: false,
    location: '창작공작소',
    deadlineOffsetDays: 14,
    // 시간 미명시 공지
    eventStartOffsetDays: null,
    eventEndOffsetDays: null,
  },
  {
    id: 'N12',
    title: '반도체 아카데미 산학 연계 프로그램 (대학원 대상)',
    source: '전자공학부 · 취업정보',
    category: '채용',
    summary: '반도체 기업 연구장학생 선발. 대학원 재학·수료생 대상.',
    detail:
      '반도체 기업이 대학원 재학생·박사 수료생을 연구장학생으로 선발합니다. 학부생은 지원 대상이 아닙니다. 장학금과 졸업 후 입사 기회를 제공합니다.',
    eligibleGrades: [],
    eligibleMajors: ['전자공학부', '신소재공학부'],
    eligibilityNote: '대학원 재학생·수료생 대상 (학부생 지원 불가)',
    undergradIneligible: true, // 학부 프로필에서는 추천 제외
    interestTags: ['반도체', '공정·장비'],
    relatedGoals: ['직무 탐색'],
    cost: 'free',
    online: true,
    deadlineOffsetDays: 10,
    deadlineTime: '10:00',
    eventStartOffsetDays: null,
    eventEndOffsetDays: null,
  },
  {
    id: 'N13',
    title: '[마감] 여름 클라우드 자격증 취득 캠프',
    source: '경력개발지원단 · 교육/행사',
    category: '교육',
    summary: 'AWS 클라우드 자격증 대비 집중 캠프 (이미 마감된 공지).',
    detail:
      'AWS 클라우드 프랙티셔너 자격증 취득을 목표로 한 집중 캠프였습니다. 접수가 마감되어 더 이상 신청할 수 없습니다. 다음 기수는 추후 공지됩니다.',
    eligibleGrades: [1, 2, 3, 4],
    eligibleMajors: [],
    interestTags: ['AI·데이터', '소프트웨어'],
    relatedGoals: ['교육 수강'],
    cost: 'free',
    online: true,
    deadlineOffsetDays: -3, // 이미 마감
    deadlineTime: '18:00',
    eventStartOffsetDays: -1,
    eventEndOffsetDays: -1,
    eventStartTime: '10:00',
    eventEndTime: '16:00',
  },
  {
    id: 'N14',
    title: '스마트팩토리 공정 데이터 분석 실습',
    source: 'SW중심대학사업단 · 교육/행사',
    category: '교육',
    summary: '제조 공정 데이터를 다루는 실습형 교육. 반도체·장비 관심자 추천.',
    detail:
      '스마트팩토리 센서·공정 데이터를 수집·분석하는 실습 교육입니다. Python 기초가 있으면 좋습니다. 오프라인 진행이며, 첫 회차가 평일 오전 수업 시간대와 겹칠 수 있습니다.',
    eligibleGrades: [2, 3, 4],
    eligibleMajors: ['전자공학부', '기계공학부', '소프트웨어학부'],
    interestTags: ['공정·장비', 'AI·데이터', '반도체'],
    relatedGoals: ['교육 수강', '직무 탐색'],
    cost: 'free',
    online: false,
    location: '공학관 302호',
    deadlineOffsetDays: 5,
    deadlineTime: '18:00',
    eventStartOffsetDays: 5,
    eventEndOffsetDays: 5,
    eventStartTime: '10:30',
    eventEndTime: '12:00',
    eventNote: '평일 오전 진행',
  },
]

/** 시드 + 최초 실행일로 실제 날짜가 채워진 공지 목록 생성 */
export function buildNotices(firstRunISO: string): Notice[] {
  return NOTICE_SEEDS.map((s) => {
    const deadline =
      s.deadlineOffsetDays === null
        ? null
        : buildDate(firstRunISO, s.deadlineOffsetDays, s.deadlineTime)
    const eventStart =
      s.eventStartOffsetDays === null
        ? null
        : buildDate(firstRunISO, s.eventStartOffsetDays, s.eventStartTime)
    const eventEnd =
      s.eventEndOffsetDays === null
        ? null
        : buildDate(firstRunISO, s.eventEndOffsetDays, s.eventEndTime)
    return {
      ...s,
      deadline,
      deadlineHasTime: Boolean(s.deadlineTime),
      eventStart,
      eventEnd,
      eventHasTime: Boolean(s.eventStartTime),
    }
  })
}

/**
 * 구글 캘린더 데모 일정(읽기 전용).
 * 예시 프로필 첫 주에 추천 행사와 겹치는 수업(N14 스마트팩토리 실습 등)을 포함한다.
 */
export function buildGoogleEvents(firstRunISO: string) {
  return [
    {
      id: 'G1',
      title: '전자기학 (전공 수업)',
      start: buildDate(firstRunISO, 5, '10:30'),
      end: buildDate(firstRunISO, 5, '12:00'),
      hasTime: true,
      location: '공학관 210호',
      origin: 'google' as const,
    },
    {
      id: 'G2',
      title: '팀 프로젝트 회의',
      start: buildDate(firstRunISO, 5, '19:00'),
      end: buildDate(firstRunISO, 5, '20:00'),
      hasTime: true,
      location: '중앙도서관 스터디룸',
      origin: 'google' as const,
    },
    {
      id: 'G3',
      title: '치과 예약',
      start: buildDate(firstRunISO, 2, '16:00'),
      end: buildDate(firstRunISO, 2, '16:40'),
      hasTime: true,
      location: '연세치과',
      origin: 'google' as const,
    },
    {
      id: 'G4',
      title: '동아리 정기 모임',
      start: buildDate(firstRunISO, 6, '18:00'),
      end: buildDate(firstRunISO, 6, '20:00'),
      hasTime: true,
      location: '학생회관 3층',
      origin: 'google' as const,
    },
  ]
}

import type { Interest, Goal, Category } from './types'

// 전체 기본 관심 분야(학과 미선택 등 폴백용)
export const INTEREST_OPTIONS: Interest[] = [
  '반도체',
  '공정·장비',
  '소프트웨어',
  'AI·데이터',
  '디자인',
  '마케팅',
  '창업',
]

/**
 * 학과별 추천 관심 키워드.
 * - 각 학과에 실제로 어울리는 키워드만 노출한다.
 * - 여기 나열된 키워드는 adaptNotices 의 INTEREST_MAP 에도 반영돼 공지 매칭에 사용된다.
 */
export const INTEREST_BY_MAJOR: Record<string, Interest[]> = {
  전자공학부: ['반도체', '공정·장비', '임베디드·펌웨어', '통신·네트워크', 'AI·데이터', '창업'],
  기계공학부: ['공정·장비', '기계·모빌리티', '생산·품질', '연구개발', 'AI·데이터', '창업'],
  신소재공학부: ['신소재', '반도체', '공정·장비', '생산·품질', '연구개발', '창업'],
  소프트웨어학부: ['소프트웨어', 'AI·데이터', '임베디드·펌웨어', '통신·네트워크', '디자인', '창업'],
  컴퓨터공학부: ['소프트웨어', 'AI·데이터', '통신·네트워크', '보안', '디자인', '창업'],
  경영학부: ['마케팅', '경영·기획', '금융·회계', 'AI·데이터', '창업'],
  시각디자인학과: ['디자인', '콘텐츠', '마케팅', '소프트웨어', '창업'],
}

// 학과 미선택 또는 목록에 없는 학과일 때 보여줄 기본 키워드
export const DEFAULT_INTERESTS: Interest[] = INTEREST_OPTIONS

/** 선택한 학과에 맞는 추천 관심 키워드 목록 반환 */
export function getInterestsForMajor(major: string): Interest[] {
  return INTEREST_BY_MAJOR[major] ?? DEFAULT_INTERESTS
}

export const GOAL_OPTIONS: Goal[] = [
  '교육 수강',
  '직무 탐색',
  '인턴 준비',
  '대외활동',
  '장학금 찾기',
]

export const MAJOR_OPTIONS: string[] = [
  '전자공학부',
  '기계공학부',
  '신소재공학부',
  '소프트웨어학부',
  '컴퓨터공학부',
  '경영학부',
  '시각디자인학과',
]

export const GRADE_OPTIONS = [1, 2, 3, 4]

// 요일 선택 옵션. value 는 JS Date.getDay() 기준(0=일 ~ 6=토), label 은 표시용.
// 화면에는 월~일 순서로 보여준다.
export const DAY_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 1, label: '월' },
  { value: 2, label: '화' },
  { value: 3, label: '수' },
  { value: 4, label: '목' },
  { value: 5, label: '금' },
  { value: 6, label: '토' },
  { value: 0, label: '일' },
]

export const CATEGORY_FILTERS: Array<'전체' | Category> = [
  '전체',
  '교육',
  '채용',
  '대외활동',
  '장학금',
]

export const EXAMPLE_PROFILE = {
  major: '전자공학부',
  grade: 3,
  interests: ['반도체', '공정·장비'] as Interest[],
  goals: ['직무 탐색', '교육 수강'] as Goal[],
  context: '학기 중이라 주말이나 온라인 프로그램을 선호해요.',
  availableDays: [], // 선택하지 않으면 요일 제한 없음
}

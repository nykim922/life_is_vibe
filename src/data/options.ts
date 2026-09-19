import type { Interest, Goal, Category } from './types'

export const INTEREST_OPTIONS: Interest[] = [
  '반도체',
  '공정·장비',
  '소프트웨어',
  'AI·데이터',
  '디자인',
  '마케팅',
  '창업',
]

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
}

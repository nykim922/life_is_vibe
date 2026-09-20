import { useMemo, useState } from 'react'
import type { Goal, Interest, Profile } from '../data/types'
import {
  GRADE_OPTIONS,
  GOAL_OPTIONS,
  MAJOR_OPTIONS,
  DAY_OPTIONS,
  getInterestsForMajor,
} from '../data/options'
import './ProfileForm.css'

interface Props {
  initial?: Profile | null
  submitLabel: string
  onSubmit: (profile: Profile) => void
  onCancel?: () => void
}

export function ProfileForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [major, setMajor] = useState<string>(initial?.major ?? MAJOR_OPTIONS[0])
  const [grade, setGrade] = useState<number>(initial?.grade ?? 1)
  const [interests, setInterests] = useState<Interest[]>(initial?.interests ?? [])
  const [goals, setGoals] = useState<Goal[]>(initial?.goals ?? [])
  const [context, setContext] = useState<string>(initial?.context ?? '')
  // 선택하지 않으면 요일 제한을 적용하지 않는다.
  const [availableDays, setAvailableDays] = useState<number[]>(
    initial?.availableDays ?? [],
  )

  // 직접 추가 키워드 입력 상태
  const [adding, setAdding] = useState(false)
  const [customInput, setCustomInput] = useState('')

  // 화면에 보여줄 관심 키워드 칩:
  // (선택 학과 추천 키워드) + (이미 선택했지만 추천 목록에 없는 커스텀 키워드)
  const interestChips = useMemo(() => {
    const recommended = getInterestsForMajor(major)
    const extras = interests.filter((it) => !recommended.includes(it))
    return [...recommended, ...extras]
  }, [major, interests])

  const toggleInterest = (v: Interest) =>
    setInterests((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]))
  const toggleGoal = (v: Goal) =>
    setGoals((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]))
  const toggleDay = (v: number) =>
    setAvailableDays((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]))

  const addCustomInterest = () => {
    const value = customInput.trim()
    if (!value) {
      setAdding(false)
      setCustomInput('')
      return
    }
    // 중복이면 선택만 보장, 아니면 추가하고 선택
    setInterests((cur) => (cur.includes(value) ? cur : [...cur, value]))
    setCustomInput('')
    setAdding(false)
  }

  const handleCustomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addCustomInterest()
    } else if (e.key === 'Escape') {
      setAdding(false)
      setCustomInput('')
    }
  }

  const hasPendingInterest = customInput.trim().length > 0
  const canSubmit = (interests.length > 0 || hasPendingInterest) && goals.length > 0

  const submit = () => {
    if (!canSubmit) return
    const pending = customInput.trim()
    const finalInterests =
      pending && !interests.includes(pending) ? [...interests, pending] : interests
    onSubmit({ major, grade, interests: finalInterests, goals, context: context.trim(), availableDays })
  }

  return (
    <div className="pform">
      <div className="pform__field">
        <label className="pform__label" htmlFor="major">
          전공
        </label>
        <select
          id="major"
          className="pform__select"
          value={major}
          onChange={(e) => setMajor(e.target.value)}
        >
          {MAJOR_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="pform__field">
        <span className="pform__label">학년</span>
        <div className="pform__grades" role="group" aria-label="학년 선택">
          {GRADE_OPTIONS.map((g) => (
            <button
              key={g}
              type="button"
              className={`pform__grade${grade === g ? ' is-on' : ''}`}
              aria-pressed={grade === g}
              onClick={() => setGrade(g)}
            >
              {g}학년
            </button>
          ))}
        </div>
      </div>

      <div className="pform__field">
        <span className="pform__label">
          참여 가능한 요일{' '}
          <span className="pform__hint">선택 안 하면 제한 없음 · 행사 추천에 반영</span>
        </span>
        <div className="pform__days" role="group" aria-label="참여 가능한 요일 선택">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              className={`pform__day${availableDays.includes(d.value) ? ' is-on' : ''}`}
              aria-pressed={availableDays.includes(d.value)}
              onClick={() => toggleDay(d.value)}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pform__field">
        <span className="pform__label">
          관심 분야 <span className="pform__hint">복수 선택 · 학과 추천</span>
        </span>
        <div className="pform__chips" role="group" aria-label="관심 분야 선택">
          {interestChips.map((it) => (
            <button
              key={it}
              type="button"
              className={`chip chip--toggle${interests.includes(it) ? ' is-on' : ''}`}
              aria-pressed={interests.includes(it)}
              onClick={() => toggleInterest(it)}
            >
              {it}
            </button>
          ))}

          {adding ? (
            <input
              className="pform__chip-input"
              type="text"
              value={customInput}
              autoFocus
              maxLength={20}
              placeholder="키워드 입력 후 Enter"
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={handleCustomKeyDown}
              onBlur={addCustomInterest}
            />
          ) : (
            <button
              type="button"
              className="chip chip--add"
              aria-label="관심 키워드 직접 추가"
              onClick={() => setAdding(true)}
            >
              <span className="chip__plus">+</span> 추가
            </button>
          )}
        </div>
      </div>

      <div className="pform__field">
        <span className="pform__label">
          현재 목표 <span className="pform__hint">복수 선택</span>
        </span>
        <div className="pform__chips" role="group" aria-label="현재 목표 선택">
          {GOAL_OPTIONS.map((g) => (
            <button
              key={g}
              type="button"
              className={`chip chip--toggle${goals.includes(g) ? ' is-on' : ''}`}
              aria-pressed={goals.includes(g)}
              onClick={() => toggleGoal(g)}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="pform__field">
        <label className="pform__label" htmlFor="context">
          추가 맥락 <span className="pform__hint">선택 입력</span>
        </label>
        <textarea
          id="context"
          className="pform__textarea"
          rows={3}
          placeholder="예) 학기 중이라 주말이나 온라인 프로그램을 선호해요."
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />
      </div>

      {!canSubmit && (
        <p className="pform__notice">관심 분야와 현재 목표를 각각 하나 이상 선택해 주세요.</p>
      )}

      <div className="pform__actions">
        {onCancel && (
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            취소
          </button>
        )}
        <button
          type="button"
          className="btn btn--primary btn--block"
          onClick={submit}
          disabled={!canSubmit}
        >
          {submitLabel}
        </button>
      </div>
    </div>
  )
}

import { useState } from 'react'
import type { Goal, Interest, Profile } from '../data/types'
import {
  GRADE_OPTIONS,
  GOAL_OPTIONS,
  INTEREST_OPTIONS,
  MAJOR_OPTIONS,
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

  const toggleInterest = (v: Interest) =>
    setInterests((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]))
  const toggleGoal = (v: Goal) =>
    setGoals((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]))

  const canSubmit = interests.length > 0 && goals.length > 0

  const submit = () => {
    if (!canSubmit) return
    onSubmit({ major, grade, interests, goals, context: context.trim() })
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
          관심 분야 <span className="pform__hint">복수 선택</span>
        </span>
        <div className="pform__chips" role="group" aria-label="관심 분야 선택">
          {INTEREST_OPTIONS.map((it) => (
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

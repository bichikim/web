/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import type {LanguageLearningCandidate} from '../candidate'
import {LanguageLearningReview} from '../Review'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const CANDIDATE = {
  audio: new Blob(['audio']),
  audioKey: 'audio-key',
  audioUrl: 'blob:audio',
  durationMs: 1000,
  id: 'candidate-1',
  modelId: 'full',
  segments: [],
  selected: true,
  text: 'I acknowledge the consequence.',
  voiceId: 'Yuna',
} satisfies LanguageLearningCandidate

it('should toggle, regenerate, and save a reviewed sentence', () => {
  const onRegenerate = vi.fn()
  const onSave = vi.fn()
  const onToggle = vi.fn()
  render(() => (
    <LanguageLearningReview
      busy={false}
      candidates={[CANDIDATE]}
      onRegenerate={onRegenerate}
      onSave={onSave}
      onToggle={onToggle}
      regeneratingCandidateId={null}
    />
  ))

  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByRole('button', {name: '목소리 다시 만들기'}))
  fireEvent.click(screen.getByRole('button', {name: '선택 문장 저장'}))

  expect(onToggle).toHaveBeenCalledWith('candidate-1')
  expect(onRegenerate).toHaveBeenCalledWith('candidate-1')
  expect(onSave).toHaveBeenCalledOnce()
  expect(screen.getByRole('button', {name: '선택 문장 저장'})).toHaveClass(
    'bg-highlight',
    'text-background',
  )
  expect(screen.getByText('1/1개 선택')).toBeDefined()
  expect(screen.getByText(CANDIDATE.text)).toBeDefined()
})

it('should disable review actions while a voice is being regenerated', () => {
  render(() => (
    <LanguageLearningReview
      busy
      candidates={[CANDIDATE]}
      onRegenerate={() => undefined}
      onSave={() => undefined}
      onToggle={() => undefined}
      regeneratingCandidateId="candidate-1"
    />
  ))

  expect(screen.getByRole('checkbox')).toBeDisabled()
  expect(screen.getByRole('button', {name: '목소리 다시 만드는 중…'})).toBeDisabled()
  expect(screen.getByRole('button', {name: '선택 문장 저장'})).toBeDisabled()
})

it('should retain checkbox focus and audio position when a candidate selection changes', () => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
  const [candidates, setCandidates] = createSignal<ReadonlyArray<LanguageLearningCandidate>>([
    CANDIDATE,
  ])
  render(() => (
    <LanguageLearningReview
      busy={false}
      candidates={candidates()}
      onRegenerate={vi.fn()}
      onSave={vi.fn()}
      regeneratingCandidateId={null}
      onToggle={(id) =>
        setCandidates((current) =>
          current.map((candidate) =>
            candidate.id === id ? {...candidate, selected: !candidate.selected} : candidate,
          ),
        )
      }
    />
  ))
  const checkbox = screen.getByRole('checkbox', {name: CANDIDATE.text})
  const row = checkbox.closest('li')!
  const audio = row.querySelector('audio')!
  audio.currentTime = 0.5
  checkbox.focus()
  fireEvent.click(checkbox)
  expect(screen.getByRole('checkbox', {name: CANDIDATE.text})).toBe(checkbox)
  expect(checkbox).toHaveFocus()
  expect(checkbox).not.toBeChecked()
  expect(row.querySelector('audio')).toBe(audio)
  expect(audio.currentTime).toBe(0.5)
  expect(screen.getByText('0/1개 선택')).toBeVisible()
  setCandidates([{...CANDIDATE, audioUrl: 'blob:regenerated', text: 'New sentence'}])
  expect(screen.getByRole('checkbox', {name: 'New sentence'})).toBe(checkbox)
  expect(audio).toHaveAttribute('src', 'blob:regenerated')
})

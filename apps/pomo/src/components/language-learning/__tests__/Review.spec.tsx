/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {type LanguageLearningCandidate, LanguageLearningReview} from '../Review'

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

/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, it} from 'vitest'

import type {TextMoodAnalysis} from 'src/features/text-mood'
import {TextMoodAnalysisResult} from '../AnalysisResult'

const ANALYSIS: TextMoodAnalysis = {
  margin: 0.08,
  modifiers: [
    {active: true, id: 'sarcastic', probability: 0.72, threshold: 0.1},
    {active: false, id: 'playful', probability: 0.04, threshold: 0.15},
  ],
  primary: {id: 'angry', probability: 0.46},
  scores: [
    {id: 'angry', probability: 0.46},
    {id: 'sad', probability: 0.38},
    {id: 'neutral', probability: 0.16},
  ],
  secondary: {id: 'sad', probability: 0.38},
  uncertain: true,
}

it('should render primary, secondary, modifier, and uncertainty results', () => {
  const {container} = render(() => <TextMoodAnalysisResult analysis={ANALYSIS} />)

  expect(screen.getByRole('heading', {name: '분노·적대'})).toBeTruthy()
  expect(screen.getByText('판단 경계')).toBeTruthy()
  expect(screen.getByText('슬픔·우울')).toBeTruthy()
  expect(screen.getByText('냉소·비꼼')).toBeTruthy()
  expect(screen.getByText('감지됨 · 72%')).toBeTruthy()
  expect(screen.getByRole('heading', {name: '전체 분위기 점수'})).toBeTruthy()
  const scoreFill = container.querySelector<HTMLElement>('[style*="--pomo-progress-width"]')
  expect(scoreFill?.style.getPropertyValue('--pomo-progress-width')).toBe('46%')
  expect(scoreFill?.style.width).toBe('')
  expect(scoreFill).toHaveClass('[width:var(--pomo-progress-width)]')
})

it('should render a certain result without a secondary mood', () => {
  render(() => (
    <TextMoodAnalysisResult analysis={{...ANALYSIS, secondary: null, uncertain: false}} />
  ))

  expect(screen.queryByText('판단 경계')).toBeNull()
  expect(screen.queryByText('가까운 분위기')).toBeNull()
  expect(screen.getByRole('heading', {name: '분노·적대'})).toBeTruthy()
})

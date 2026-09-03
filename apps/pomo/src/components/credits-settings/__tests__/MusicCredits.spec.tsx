/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, it} from 'vitest'

import {type PMusicCredit, PMusicCredits} from '../MusicCredits'

const MUSIC_CREDITS = Array.from({length: 5}, (_, index) => ({
  artistName: `Artist ${index + 1}`,
  contributorName: `Contributor ${index + 1}`,
  role: '음악 제작',
})) satisfies ReadonlyArray<PMusicCredit>

it('should show four credits before expanding and collapse the list again', () => {
  render(() => <PMusicCredits entries={MUSIC_CREDITS} />)

  expect(screen.getByText('Contributor 1 · 음악 제작')).toBeTruthy()
  const fourthCredit = screen.getByRole('heading', {name: 'Artist 4'}).closest('li')
  expect(fourthCredit?.className).toContain('rounded-panel')
  expect(fourthCredit).toHaveClass('border-content-border', 'bg-content-surface')
  expect(screen.queryByRole('heading', {name: 'Artist 5'})).toBeNull()

  const expandButton = screen.getByRole('button', {name: '모두 보기 (+1)'})
  expect(expandButton.getAttribute('aria-expanded')).toBe('false')
  fireEvent.click(expandButton)

  expect(screen.getByRole('heading', {name: 'Artist 5'})).toBeTruthy()
  const collapseButton = screen.getByRole('button', {name: '접기'})
  expect(collapseButton.getAttribute('aria-expanded')).toBe('true')
  fireEvent.click(collapseButton)

  expect(screen.queryByRole('heading', {name: 'Artist 5'})).toBeNull()
})

it('should hide the toggle when four or fewer credits exist', () => {
  render(() => <PMusicCredits entries={MUSIC_CREDITS.slice(0, 4)} />)

  expect(screen.queryByRole('button')).toBeNull()
})

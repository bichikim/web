/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, it} from 'vitest'

import {DialogueLibraryItem} from '../LibraryItem'

it('should share dialogue text, metadata, and actions in one library item', () => {
  render(() => (
    <ul>
      <DialogueLibraryItem
        actions={<button type="button">듣기</button>}
        metadata="사용 단어: home, wave"
        text="I feel at home here."
      />
    </ul>
  ))

  expect(screen.getByText('I feel at home here.').getAttribute('title')).toBe(
    'I feel at home here.',
  )
  expect(screen.getByText('사용 단어: home, wave')).toBeDefined()
  expect(screen.getByRole('button', {name: '듣기'})).toBeDefined()
  expect(screen.getByText('I feel at home here.').closest('li')).toHaveClass(
    'border-content-border',
    'bg-content-surface',
  )
  expect(
    screen
      .getByText('I feel at home here.')
      .closest('.pomo-dialogue-settings__selected-dialogue--library')?.className,
  ).toContain('flex-col')
  expect(screen.getByText('I feel at home here.').className).toContain('[-webkit-line-clamp:3]')
})

it('should support six visible text lines for learning dialogues', () => {
  render(() => (
    <ul>
      <DialogueLibraryItem lineLimit="six" text="Long learning dialogue" />
    </ul>
  ))

  const text = screen.getByText('Long learning dialogue')

  expect(text.className).toContain('[-webkit-line-clamp:6]')
  expect(text.className).not.toContain('[-webkit-line-clamp:3]')
})

it('should limit long dialogue titles to 80 characters', () => {
  const boundaryText = '가'.repeat(80)
  const longText = '나'.repeat(81)

  render(() => (
    <ul>
      <DialogueLibraryItem text={boundaryText} />
      <DialogueLibraryItem text={longText} />
    </ul>
  ))

  expect(screen.getByText(boundaryText).getAttribute('title')).toBe(boundaryText)
  expect(screen.getByText(longText).getAttribute('title')).toBe(`${'나'.repeat(79)}…`)
})

it('should render a useful text-only item when optional regions are omitted', () => {
  const result = render(() => (
    <ul>
      <DialogueLibraryItem text="Text only" />
    </ul>
  ))

  expect(screen.getByText('Text only')).toBeDefined()
  expect(result.container.querySelectorAll('span')).toHaveLength(0)
  expect(result.container.querySelectorAll('button, a')).toHaveLength(0)
})

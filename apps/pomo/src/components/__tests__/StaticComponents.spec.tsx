/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import {TextMoodCard} from '../dev/home/TextMoodCard'
import {DirectAnswerHeader} from '../dialogue-writer/AnswerHeader'
import {PDialogueSettings} from '../PDialogueSettings'
import {PPanel} from '../PPanel'
import {TextMoodInsufficientResult} from '../text-mood-lab/InsufficientResult'
import {VoiceHeader} from '../voice-generator/Header'
import {ModelPicker} from '../voice-generator/ModelPicker'
import {TextMoodEvaluation} from '../text-mood-lab/Evaluation'

vi.mock('@solidjs/router', () => ({
  A: (props: {children?: JSX.Element; href: string}) => <a href={props.href}>{props.children}</a>,
}))
vi.mock('../dialogue-settings/Panel', () => ({
  PDialogueSettingsPanel: (props: {onRequestClose?: () => void}) => (
    <button onClick={() => props.onRequestClose?.()} type="button">
      dialogue settings
    </button>
  ),
}))

afterEach(() => {
  vi.clearAllMocks()
})

it('should forward dialogue settings close requests', () => {
  const onRequestClose = vi.fn()
  const result = render(() => <PDialogueSettings onRequestClose={onRequestClose} />)

  fireEvent.click(screen.getByRole('button', {name: 'dialogue settings'}))
  expect(onRequestClose).toHaveBeenCalledOnce()

  result.unmount()
  render(() => <PDialogueSettings />)
  fireEvent.click(screen.getByRole('button', {name: 'dialogue settings'}))
})

it('should render panel content with default and explicit variants', () => {
  const result = render(() => <PPanel>default panel</PPanel>)

  expect(screen.getByText('default panel').className).toContain('p-3')
  result.unmount()
  render(() => (
    <PPanel class="custom-panel" padding="spacious" tone="strong">
      strong panel
    </PPanel>
  ))
  expect(screen.getByText('strong panel').className).toContain('custom-panel')
})

it.each([
  [DirectAnswerHeader, '같은 요청으로 다섯 모델을 비교해 보세요'],
  [TextMoodInsufficientResult, '조금 더 구체적으로 적어 주세요'],
  [VoiceHeader, '캐릭터의 목소리를 만들어 보세요'],
] as const)('should render static component copy', (Component, copy) => {
  render(() => <Component />)

  expect(screen.getByText(copy)).toBeDefined()
})

it('should link to the text mood lab', () => {
  render(() => <TextMoodCard />)

  expect(screen.getByRole('link', {name: /글 분위기 분석/}).getAttribute('href')).toBe(
    '/dev/text-mood',
  )
})

it('should render text mood evaluation metrics', () => {
  render(() => <TextMoodEvaluation />)

  expect(screen.getByRole('heading', {name: '현재 파일럿 성능'})).toBeDefined()
  expect(screen.getByText('Macro F1')).toBeDefined()
  expect(screen.getByText(/mean pooling/)).toBeDefined()
})

it('should select and disable voice models', () => {
  const onModelChange = vi.fn()
  const result = render(() => (
    <ModelPicker disabled={false} onModelChange={onModelChange} selectedModelId="full" />
  ))
  const buttons = screen.getAllByRole('button')

  expect(buttons.length).toBeGreaterThan(1)
  expect(buttons[0]).toHaveAttribute('aria-pressed', 'true')
  expect(buttons[1]).toHaveAttribute('aria-pressed', 'false')
  fireEvent.click(buttons[1]!)
  expect(onModelChange).toHaveBeenCalledOnce()

  result.unmount()
  render(() => <ModelPicker disabled onModelChange={onModelChange} selectedModelId="full" />)
  expect(screen.getAllByRole('button').every((button) => button.hasAttribute('disabled'))).toBe(
    true,
  )
})

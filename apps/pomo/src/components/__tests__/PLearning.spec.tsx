/** @vitest-environment jsdom */

import {Tabs} from '@kobalte/core/tabs'
import {fireEvent, render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {PModal, type PModalProps} from 'src/components/PModal'
import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import {PIconButton} from '../PIconButton'
import {PLearning} from '../PLearning'
import {PScribbleCircleControl} from '../scribble/CircleControl'

vi.mock('@kobalte/core/tabs', () => ({Tabs: vi.fn()}))
vi.mock('../PModal', () => ({PModal: vi.fn()}))
vi.mock('../PIconButton', () => ({PIconButton: vi.fn()}))
vi.mock('../language-learning/Library', () => ({
  LanguageLearningLibrary: () => <div>language learning library</div>,
}))
vi.mock('../language-learning/Words', () => ({
  LanguageLearningWords: () => <div>language learning words</div>,
}))
vi.mock('../scribble/CircleControl', () => ({PScribbleCircleControl: vi.fn()}))

interface TabsRootProps {
  readonly children?: JSX.Element
  readonly class?: string
  readonly value?: string
}

const originalGetLocale = getLocale

beforeEach(() => {
  vi.clearAllMocks()
  overwriteGetLocale(() => 'ko')
  Object.assign(Tabs, {
    Content: (props: {children: JSX.Element}) => <>{props.children}</>,
    List: (props: {
      readonly 'aria-label': string
      readonly children: JSX.Element
      readonly class?: string
    }) => (
      <div aria-label={props['aria-label']} class={props.class} role="tablist">
        {props.children}
      </div>
    ),
    Trigger: (props: {children: JSX.Element; class?: string}) => (
      <button class={props.class} role="tab" type="button">
        {props.children}
      </button>
    ),
  })
  vi.mocked(Tabs).mockImplementation((props: TabsRootProps) => <>{props.children}</>)
  vi.mocked(PModal).mockImplementation((props: PModalProps) => (
    <div aria-label={props.title} hidden={!props.isOpen} role="dialog">
      {props.navigation}
      {props.children}
      <button onClick={props.onCloseAutoFocus} type="button">
        Restore focus
      </button>
    </div>
  ))
  vi.mocked(PIconButton).mockImplementation((props) => (
    <button onClick={(event) => props.onPress(event.currentTarget)} type="button">
      {props.accessibleLabel}
    </button>
  ))
  vi.mocked(PScribbleCircleControl).mockImplementation((props) => <>{props.children}</>)
})

afterEach(() => {
  overwriteGetLocale(originalGetLocale)
})

it('should open a Korean learning modal', () => {
  render(() => <PLearning />)

  const trigger = screen.getByRole('button', {name: '언어 학습 열기'})
  fireEvent.click(trigger)

  expect(screen.getByRole('dialog', {name: 'Pomofi 언어 학습'}).hasAttribute('hidden')).toBe(false)
  expect(Tabs).toHaveBeenCalledWith(expect.objectContaining({class: 'contents'}))
  expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
    '학습 문장',
    '학습 단어',
  ])
  expect(screen.getByRole('tablist', {name: '언어 학습 종류'}).className).toContain(
    'pomo-learning__tabs',
  )
  expect(screen.getAllByRole('tab')[0]?.className).toContain('ui-selected:shadow-tab-active')
  expect(screen.getByText('language learning library')).toBeInTheDocument()
  expect(screen.getByText('language learning words')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', {name: 'Restore focus'}))
  expect(document.activeElement).toBe(trigger)
})

it('should open an English learning modal', () => {
  overwriteGetLocale(() => 'en')
  render(() => <PLearning />)

  fireEvent.click(screen.getByRole('button', {name: 'Open language learning'}))

  expect(
    screen.getByRole('dialog', {name: 'Pomofi language learning'}).hasAttribute('hidden'),
  ).toBe(false)
  expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
    'Learning sentences',
    'Learning words',
  ])
})

/** @vitest-environment jsdom */

import {Tabs} from '@kobalte/core/tabs'
import {fireEvent, render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import {PModal, type PModalProps} from 'src/components/p-modal/PModal'

import {PButton} from '../../p-button/PButton'
import {PMemoryAssist} from '../PMemoryAssist'
import {LanguageLearningLibrary} from '../../language-learning/Library'
import {PModelDownloadProvider} from '../../../features/model-download'

import {PScribbleCircleControl} from '../../scribble/CircleControl'

vi.mock('@kobalte/core/tabs', () => ({Tabs: vi.fn()}))
vi.mock('../../p-modal/PModal', () => ({PModal: vi.fn()}))
vi.mock('../../calendar-connections/CalendarConnections', () => ({
  CalendarConnections: vi.fn(() => <div>calendar connections</div>),
}))
vi.mock('../../calendar-month/CalendarMonth', () => ({
  CalendarMonth: vi.fn((props: {settings?: JSX.Element}) => (
    <div>
      calendar month
      {props.settings}
    </div>
  )),
}))
vi.mock('../../p-button/PButton', () => ({PButton: vi.fn()}))
vi.mock('../../language-learning/Library', () => ({
  LanguageLearningLibrary: vi.fn(),
}))
vi.mock('../../language-learning/Words', () => ({
  LanguageLearningWords: () => <div>language learning words</div>,
}))
vi.mock('../../memory-assist/Memos', () => ({
  MemoryMemoList: vi.fn(() => <div>memory memos</div>),
}))
vi.mock('../../memory-assist/PictureDiary', () => ({
  PictureDiary: vi.fn(() => <div>picture diary</div>),
}))
vi.mock('../../scribble/CircleControl', () => ({PScribbleCircleControl: vi.fn()}))

interface TabsRootProps {
  readonly children?: JSX.Element
  readonly class?: string
  readonly onChange?: (value: string) => void
  readonly value?: string
}

const originalGetLocale = getLocale

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
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
  vi.mocked(Tabs).mockImplementation((props: TabsRootProps) => (
    <div data-value={props.value}>
      {props.children}
      <button onClick={() => props.onChange?.('words')} type="button">
        Change tab
      </button>
      <button onClick={() => props.onChange?.('calendar')} type="button">
        Change to calendar
      </button>
    </div>
  ))
  vi.mocked(LanguageLearningLibrary).mockImplementation((props) => (
    <button onClick={props.onRequestClose} type="button">
      language learning library
    </button>
  ))
  vi.mocked(PModal).mockImplementation((props: PModalProps) => (
    <div aria-label={props.title} hidden={!props.isOpen} role="dialog">
      {props.navigation}
      {props.children}
      <button onClick={props.onCloseAutoFocus} type="button">
        Restore focus
      </button>
      <button onClick={() => props.onOpenChange(false)} type="button">
        Close modal
      </button>
    </div>
  ))
  vi.mocked(PButton).mockImplementation((props) => (
    <button onClick={(event) => props.onPress?.(event.currentTarget)} type="button">
      {props.accessibleLabel}
      <span aria-hidden="true">
        {props.tooltip} {props.icon}
      </span>
    </button>
  ))
  vi.mocked(PScribbleCircleControl).mockImplementation((props) => (
    <div data-enabled={String(props.enabled)}>{props.children}</div>
  ))
})

afterEach(() => {
  overwriteGetLocale(originalGetLocale)
})

it('should use the scribble brain icon in scribble scenes', () => {
  render(() => (
    <PModelDownloadProvider>
      <PMemoryAssist sceneStyle="scribble" />
    </PModelDownloadProvider>
  ))

  expect(PButton).toHaveBeenCalledWith(expect.objectContaining({icon: 'i-pomo-scribble:brain'}))
  expect(PScribbleCircleControl).toHaveBeenCalledWith(expect.objectContaining({enabled: true}))
})

it('should open an English thinking space modal', () => {
  overwriteGetLocale(() => 'en')
  render(() => (
    <PModelDownloadProvider>
      <PMemoryAssist />
    </PModelDownloadProvider>
  ))

  fireEvent.click(screen.getByRole('button', {name: 'Open thinking space'}))

  expect(screen.getByRole('dialog', {name: 'Pomofi thinking space'}).hasAttribute('hidden')).toBe(
    false,
  )
  expect(PButton).toHaveBeenCalledWith(
    expect.objectContaining({
      accessibleLabel: 'Open thinking space',
      tooltip: 'Open thinking space',
    }),
  )
  expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
    'Learning sentences',
    'Learning words',
    'Memos',
    'Diary',
    'Calendar',
    'Tarot',
  ])
})

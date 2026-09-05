/** @vitest-environment jsdom */

import {Tabs} from '@kobalte/core/tabs'
import {fireEvent, render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {PModal, type PModalProps} from 'src/components/PModal'
import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import {CalendarConnections} from '../CalendarConnections'
import {CalendarMonth} from '../CalendarMonth'
import {PIconButton} from '../PIconButton'
import {PMemoryAssist} from '../PMemoryAssist'
import {LanguageLearningLibrary} from '../language-learning/Library'
import {MemoryMemoList} from '../memory-assist/Memos'
import {PictureDiary} from '../memory-assist/PictureDiary'
import {PScribbleCircleControl} from '../scribble/CircleControl'

vi.mock('@kobalte/core/tabs', () => ({Tabs: vi.fn()}))
vi.mock('../PModal', () => ({PModal: vi.fn()}))
vi.mock('../CalendarConnections', () => ({
  CalendarConnections: vi.fn(() => <div>calendar connections</div>),
}))
vi.mock('../CalendarMonth', () => ({
  CalendarMonth: vi.fn((props: {settings?: JSX.Element}) => (
    <div>
      calendar month
      {props.settings}
    </div>
  )),
}))
vi.mock('../PIconButton', () => ({PIconButton: vi.fn()}))
vi.mock('../language-learning/Library', () => ({
  LanguageLearningLibrary: vi.fn(),
}))
vi.mock('../language-learning/Words', () => ({
  LanguageLearningWords: () => <div>language learning words</div>,
}))
vi.mock('../memory-assist/Memos', () => ({
  MemoryMemoList: vi.fn(() => <div>memory memos</div>),
}))
vi.mock('../memory-assist/PictureDiary', () => ({
  PictureDiary: vi.fn(() => <div>picture diary</div>),
}))
vi.mock('../scribble/CircleControl', () => ({PScribbleCircleControl: vi.fn()}))

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
  vi.mocked(PIconButton).mockImplementation((props) => (
    <button onClick={(event) => props.onPress(event.currentTarget)} type="button">
      {props.accessibleLabel}
      <span aria-hidden="true">
        {props.feedback} {props.icon}
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

it('should open a Korean memory assist modal', () => {
  const weatherState = {status: 'disabled'} as const
  render(() => <PMemoryAssist weatherState={weatherState} />)

  const trigger = screen.getByRole('button', {name: '기억 보조 열기'})
  fireEvent.click(trigger)

  expect(screen.getByRole('dialog', {name: 'Pomofi 기억 보조'}).hasAttribute('hidden')).toBe(false)
  expect(PIconButton).toHaveBeenCalledWith(
    expect.objectContaining({
      accessibleLabel: '기억 보조 열기',
      feedback: '기억 보조',
      icon: 'i-tabler-brain',
    }),
  )
  expect(PModal).toHaveBeenCalledWith(expect.objectContaining({size: 'expanded'}))
  expect(Tabs).toHaveBeenCalledWith(expect.objectContaining({class: 'contents'}))
  expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
    '학습 문장',
    '학습 단어',
    '메모',
    '일기장',
    '캘린더',
  ])
  expect(screen.getByRole('tablist', {name: '기억 보조 종류'}).className).toContain(
    'pomo-memory-assist__tabs',
  )
  expect(screen.getAllByRole('tab')[0]?.className).toContain('ui-selected:shadow-tab-active')
  expect(screen.getByText('language learning library')).toBeInTheDocument()
  expect(screen.getByText('language learning words')).toBeInTheDocument()
  expect(screen.getByText('memory memos')).toBeInTheDocument()
  expect(screen.getByText('calendar connections')).toBeInTheDocument()
  expect(screen.getByText('calendar month')).toBeInTheDocument()
  expect(CalendarConnections).toHaveBeenCalledWith(
    expect.objectContaining({onConnectionsChange: expect.any(Function)}),
  )
  expect(CalendarMonth).toHaveBeenCalledWith(expect.objectContaining({revision: 0}))
  expect(MemoryMemoList).toHaveBeenCalled()
  expect(PictureDiary).toHaveBeenCalledWith(expect.objectContaining({weatherState}))

  fireEvent.click(screen.getByRole('button', {name: 'Change to calendar'}))
  expect(CalendarMonth).toHaveBeenLastCalledWith(expect.objectContaining({revision: 1}))
  fireEvent.click(screen.getByRole('button', {name: 'Close modal'}))
  fireEvent.click(trigger)
  expect(CalendarMonth).toHaveBeenLastCalledWith(expect.objectContaining({revision: 2}))

  sessionStorage.setItem('pomo:calendar-month-cache:v1', 'cached')
  const connectionProps = vi.mocked(CalendarConnections).mock.calls[0]?.[0]
  connectionProps?.onConnectionsChange?.()
  expect(sessionStorage.getItem('pomo:calendar-month-cache:v1')).toBeNull()
  expect(CalendarMonth).toHaveBeenLastCalledWith(expect.objectContaining({revision: 3}))

  fireEvent.click(screen.getByRole('button', {name: 'Restore focus'}))
  expect(document.activeElement).toBe(trigger)
  fireEvent.click(screen.getByRole('button', {name: 'language learning library'}))
  fireEvent.click(screen.getByRole('button', {hidden: true, name: 'Close modal'}))
  fireEvent.click(screen.getByRole('button', {name: 'Change tab'}))
})

it('should use the scribble brain icon in scribble scenes', () => {
  render(() => <PMemoryAssist sceneStyle="scribble" />)

  expect(PIconButton).toHaveBeenCalledWith(expect.objectContaining({icon: 'i-pomo-scribble:brain'}))
  expect(PScribbleCircleControl).toHaveBeenCalledWith(expect.objectContaining({enabled: true}))
})

it('should open an English memory assist modal', () => {
  overwriteGetLocale(() => 'en')
  render(() => <PMemoryAssist />)

  fireEvent.click(screen.getByRole('button', {name: 'Open memory aid'}))

  expect(screen.getByRole('dialog', {name: 'Pomofi memory aid'}).hasAttribute('hidden')).toBe(false)
  expect(PIconButton).toHaveBeenCalledWith(
    expect.objectContaining({accessibleLabel: 'Open memory aid', feedback: 'Memory aid'}),
  )
  expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
    'Learning sentences',
    'Learning words',
    'Memos',
    'Diary',
    'Calendar',
  ])
})

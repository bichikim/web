/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import {PreferenceProvider} from 'src/hooks/use-preference'
import {CalendarConnections} from '../../calendar-connections/CalendarConnections'
import {CalendarMonth} from '../../calendar-month/CalendarMonth'
import {LanguageLearningLibrary} from '../../language-learning/Library'
import {LanguageLearningWords} from '../../language-learning/Words'
import {MemoryMemoList} from '../../memory-assist/Memos'
import {PictureDiary} from '../../memory-assist/PictureDiary'
import {PModelDownloadProvider} from '../../../features/model-download'
import {PMemoryAssist} from '../PMemoryAssist'

vi.mock('../../calendar-connections/CalendarConnections', () => ({CalendarConnections: vi.fn()}))
vi.mock('../../calendar-month/CalendarMonth', () => ({CalendarMonth: vi.fn()}))
vi.mock('../../language-learning/Library', () => ({LanguageLearningLibrary: vi.fn()}))
vi.mock('../../language-learning/Words', () => ({LanguageLearningWords: vi.fn()}))
vi.mock('../../memory-assist/Memos', () => ({MemoryMemoList: vi.fn()}))
vi.mock('../../memory-assist/PictureDiary', () => ({PictureDiary: vi.fn()}))

const originalGetLocale = getLocale

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  overwriteGetLocale(() => 'ko')
  vi.stubGlobal(
    'ResizeObserver',
    class {
      disconnect = vi.fn()
      observe = vi.fn()
    },
  )
  const readStyles = globalThis.getComputedStyle.bind(globalThis)
  vi.spyOn(globalThis, 'getComputedStyle').mockImplementation((element) => {
    const styles = readStyles(element)
    Object.defineProperty(styles, 'animationName', {configurable: true, value: 'none'})
    return styles
  })
  vi.mocked(LanguageLearningLibrary).mockImplementation(() => <p>language learning library</p>)
  vi.mocked(LanguageLearningWords).mockImplementation(() => <p>language learning words</p>)
  vi.mocked(MemoryMemoList).mockImplementation(() => <p>memory memos</p>)
  vi.mocked(PictureDiary).mockImplementation(() => <p>picture diary</p>)
  vi.mocked(CalendarConnections).mockImplementation((props) => (
    <button onClick={props.onConnectionsChange} type="button">
      Update calendar connections
    </button>
  ))
  vi.mocked(CalendarMonth).mockImplementation((props) => (
    <div>
      calendar month
      {props.settings}
    </div>
  ))
})

afterEach(() => {
  overwriteGetLocale(originalGetLocale)
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('should switch Korean panels, refresh the calendar and restore focus after closing', async () => {
  await import('../../memory-assist/Content')
  const weatherState = {status: 'disabled'} as const
  render(
    () => (
      <PModelDownloadProvider>
        <PMemoryAssist weatherState={weatherState} />
      </PModelDownloadProvider>
    ),
    {wrapper: PreferenceProvider},
  )

  const trigger = screen.getByRole('button', {name: '생각 보조'})
  fireEvent.click(trigger)
  const dialog = await screen.findByRole('dialog', {name: 'Pomofi 생각 보조'})
  expect(dialog).toBeVisible()
  expect(dialog).toHaveAttribute('data-size', 'expanded')
  expect(within(dialog).getByRole('tablist', {name: '생각 보조 종류'})).toBeInTheDocument()
  expect(
    within(dialog)
      .getAllByRole('tab')
      .map((tab) => tab.textContent),
  ).toEqual(['학습 문장', '학습 단어', '메모', '일기장', '캘린더', '타로', '사주'])
  expect(await screen.findByRole('tabpanel', {name: '학습 문장'})).toHaveTextContent(
    'language learning library',
  )
  expect(screen.queryByRole('tabpanel', {name: '학습 단어'})).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('tab', {name: '학습 단어'}))
  expect(await screen.findByRole('tabpanel', {name: '학습 단어'})).toHaveTextContent(
    'language learning words',
  )
  expect(screen.queryByRole('tabpanel', {name: '학습 문장'})).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('tab', {name: '메모'}))
  expect(await screen.findByRole('tabpanel', {name: '메모'})).toHaveTextContent('memory memos')
  fireEvent.click(screen.getByRole('tab', {name: '일기장'}))
  expect(await screen.findByRole('tabpanel', {name: '일기장'})).toHaveTextContent('picture diary')
  expect(PictureDiary).toHaveBeenCalledWith(expect.objectContaining({weatherState}))

  fireEvent.click(screen.getByRole('tab', {name: '캘린더'}))
  expect(await screen.findByRole('tabpanel', {name: '캘린더'})).toHaveTextContent('calendar month')
  expect(screen.getByRole('tab', {name: '캘린더'})).toHaveAttribute('aria-selected', 'true')
  expect(CalendarMonth).toHaveBeenLastCalledWith(expect.objectContaining({revision: 1}))
  fireEvent.click(within(dialog).getByRole('button', {name: '닫기'}))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  await waitFor(() => expect(trigger).toHaveFocus())

  fireEvent.click(trigger)
  await screen.findByRole('tabpanel', {name: '캘린더'})
  expect(CalendarMonth).toHaveBeenLastCalledWith(expect.objectContaining({revision: 2}))
  sessionStorage.setItem('pomo:calendar-month-cache:v1', 'cached')
  fireEvent.click(screen.getByRole('button', {name: 'Update calendar connections'}))
  expect(sessionStorage.getItem('pomo:calendar-month-cache:v1')).toBeNull()
  expect(CalendarMonth).toHaveBeenLastCalledWith(expect.objectContaining({revision: 3}))

  const calendarTab = screen.getByRole('tab', {name: '캘린더'})
  calendarTab.focus()
  fireEvent.keyDown(calendarTab, {key: 'Escape'})
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  await waitFor(() => expect(trigger).toHaveFocus())
})

/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {Suspense} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import {useAuth} from '../../../features/auth/AuthProvider'
import {
  listCalendarConnections,
  listCalendarEvents,
  writeCalendarMonthCache,
} from '../../../features/calendar'
import {LanguageLearningLibrary} from '../../language-learning/Library'
import {LanguageLearningWords} from '../../language-learning/Words'
import {MemoryMemoList} from '../../memory-assist/Memos'
import {PictureDiary} from '../../memory-assist/PictureDiary'
import {PMemoryAssist} from '../PMemoryAssist'
import {PModelDownloadProvider} from '../../../features/model-download'

vi.mock('../../../features/auth/AuthProvider', () => ({useAuth: vi.fn()}))
vi.mock('../../../features/calendar', async () => {
  const actual = await vi.importActual('../../../features/calendar')
  return {...actual, listCalendarConnections: vi.fn(), listCalendarEvents: vi.fn()}
})
vi.mock('../../calendar-alarm-control/CalendarAlarmControl', () => ({
  CalendarAlarmControl: vi.fn(),
}))
vi.mock('../../language-learning/Library', () => ({LanguageLearningLibrary: vi.fn()}))
vi.mock('../../language-learning/Words', () => ({LanguageLearningWords: vi.fn()}))
vi.mock('../../memory-assist/Memos', () => ({MemoryMemoList: vi.fn()}))
vi.mock('../../memory-assist/PictureDiary', () => ({PictureDiary: vi.fn()}))

const originalGetLocale = getLocale

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      disconnect = vi.fn()
      observe = vi.fn()
    },
  )
  vi.clearAllMocks()
  const readStyles = globalThis.getComputedStyle.bind(globalThis)
  vi.spyOn(globalThis, 'getComputedStyle').mockImplementation((element) => {
    const styles = readStyles(element)
    Object.defineProperty(styles, 'animationName', {configurable: true, value: 'none'})
    return styles
  })
  sessionStorage.clear()
  overwriteGetLocale(() => 'ko')
  vi.mocked(useAuth).mockReturnValue({
    session: () => ({email: 'person@example.com', kind: 'authenticated', provider: 'email'}),
    state: () => ({email: 'person@example.com', kind: 'authenticated', provider: 'email'}),
  })
  vi.mocked(LanguageLearningLibrary).mockImplementation(() => <p>문장 내용</p>)
  vi.mocked(LanguageLearningWords).mockImplementation(() => <p>단어 내용</p>)
  vi.mocked(MemoryMemoList).mockImplementation(() => <p>메모 내용</p>)
  vi.mocked(PictureDiary).mockImplementation(() => <p>일기 내용</p>)
  vi.mocked(listCalendarConnections).mockResolvedValue([])
  vi.mocked(listCalendarEvents).mockResolvedValue({
    connectedConnections: 1,
    events: [],
    timeZone: 'Asia/Seoul',
    truncated: false,
    unavailableConnections: 0,
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  overwriteGetLocale(originalGetLocale)
  vi.restoreAllMocks()
})

const renderMemoryAssist = async () => {
  await import('../../memory-assist/Content')
  render(() => (
    <PModelDownloadProvider>
      <Suspense>
        <PMemoryAssist />
      </Suspense>
    </PModelDownloadProvider>
  ))
}

it.each(['events', 'connections'] as const)(
  'should switch panels before the calendar %s request resolves',
  async (request) => {
    if (request === 'events') {
      vi.mocked(listCalendarEvents).mockReturnValue(new Promise(() => {}))
    } else {
      vi.mocked(listCalendarConnections).mockReturnValue(new Promise(() => {}))
    }
    await renderMemoryAssist()
    fireEvent.click(screen.getByRole('button', {name: '생각 보조'}))
    fireEvent.click(await screen.findByRole('tab', {name: '캘린더'}))
    await waitFor(() => expect(listCalendarEvents).toHaveBeenCalled())
    await waitFor(() => expect(listCalendarConnections).toHaveBeenCalled())

    expect(await screen.findByRole('grid')).toBeVisible()
    fireEvent.click(screen.getByRole('tab', {name: '메모'}))
    expect(await screen.findByRole('tabpanel', {name: '메모'})).toHaveTextContent('메모 내용')
    await waitFor(() =>
      expect(screen.queryByRole('tabpanel', {name: '캘린더'})).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('tab', {name: '메모'})).toHaveAttribute('aria-selected', 'true')
  },
)

it('should show cached events and the month grid before the refresh resolves', async () => {
  vi.useFakeTimers({toFake: ['Date']})
  vi.setSystemTime(new Date('2026-09-04T10:30:00.000Z'))
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  writeCalendarMonthCache(
    {
      accountKey: 'email:person@example.com',
      end: end.toISOString(),
      start: start.toISOString(),
      timeZone,
    },
    {
      connectedConnections: 1,
      events: [
        {
          accountLabel: 'test',
          allDay: false,
          calendarLabel: 'test',
          end: new Date(today.getTime() + 60_000).toISOString(),
          id: 'cached',
          provider: 'google',
          start: today.toISOString(),
          title: '저장된 일정',
        },
      ],
      timeZone,
      truncated: false,
      unavailableConnections: 0,
    },
  )
  vi.mocked(listCalendarEvents).mockReturnValue(new Promise(() => {}))
  vi.mocked(listCalendarConnections).mockReturnValue(new Promise(() => {}))
  await renderMemoryAssist()
  fireEvent.click(screen.getByRole('button', {name: '생각 보조'}))
  fireEvent.click(await screen.findByRole('tab', {name: '캘린더'}))
  expect(await screen.findByRole('grid')).toBeVisible()
  expect(screen.getAllByText('저장된 일정')).toHaveLength(2)
  fireEvent.click(screen.getByRole('tab', {name: '메모'}))
  expect(await screen.findByRole('tabpanel', {name: '메모'})).toHaveTextContent('메모 내용')
  expect(screen.queryByRole('grid')).not.toBeInTheDocument()
})

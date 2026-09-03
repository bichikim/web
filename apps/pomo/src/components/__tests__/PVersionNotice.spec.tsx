/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {PModal, type PModalProps} from '../PModal'
import {PIconButton} from '../PIconButton'
import {POrbitBorder, type POrbitBorderProps} from '../POrbitBorder'
import {PScribbleCircleControl} from '../scribble/CircleControl'
import {PVersionNotice} from '../PVersionNotice'

const versionMocks = vi.hoisted(() => ({
  load: vi.fn(),
  read: vi.fn(),
  write: vi.fn(),
}))

vi.mock('src/features/version-catalog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('src/features/version-catalog')>()
  return {
    ...actual,
    loadVersionCatalog: versionMocks.load,
    readViewedRelease: versionMocks.read,
    writeViewedRelease: versionMocks.write,
  }
})
vi.mock('../PModal', () => ({PModal: vi.fn()}))
vi.mock('../PIconButton', () => ({PIconButton: vi.fn()}))
vi.mock('../POrbitBorder', () => ({POrbitBorder: vi.fn()}))
vi.mock('../scribble/CircleControl', () => ({PScribbleCircleControl: vi.fn()}))

const catalog = {
  releases: [
    {
      changes: ['새로운 기능을 추가했습니다.'],
      releasedAt: '2026-09-03T00:57:00+09:00',
      title: '업데이트',
      version: '2026. 09. 03 00:57',
    },
    {
      changes: [],
      releasedAt: '2026-09-03T00:52:00+09:00',
      title: '첫 출시',
      version: '2026. 09. 03 00:52',
    },
  ],
} as const

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({shouldAdvanceTime: true})
  vi.setSystemTime(new Date('2026-09-02T16:00:00.000Z'))
  versionMocks.load.mockResolvedValue(catalog)
  versionMocks.read.mockResolvedValue(null)
  versionMocks.write.mockResolvedValue(undefined)
  vi.mocked(PModal).mockImplementation((props: PModalProps) => (
    <div aria-label={props.title} hidden={!props.isOpen} role="dialog">
      {props.children}
      <button
        onClick={() => {
          props.onOpenChange(false)
          props.onCloseAutoFocus?.()
        }}
        type="button"
      >
        닫기
      </button>
    </div>
  ))
  vi.mocked(PIconButton).mockImplementation((props) => (
    <button
      aria-label={props.accessibleLabel}
      onClick={(event) => props.onPress(event.currentTarget)}
      type="button"
    >
      {props.accessibleLabel}
      <span class={props.icon}>{props.feedback}</span>
    </button>
  ))
  vi.mocked(POrbitBorder).mockImplementation((props: POrbitBorderProps) => (
    <span data-orbit-border="">{props.children}</span>
  ))
  vi.mocked(PScribbleCircleControl).mockImplementation((props) => <div>{props.children}</div>)
})

afterEach(() => {
  vi.useRealTimers()
})

it('should show recent releases in a gift modal and persist the newest marker on close', async () => {
  render(() => <PVersionNotice sceneStyle="scribble" />)

  const trigger = await screen.findByRole('button', {name: '새 업데이트 보기'})
  expect(POrbitBorder).toHaveBeenCalledOnce()
  expect(PIconButton).toHaveBeenCalledWith(
    expect.objectContaining({feedback: '새로운 소식', icon: 'i-tabler-gift'}),
  )
  fireEvent.click(trigger)

  expect(screen.getByRole('dialog', {name: '새로운 소식'})).not.toHaveAttribute('hidden')
  expect(PModal).toHaveBeenCalledWith(
    expect.objectContaining({
      description: 'Pomofi의 새로운 기능과 개선 사항을 확인하세요.',
      placement: 'top',
      size: 'wide',
    }),
  )
  expect(screen.getAllByRole('article')).toHaveLength(2)
  expect(screen.getByRole('heading', {name: '업데이트'})).toBeInTheDocument()
  expect(screen.getByText('새로운 기능을 추가했습니다.')).toBeInTheDocument()
  expect(screen.getAllByRole('listitem')).toHaveLength(1)
  expect(screen.getByRole('heading', {name: '첫 출시'})).toBeInTheDocument()
  expect(screen.getByText('Pomofi의 첫 출시입니다.')).toBeInTheDocument()
  expect(screen.getByText('2026. 09. 03 00:57')).toHaveAttribute(
    'datetime',
    '2026-09-03T00:57:00+09:00',
  )
  const focusTrigger = vi.spyOn(trigger, 'focus').mockImplementation(() => {
    expect(trigger).toBeInTheDocument()
  })

  fireEvent.click(screen.getByRole('button', {name: '닫기'}))

  expect(focusTrigger).toHaveBeenCalledOnce()
  await waitFor(() => expect(screen.queryByRole('button', {name: '새 업데이트 보기'})).toBeNull())
  expect(versionMocks.write).toHaveBeenCalledWith({
    formatVersion: 1,
    releasedAt: '2026-09-03T00:57:00+09:00',
    version: '2026. 09. 03 00:57',
  })
})

it('should stay hidden when the newest release was already viewed', async () => {
  versionMocks.read.mockResolvedValue({
    formatVersion: 1,
    releasedAt: '2026-09-03T00:57:00+09:00',
    version: '2026. 09. 03 00:57',
  })

  render(() => <PVersionNotice />)

  await waitFor(() => expect(versionMocks.read).toHaveBeenCalledOnce())
  expect(screen.queryByRole('button', {name: '새 업데이트 보기'})).toBeNull()
})

it('should hide the trigger and report catalog or storage failures', async () => {
  const error = new Error('unavailable')
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  versionMocks.load.mockRejectedValue(error)

  render(() => <PVersionNotice />)

  await waitFor(() =>
    expect(consoleError).toHaveBeenCalledWith('Failed to prepare version notice.', error),
  )
  expect(screen.queryByRole('button', {name: '새 업데이트 보기'})).toBeNull()
})

it('should remain dismissed when persisting the viewed marker fails', async () => {
  const error = new Error('write unavailable')
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  versionMocks.write.mockRejectedValue(error)
  render(() => <PVersionNotice />)

  fireEvent.click(await screen.findByRole('button', {name: '새 업데이트 보기'}))
  fireEvent.click(screen.getByRole('button', {name: '닫기'}))

  await waitFor(() =>
    expect(consoleError).toHaveBeenCalledWith('Failed to persist viewed version release.', error),
  )
  expect(screen.queryByRole('button', {name: '새 업데이트 보기'})).toBeNull()
})

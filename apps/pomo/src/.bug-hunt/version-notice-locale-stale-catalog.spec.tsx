/** @vitest-environment jsdom */
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {PButton} from '../components/p-button/PButton'
import {PModal, type PModalProps} from '../components/p-modal/PModal'
import {POrbitBorder, type POrbitBorderProps} from '../components/p-orbit-border/POrbitBorder'
import {PScribbleCircleControl} from '../components/scribble/CircleControl'
import {PVersionNotice} from '../components/p-version-notice/PVersionNotice'

const localeMocks = vi.hoisted(() => {
  let locale: 'en' | 'ko' = 'ko'
  return {
    getLocale: () => locale,
    setLocale: (next: 'en' | 'ko') => {
      locale = next
    },
  }
})

const versionMocks = vi.hoisted(() => ({
  load: vi.fn(),
  read: vi.fn(),
  write: vi.fn(),
}))

vi.mock('@paraglide/runtime', () => ({
  getLocale: () => localeMocks.getLocale(),
}))

vi.mock('@paraglide/message', () => ({
  modal_content_loading: () => '로딩 중',
  version_notice_description: () => 'Pomofi의 새로운 기능과 개선 사항을 확인하세요.',
  version_notice_open: () => '새 업데이트 보기',
  version_notice_title: () => '새로운 소식',
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

vi.mock('../components/p-modal/PModal', () => ({PModal: vi.fn()}))
vi.mock('../components/p-button/PButton', () => ({PButton: vi.fn()}))
vi.mock('../components/p-orbit-border/POrbitBorder', () => ({POrbitBorder: vi.fn()}))
vi.mock('../components/scribble/CircleControl', () => ({PScribbleCircleControl: vi.fn()}))
vi.mock('../components/p-feature-request/PFeatureRequest', () => ({
  PFeatureRequest: vi.fn(() => null),
}))
vi.mock('../features/desktop-mode/dialogs', () => ({openDesktopDialog: vi.fn()}))

const koreanCatalog = {
  releases: [
    {
      changes: [{description: '새로운 기능을 추가했습니다.'}],
      releasedAt: '2026-09-03T00:57:00+09:00',
      title: '업데이트',
      version: '2026. 09. 03 00:57',
    },
  ],
} as const

const englishCatalog = {
  releases: [
    {
      changes: [{description: 'Added new features.'}],
      releasedAt: '2026-09-03T00:57:00+09:00',
      title: 'Update',
      version: '2026. 09. 03 00:57',
    },
  ],
} as const

beforeEach(() => {
  vi.clearAllMocks()
  localeMocks.setLocale('ko')
  vi.useFakeTimers({shouldAdvanceTime: true})
  vi.setSystemTime(new Date('2026-09-02T16:00:00.000Z'))
  versionMocks.load.mockImplementation(() =>
    Promise.resolve(localeMocks.getLocale() === 'en' ? englishCatalog : koreanCatalog),
  )
  versionMocks.read.mockResolvedValue(null)
  versionMocks.write.mockResolvedValue(undefined)
  vi.mocked(PModal).mockImplementation((props: PModalProps) => (
    <div aria-label={props.title} hidden={!props.isOpen} role="dialog">
      {props.children}
    </div>
  ))
  vi.mocked(PButton).mockImplementation((props) => (
    <button
      aria-label={props.accessibleLabel}
      onClick={(event) => props.onPress?.(event.currentTarget)}
      type="button"
    >
      {props.accessibleLabel}
    </button>
  ))
  vi.mocked(POrbitBorder).mockImplementation((props: POrbitBorderProps) => <span>{props.children}</span>)
  vi.mocked(PScribbleCircleControl).mockImplementation((props) => <div>{props.children}</div>)
})

afterEach(() => {
  vi.useRealTimers()
})

it('should reload the version catalog when the UI locale changes after mount', async () => {
  render(() => <PVersionNotice sceneStyle="flat" />)

  await screen.findByRole('button', {name: '새 업데이트 보기'})
  expect(versionMocks.load).toHaveBeenCalledOnce()

  localeMocks.setLocale('en')

  fireEvent.click(screen.getByRole('button', {name: '새 업데이트 보기'}))

  await waitFor(() => expect(versionMocks.load).toHaveBeenCalledTimes(2))
  expect(screen.getByRole('heading', {name: 'Update'})).toBeInTheDocument()
  expect(screen.getByText('Added new features.')).toBeInTheDocument()
})

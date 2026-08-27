/**
 * @vitest-environment jsdom
 */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal, type JSX} from 'solid-js'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import MainLayout, {route as mainRoute} from '../(main-layout)'
import MusicLayout, {route as musicRoute} from '../(main-layout)/(music-layout)'
import {useLocation, useNavigate, useSearchParams} from '@solidjs/router'
import {useStorage} from '@winter-love/solid-use'
import {useCookieStorage} from 'src/use/storage'
import {createSplendidGrandPiano} from 'src/use/instruments'

vi.mock('@solidjs/start', () => ({
  clientOnly: vi.fn(() => () => <div data-testid="analytics" />),
}))
vi.mock('src/components/page-meta', () => ({RouteMeta: () => <div data-testid="route-meta" />}))
vi.mock('src/components/auth-guard', () => ({
  AuthGuard: (props: {children: JSX.Element}) => (
    <div data-testid="auth-guard">{props.children}</div>
  ),
}))
vi.mock('src/store/auth', () => ({
  AuthProvider: (props: {children: JSX.Element}) => (
    <div data-testid="auth-provider">{props.children}</div>
  ),
}))
vi.mock('@solidjs/router', () => ({
  useLocation: vi.fn(),
  useNavigate: vi.fn(),
  useSearchParams: vi.fn(),
}))
vi.mock('@winter-love/solid-use', () => ({useStorage: vi.fn()}))
vi.mock('src/use/storage', () => ({useCookieStorage: vi.fn()}))
vi.mock('src/use/instruments', async () => {
  const actual = await vi.importActual<typeof import('src/use/instruments')>('src/use/instruments')
  return {...actual, createSplendidGrandPiano: vi.fn()}
})
vi.mock('src/components/midi-player/context', () => ({
  MidiPlayerProvider: (props: {children: JSX.Element}) => <>{props.children}</>,
}))
vi.mock('src/components/midi-player', async () => {
  const actual = await vi.importActual<typeof import('src/components/midi-player')>(
    'src/components/midi-player',
  )
  return {
    ...actual,
    SHiddenPlayer: (props: {linkType: string; onLink: (type: 'music' | 'piano') => void}) => (
      <button
        type="button"
        onClick={() => props.onLink(props.linkType === 'piano' ? 'piano' : 'music')}
      >
        Open {props.linkType}
      </button>
    ),
  }
})

const navigate = vi.fn()
const setMusics = vi.fn()
const setSettingData = vi.fn()

describe('route layouts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    vi.mocked(useLocation).mockReturnValue({pathname: '/musics'} as never)
    vi.mocked(useSearchParams).mockReturnValue([{}] as never)
    vi.mocked(useStorage).mockReturnValue([() => [], setMusics] as never)
    vi.mocked(useCookieStorage).mockReturnValue([
      () => ({keepPlayList: true, pianoSize: 100, showKeyName: false}),
      setSettingData,
    ] as never)
    const [state] = createSignal({loaded: true, playingId: ''})
    vi.mocked(createSplendidGrandPiano).mockReturnValue([
      state as never,
      {down: vi.fn(), up: vi.fn()} as never,
    ])
  })

  it('should wrap main route children with metadata and authorization boundaries', () => {
    render(() => MainLayout({children: 'Protected content'} as never))

    expect(screen.getByTestId('route-meta')).toBeInTheDocument()
    expect(screen.getByTestId('auth-provider')).toContainElement(screen.getByTestId('auth-guard'))
    expect(screen.getByText('Protected content')).toBeInTheDocument()
    expect(screen.getByTestId('analytics')).toBeInTheDocument()
    expect(mainRoute.info.public).toBe(true)
  })

  it('should render music children and navigate through the hidden player link', () => {
    render(() => MusicLayout({children: 'Music content'} as never))

    expect(screen.getByText('Music content')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', {name: 'Open piano'}))

    expect(navigate).toHaveBeenCalledWith('/piano')
    expect(musicRoute.info.public).toBe(true)
  })
})

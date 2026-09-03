/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {useNavigate} from '@solidjs/router'
import {type Component, createSignal, type JSX, Show} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {PRecoveryBoundaryProps} from '../components/PRecoveryBoundary'
import {SceneModelDownloadFallback} from '../components/p-studio/ModelDownloadFallback'
import {
  type ModelDownloadController,
  type ModelDownloadResult,
  useModelDownload,
} from '../features/model-download'
import {createTextModelDownloadClient} from '../features/model-download/text-client'
import {useApplicationRecovery} from '../features/application-recovery'

const componentMocks = vi.hoisted(() => ({
  displayThemeProvider: vi.fn(),
  fileRoutes: vi.fn(),
  focusRoomLayout: vi.fn(),
  metadata: vi.fn(),
  metaProvider: vi.fn(),
  recoveryBoundary: vi.fn(),
  router: vi.fn(),
}))

vi.mock('@solidjs/meta', () => ({MetaProvider: componentMocks.metaProvider}))
vi.mock('@solidjs/router', () => ({
  Router: componentMocks.router,
  useNavigate: vi.fn(),
}))
vi.mock('@solidjs/start/router', () => ({FileRoutes: componentMocks.fileRoutes}))
vi.mock('../components/PDocumentMetadata', () => ({PDocumentMetadata: componentMocks.metadata}))
vi.mock('../components/PFocusRoomLayout', () => ({
  PFocusRoomLayout: componentMocks.focusRoomLayout,
}))
vi.mock('../components/PRecoveryBoundary', () => ({
  PRecoveryBoundary: componentMocks.recoveryBoundary,
}))
vi.mock('../features/application-recovery', () => ({useApplicationRecovery: vi.fn()}))
vi.mock('../features/apps-in-toss-devtools', () => ({useAppsInTossDevtools: vi.fn()}))
vi.mock('../features/apps-in-toss-safe-area', () => ({useAppsInTossSafeArea: vi.fn()}))
vi.mock('../features/display-theme', () => ({
  DisplayThemeProvider: componentMocks.displayThemeProvider,
}))
vi.mock('../features/model-download/text-client', () => ({
  createTextModelDownloadClient: vi.fn(),
}))

import App from '../app'

interface ChildrenProps {
  readonly children: JSX.Element
}

interface RouterProps extends ChildrenProps {
  readonly root: Component<ChildrenProps>
}

const [pathname, setPathname] = createSignal('/language-learning')
let downloadPromise: Promise<ModelDownloadResult> | null = null
let homeController: ModelDownloadController | null = null
let learningController: ModelDownloadController | null = null

const LanguageLearningRoute = () => {
  const download = useModelDownload()
  const navigate = useNavigate()
  learningController = download

  return (
    <main>
      <p>language learning</p>
      <button
        onClick={() => {
          downloadPromise = download.startTextModel('gemma-4-e2b')
        }}
        type="button"
      >
        start download
      </button>
      <button onClick={() => navigate('/')} type="button">
        go home
      </button>
    </main>
  )
}

const HomeRoute = () => {
  homeController = useModelDownload()
  return <SceneModelDownloadFallback isVisible />
}

beforeEach(() => {
  setPathname('/language-learning')
  componentMocks.router.mockImplementation((props: RouterProps) =>
    props.root({
      get children() {
        return props.children
      },
    }),
  )
  vi.mocked(useNavigate).mockReturnValue((path) => setPathname(path.toString()))
  componentMocks.metaProvider.mockImplementation((props: ChildrenProps) => props.children)
  componentMocks.displayThemeProvider.mockImplementation((props: ChildrenProps) => props.children)
  componentMocks.recoveryBoundary.mockImplementation((props: PRecoveryBoundaryProps) => (
    <>{props.children}</>
  ))
  componentMocks.focusRoomLayout.mockImplementation((props: ChildrenProps) => props.children)
  componentMocks.metadata.mockImplementation(() => null)
  componentMocks.fileRoutes.mockImplementation(() => (
    <Show fallback={<HomeRoute />} when={pathname() === '/language-learning'}>
      <LanguageLearningRoute />
    </Show>
  ))
  vi.mocked(useApplicationRecovery).mockReturnValue({
    canRetry: () => true,
    onError: () => 'error-id',
    onReady: vi.fn(),
    onReload: vi.fn(),
    onRetry: vi.fn(),
  })
})

afterEach(() => {
  cleanup()
  downloadPromise = null
  homeController = null
  learningController = null
  vi.clearAllMocks()
})

it('should keep a learning download hidden until the same controller reaches Pomo home', async () => {
  const dispose = vi.fn()
  vi.mocked(createTextModelDownloadClient).mockReturnValue({dispose, prepare: vi.fn()})

  render(() => <App />)
  expect(screen.getByText('language learning')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', {name: 'start download'}))

  expect(createTextModelDownloadClient).toHaveBeenCalledOnce()
  expect(screen.queryByRole('status')).toBeNull()
  expect(screen.queryByRole('button', {name: '취소'})).toBeNull()

  fireEvent.click(screen.getByRole('button', {name: 'go home'}))

  await waitFor(() => {
    expect(screen.getByRole('status')).toHaveTextContent('Gemma 4 E2B 모델 받는 중')
  })
  expect(homeController).toBe(learningController)
  fireEvent.click(screen.getByRole('button', {name: '취소'}))

  if (downloadPromise === null) {
    throw new Error('모델 다운로드 결과가 준비되지 않았습니다.')
  }

  expect(await downloadPromise).toEqual({status: 'cancelled'})
  expect(dispose).toHaveBeenCalledOnce()
})

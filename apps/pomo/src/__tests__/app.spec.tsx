/** @vitest-environment jsdom */

import {cleanup, render, screen} from '@solidjs/testing-library'
import type {Accessor, Component, JSX} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import type {PRecoveryBoundaryProps} from '../components/PRecoveryBoundary'
import {useApplicationRecovery} from '../features/application-recovery'
import {useAppsInTossDevtools} from '../features/apps-in-toss-devtools'
import {useAppsInTossSafeArea} from '../features/apps-in-toss-safe-area'

const componentMocks = vi.hoisted(() => ({
  fileRoutes: vi.fn(),
  focusRoomLayout: vi.fn(),
  metadata: vi.fn(),
  metaProvider: vi.fn(),
  modelDownloadOverlay: vi.fn(),
  modelDownloadProvider: vi.fn(),
  recoveryBoundary: vi.fn(),
  router: vi.fn(),
}))

vi.mock('@solidjs/meta', () => ({MetaProvider: componentMocks.metaProvider}))
vi.mock('@solidjs/router', () => ({Router: componentMocks.router}))
vi.mock('@solidjs/start/router', () => ({FileRoutes: componentMocks.fileRoutes}))
vi.mock('../components/PDocumentMetadata', () => ({PDocumentMetadata: componentMocks.metadata}))
vi.mock('../components/PFocusRoomLayout', () => ({
  PFocusRoomLayout: componentMocks.focusRoomLayout,
}))
vi.mock('../components/PModelDownloadOverlay', () => ({
  PModelDownloadOverlay: componentMocks.modelDownloadOverlay,
}))
vi.mock('../components/PRecoveryBoundary', () => ({
  PRecoveryBoundary: componentMocks.recoveryBoundary,
}))
vi.mock('../features/application-recovery', () => ({useApplicationRecovery: vi.fn()}))
vi.mock('../features/apps-in-toss-devtools', () => ({useAppsInTossDevtools: vi.fn()}))
vi.mock('../features/apps-in-toss-safe-area', () => ({useAppsInTossSafeArea: vi.fn()}))
vi.mock('../features/model-download', () => ({
  PModelDownloadProvider: componentMocks.modelDownloadProvider,
}))

import App from '../app'

interface ChildrenProps {
  readonly children: JSX.Element
}

interface RouterProps extends ChildrenProps {
  readonly root: Component<ChildrenProps>
}

const canRetry: Accessor<boolean> = vi.fn(() => true)
const onError = vi.fn(() => 'error-id')
const onReady = vi.fn()
const onReload = vi.fn()
const onRetry = vi.fn()
let recoveryProps: PRecoveryBoundaryProps | undefined

describe('App', () => {
  beforeEach(() => {
    vi.mocked(useApplicationRecovery).mockReturnValue({
      canRetry,
      onError,
      onReady,
      onReload,
      onRetry,
    })
    componentMocks.router.mockImplementation((props: RouterProps) =>
      props.root({
        get children() {
          return props.children
        },
      }),
    )
    componentMocks.metaProvider.mockImplementation((props: ChildrenProps) => props.children)
    componentMocks.modelDownloadProvider.mockImplementation(
      (props: ChildrenProps) => props.children,
    )
    componentMocks.recoveryBoundary.mockImplementation((props: PRecoveryBoundaryProps) => {
      recoveryProps = {
        canRetry: props.canRetry,
        children: props.children,
        onError: props.onError,
        onReady: props.onReady,
        onReload: props.onReload,
        onRetry: props.onRetry,
      }
      return <section data-testid="recovery-boundary">{props.children}</section>
    })
    componentMocks.focusRoomLayout.mockImplementation((props: ChildrenProps) => (
      <main data-testid="focus-room-layout">{props.children}</main>
    ))
    componentMocks.fileRoutes.mockImplementation(() => <div>file routes</div>)
    componentMocks.metadata.mockImplementation(() => <div>document metadata</div>)
    componentMocks.modelDownloadOverlay.mockImplementation(() => <div>download overlay</div>)
  })

  afterEach(() => {
    cleanup()
    recoveryProps = undefined
    vi.clearAllMocks()
  })

  it('should compose application services, route content, recovery, and download UI', () => {
    render(() => <App />)

    expect(useAppsInTossDevtools).toHaveBeenCalledOnce()
    expect(useAppsInTossSafeArea).toHaveBeenCalledOnce()
    expect(useApplicationRecovery).toHaveBeenCalledOnce()
    expect(componentMocks.router).toHaveBeenCalledOnce()
    expect(componentMocks.metaProvider).toHaveBeenCalledOnce()
    expect(componentMocks.modelDownloadProvider).toHaveBeenCalledOnce()
    expect(screen.getByText('document metadata')).toBeTruthy()
    expect(screen.getByText('file routes')).toBeTruthy()
    expect(screen.getByText('download overlay')).toBeTruthy()
    expect(screen.getByTestId('focus-room-layout')).toBeTruthy()
    expect(screen.getByTestId('recovery-boundary')).toBeTruthy()
    expect(recoveryProps).toMatchObject({canRetry, onError, onReady, onReload, onRetry})
  })
})

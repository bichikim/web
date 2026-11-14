/** @vitest-environment jsdom */
import {fireEvent, render, waitFor, within} from '@solidjs/testing-library'
import {ErrorBoundary} from 'solid-js'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {createDocumentSession} from '../create-document-session'
import {WorkspaceApp as EditorApp} from '../WorkspaceApp'
import {createDemoDocument, createPlayer, type PuppetDocument} from '@winter-love/puppet/player'
import {createPlayerFixture} from './fixtures/player'

vi.mock('../create-document-session', () => ({createDocumentSession: vi.fn()}))
vi.mock('@winter-love/puppet/player', async (original) => ({
  ...(await original<typeof import('@winter-love/puppet/player')>()),
  createPlayer: vi.fn(),
}))
beforeEach(() => vi.mocked(createPlayer).mockResolvedValue(createPlayerFixture()))
afterEach(() => {
  vi.resetAllMocks()
  vi.restoreAllMocks()
})

test('should retain the recovery failure without overwriting stored work with the initial example', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const write = vi.fn().mockResolvedValue(undefined)
  vi.mocked(createDocumentSession).mockReturnValue({
    listRecoveries: vi.fn().mockResolvedValue([]),
    loadRecovery: vi.fn(),
    read: vi.fn().mockRejectedValue(new Error('temporary read failure')),
    write,
  })
  const view = render(() => (
    <EditorApp
      initialWorkspace="animation"
      loadInitialDocument={async () => createDemoDocument()}
    />
  ))
  await waitFor(() =>
    expect(view.getByRole('button', {name: 'shape-circle 레이어 선택'})).toBeVisible(),
  )
  expect(write).not.toHaveBeenCalled()
  expect(view.getByRole('alert')).toHaveTextContent('작업 복원 실패')
})

test('should render the editor frame while recovery is pending without saving its empty document', async () => {
  let resolveDocument = (_document: PuppetDocument) => {}
  const recovered = new Promise<PuppetDocument>((resolve) => {
    resolveDocument = resolve
  })
  let resolveSaving = () => undefined as void
  const saved = new Promise<void>((resolve) => {
    resolveSaving = resolve
  })
  const write = vi.fn(async () => resolveSaving())
  vi.mocked(createDocumentSession).mockReturnValue({
    listRecoveries: vi.fn().mockResolvedValue([]),
    loadRecovery: vi.fn(),
    read: vi.fn(() => recovered),
    write,
  })
  const loadInitialDocument = vi.fn()
  const view = render(() => (
    <EditorApp initialWorkspace="animation" loadInitialDocument={loadInitialDocument} />
  ))
  expect(view.getByRole('region', {name: '문서 준비 중'})).toHaveAttribute('aria-busy', 'true')
  expect(view.getByRole('main', {hidden: true}).parentElement).toHaveAttribute('inert')
  expect(write).not.toHaveBeenCalled()
  const document = createDemoDocument()
  resolveDocument(document)
  await waitFor(() => expect(view.queryByText('문서 불러오는 중…')).toBeNull())
  expect(view.getByRole('button', {name: 'shape-circle 레이어 선택'})).toBeVisible()
  expect(view.getByRole('main').parentElement).not.toHaveAttribute('inert')
  expect(write).not.toHaveBeenCalled()
  fireEvent.click(view.getByRole('button', {name: '타임라인 FPS 증가'}))
  await saved
  expect(write).toHaveBeenCalledTimes(1)
  expect(write).toHaveBeenCalledWith({
    ...document,
    motions: [{...document.motions[0], framesPerSecond: 25}, ...document.motions.slice(1)],
  })
  expect(loadInitialDocument).not.toHaveBeenCalled()
  expect(view.container).not.toHaveTextContent('새로고침 복구 저장됨')
  expect(view.container).not.toHaveTextContent('작업 복원됨')
  expect(view.queryByRole('alert')).toBeNull()
})

test('should offer a retry when loading a document fails', async () => {
  vi.mocked(createDocumentSession).mockReturnValue({
    listRecoveries: vi.fn().mockResolvedValue([]),
    loadRecovery: vi.fn(),
    read: vi.fn().mockResolvedValue(null),
    write: vi.fn(),
  })
  const loadInitialDocument = vi.fn().mockRejectedValue(new Error('network unavailable'))
  const view = render(() => (
    <ErrorBoundary fallback={<p>Unhandled document failure</p>}>
      <EditorApp loadInitialDocument={loadInitialDocument} />
    </ErrorBoundary>
  ))
  await waitFor(() =>
    expect(view.getByRole('alert')).toHaveTextContent('문서를 불러오지 못했습니다.'),
  )
  fireEvent.click(view.getByRole('button', {name: '다시 시도'}))
  await waitFor(() => expect(loadInitialDocument).toHaveBeenCalledTimes(2))
  await waitFor(() =>
    expect(view.getByRole('alert')).toHaveTextContent('문서를 불러오지 못했습니다.'),
  )
})

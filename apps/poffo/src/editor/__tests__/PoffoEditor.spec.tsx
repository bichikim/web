/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createResource, onMount, Suspense} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {createEmptyDocument, serializePoffoDocument} from '@winter-love/puppet/player'
import {createEditorControl, packTextureAtlas, PuppetEditor} from '@winter-love/puppet/editor'
import {createModelSession} from '../../model/create-model-session'
import {PoffoEditor} from '../PoffoEditor'

vi.mock('@winter-love/puppet/player', async (original) => ({
  ...(await original<typeof import('@winter-love/puppet/player')>()),
  serializePoffoDocument: vi.fn(),
}))

vi.mock('@winter-love/puppet/editor', async (original) => ({
  ...(await original<typeof import('@winter-love/puppet/editor')>()),
  packTextureAtlas: vi.fn(),
  PuppetEditor: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

const PendingPage = (props: {readonly ready: Promise<string>}) => {
  const [value] = createResource(() => props.ready)
  return <span>{value()}</span>
}

test('should initialize the restored editor independently of a pending sibling page', async () => {
  vi.mocked(PuppetEditor).mockImplementation((props) => {
    const control = createEditorControl({
      model: props.model,
      ownerId: 'restored-editor',
      read: () => ({
        appliedMode: 'modeling',
        hasTemporaryChanges: false,
        mode: 'modeling',
        modePending: false,
        panels: {bottom: true, left: true, right: true},
        renderer: 'loading',
      }),
      resetSelection: () => {},
      selectMode: () => {},
      setPanelOpen: () => {},
      stop: () => {},
    })
    onMount(() => props.onControl?.(control))
    return <span>모델 편집</span>
  })
  const ready = Promise.withResolvers<string>()
  const onControl = vi.fn()
  const view = render(() => {
    const model = createModelSession({document: createEmptyDocument(), sessionId: 'restored'})
    return (
      <Suspense fallback={<span>다른 화면 준비 중</span>}>
        <PoffoEditor model={model} onControl={onControl} />
        <PendingPage ready={ready.promise} />
      </Suspense>
    )
  })
  expect(view.getByText('다른 화면 준비 중')).toBeVisible()
  expect(onControl).toHaveBeenCalledOnce()
  ready.resolve('화면 준비 완료')
  await waitFor(() => expect(view.getByText('화면 준비 완료')).toBeVisible())
  expect(view.getByText('모델 편집')).toBeVisible()
  expect(onControl).toHaveBeenCalledOnce()
})

const renderEditorHeader = () => {
  vi.mocked(PuppetEditor).mockImplementation((props) => {
    const control = createEditorControl({
      model: props.model,
      ownerId: 'header-editor',
      read: () => ({
        appliedMode: 'modeling',
        hasTemporaryChanges: false,
        mode: 'modeling',
        modePending: false,
        panels: {bottom: true, left: true, right: true},
        renderer: 'ready',
      }),
      resetSelection: () => {},
      selectMode: () => {},
      setPanelOpen: () => {},
      stop: () => {},
    })
    return props.header?.(control, {setBrushSettingsMount: () => {}})
  })
  return render(() => {
    const model = createModelSession({document: createEmptyDocument(), sessionId: 'export'})
    return <PoffoEditor model={model} />
  })
}

test('should reactively render and dismiss a Poffo export failure', async () => {
  vi.mocked(serializePoffoDocument).mockRejectedValueOnce(new Error('export failed'))
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const view = renderEditorHeader()
  fireEvent.click(view.getByRole('button', {name: '메인 메뉴'}))
  fireEvent.click(screen.getByRole('button', {name: '문서 저장'}))
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('문서를 저장하지 못했습니다.'),
  )
  fireEvent.click(screen.getByRole('button', {name: '알림 닫기'}))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('should render atlas progress and replace it with a dismissible failure', async () => {
  let fail!: (reason: Error) => void
  vi.mocked(packTextureAtlas).mockReturnValueOnce(
    new Promise((_, reject) => {
      fail = reject
    }),
  )
  const view = renderEditorHeader()
  fireEvent.click(view.getByRole('button', {name: '메인 메뉴'}))
  fireEvent.click(screen.getByRole('button', {name: '텍스처 아틀라스로 JSON 내보내기'}))
  expect(screen.getByRole('alert')).toHaveTextContent('텍스처 아틀라스를 만드는 중입니다.')
  fail(new Error('atlas failed'))
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('텍스처 아틀라스를 만들지 못했습니다.'),
  )
  fireEvent.click(screen.getByRole('button', {name: '알림 닫기'}))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('should replace export feedback with an editing notice without reviving the old failure', async () => {
  vi.mocked(serializePoffoDocument).mockRejectedValueOnce(new Error('export failed'))
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const view = renderEditorHeader()
  fireEvent.click(view.getByRole('button', {name: '메인 메뉴'}))
  fireEvent.click(screen.getByRole('button', {name: '문서 저장'}))
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('문서를 저장하지 못했습니다.'),
  )
  const model = vi.mocked(PuppetEditor).mock.calls.at(-1)![0].model
  expect(
    model.request({ownerId: 'editor', requestId: 'drag', transactionId: 'drag', type: 'begin'}).ok,
  ).toBe(true)
  fireEvent.click(view.getByRole('button', {name: '메인 메뉴'}))
  fireEvent.click(screen.getByRole('button', {name: 'JSON 내보내기'}))
  expect(screen.getByRole('alert')).toHaveTextContent('진행 중인 편집을 마친 후 내보내세요.')
  fireEvent.click(screen.getByRole('button', {name: '알림 닫기'}))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(serializePoffoDocument).toHaveBeenCalledOnce()
})

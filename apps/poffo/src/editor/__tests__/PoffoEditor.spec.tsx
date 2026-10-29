/** @vitest-environment jsdom */
import {cleanup, render, waitFor} from '@solidjs/testing-library'
import {createResource, onMount, Suspense} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {createEmptyDocument} from '@winter-love/puppet/player'
import {createEditorControl, PuppetEditor} from '@winter-love/puppet/editor'
import {createModelSession} from '../../model/create-model-session'
import {PoffoEditor} from '../PoffoEditor'

vi.mock('@winter-love/puppet/editor', async (original) => ({
  ...(await original<typeof import('@winter-love/puppet/editor')>()),
  PuppetEditor: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
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

/** @vitest-environment jsdom */
import {cleanup, render} from '@solidjs/testing-library'
import {createResource, onCleanup, onMount, Suspense} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {createElementModel} from '../../editor-element/create-element-model'
import {createEmptyDocument} from '../../player'
import {PuppetEditor} from '../PuppetEditor'
import {EditorBody} from '../internal/EditorBody'
import {createEditorControl} from '../create-editor-control'

vi.mock('../internal/EditorBody', () => ({EditorBody: vi.fn()}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('should release a suspended editor before reporting its controller without reentering cleanup', () => {
  const released = vi.fn()
  const stopped = vi.fn()
  const reported = vi.fn()
  vi.mocked(EditorBody).mockImplementation((props) => {
    const [pending] = createResource(() => new Promise<never>(() => {}))
    onCleanup(released)
    const control = createEditorControl({
      model: props.model,
      onDispose: props.onDispose,
      ownerId: 'suspended-editor',
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
      stop: stopped,
    })
    onMount(() => props.onControl?.(control))
    return <span>{pending()}</span>
  })
  const view = render(() => {
    const model = createElementModel({document: createEmptyDocument(), sessionId: 'host'})
    return (
      <Suspense fallback={<span>Loading</span>}>
        <PuppetEditor model={model} onControl={reported} />
      </Suspense>
    )
  })
  expect(reported).not.toHaveBeenCalled()
  expect(() => view.unmount()).not.toThrow()
  expect(released).toHaveBeenCalledOnce()
  expect(stopped).toHaveBeenCalledOnce()
})

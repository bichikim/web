import {render} from 'solid-js/web'
import {createSignal} from 'solid-js'
import {afterEach, expect, test} from 'vitest'
import {page} from 'vitest/browser'

import {EditorLayerPanel} from '../../src/editor/internal/EditorLayerPanel'
import {createDemoDocument, type PuppetDocument} from '../../src/player'

let disposeView: (() => void) | undefined

afterEach(() => {
  disposeView?.()
  disposeView = undefined
  globalThis.document.body.replaceChildren()
})

test('should move a root part into a group on drag and drop', async () => {
  const root = globalThis.document.createElement('div')
  const [document, setDocument] = createSignal<PuppetDocument>(createDemoDocument())
  globalThis.document.body.replaceChildren(root)
  disposeView = render(
    () => <EditorLayerPanel document={document()} onDocumentChange={setDocument} />,
    root,
  )
  await Promise.all([...root.querySelectorAll('img')].map((image) => image.decode()))
  const source = page
    .getByRole('button', {name: 'mesh-preview 레이어 선택'})
    .element()
    .closest('[role="treeitem"]')
  const target = page
    .getByRole('button', {name: 'Shapes 레이어 선택'})
    .element()
    .closest('[role="treeitem"]')
    ?.querySelector('.layer-row')

  expect(source).not.toBeNull()
  expect(target).not.toBeNull()
  const dataTransfer = new DataTransfer()
  source!.dispatchEvent(new DragEvent('dragstart', {bubbles: true, dataTransfer}))
  const bounds = target!.getBoundingClientRect()
  const clientY = bounds.top + bounds.height / 2
  target!.dispatchEvent(new DragEvent('dragover', {bubbles: true, clientY, dataTransfer}))
  target!.dispatchEvent(new DragEvent('drop', {bubbles: true, clientY, dataTransfer}))
  source!.dispatchEvent(new DragEvent('dragend', {bubbles: true, dataTransfer}))

  expect(document().scene?.roots).toHaveLength(1)
  expect(document().scene?.roots[0]).toMatchObject({
    children: [{id: 'shape-circle'}, {id: 'shape-diamond'}, {id: 'mesh-preview'}],
    id: 'shapes',
  })
})

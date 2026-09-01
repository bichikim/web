import {render} from 'solid-js/web'
import {createSignal} from 'solid-js'
import {afterEach, expect, test} from 'vitest'
import {page, userEvent} from 'vitest/browser'

import {EditorLayerPanel} from '../../src/editor/internal/EditorLayerPanel'
import {createDemoDocument, type PuppetDocument} from '../../src/player'

let disposeView: (() => void) | undefined

afterEach(() => {
  disposeView?.()
  disposeView = undefined
  window.document.body.replaceChildren()
})

test('should drag a root part into a group in Chromium', async () => {
  const root = window.document.createElement('div')
  const [document, setDocument] = createSignal<PuppetDocument>(createDemoDocument())
  window.document.body.replaceChildren(root)
  disposeView = render(
    () => <EditorLayerPanel document={document()} onDocumentChange={setDocument} />,
    root,
  )
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
  await userEvent.dragAndDrop(source!, target!)

  expect(document().scene?.roots).toHaveLength(1)
  expect(document().scene?.roots[0]).toMatchObject({
    children: [{id: 'shape-circle'}, {id: 'shape-diamond'}, {id: 'mesh-preview'}],
    id: 'shapes',
  })
})

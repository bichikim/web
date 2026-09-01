/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, test, vi} from 'vitest'

import {createDemoDocument, type PuppetDocument} from '../../../player'
import type {SceneSelection} from '../scene-graph'
import {EditorLayerPanel} from '../EditorLayerPanel'

describe('EditorLayerPanel', () => {
  test('should render and select each example layer', () => {
    const onPartSelect = vi.fn()
    const view = render(() => (
      <EditorLayerPanel
        activePartId="mesh-preview"
        document={createDemoDocument()}
        onPartSelect={onPartSelect}
      />
    ))

    const selectedLayer = view.getByRole('button', {name: 'mesh-preview 레이어 선택'})

    expect(selectedLayer.getAttribute('aria-pressed')).toBe('true')
    expect(selectedLayer.closest('[role="treeitem"]')?.getAttribute('aria-selected')).toBe('true')
    expect(view.getByRole('button', {name: 'shape-circle 레이어 선택'})).toBeDefined()
    expect(view.getByRole('button', {name: 'shape-diamond 레이어 선택'})).toBeDefined()

    fireEvent.click(view.getByRole('button', {name: 'shape-circle 레이어 선택'}))

    expect(onPartSelect).toHaveBeenCalledWith('shape-circle')
  })

  test('should group a multiple selection and edit group state', () => {
    const initialDocument = {...createDemoDocument(), scene: undefined}
    const [document, setDocument] = createSignal<PuppetDocument>(initialDocument)
    const [selection, setSelection] = createSignal<SceneSelection>({
      activeNodeId: 'mesh-preview' as string | null,
      nodeIds: ['mesh-preview'],
    })
    const view = render(() => (
      <EditorLayerPanel
        document={document()}
        selection={selection()}
        onDocumentChange={setDocument}
        onSelectionChange={setSelection}
      />
    ))

    fireEvent.click(view.getByRole('button', {name: 'shape-circle 레이어 선택'}), {ctrlKey: true})
    fireEvent.click(view.getByRole('button', {name: '그룹'}))

    expect(view.getByRole('button', {name: '새 그룹 레이어 선택'})).toBeDefined()
    expect(document().scene?.roots[0]).toMatchObject({
      children: [{id: 'mesh-preview'}, {id: 'shape-circle'}],
      kind: 'group',
    })

    fireEvent.click(view.getByRole('button', {name: '새 그룹 레이어 선택'}))

    expect(
      view
        .getByRole('button', {name: '새 그룹 레이어 선택'})
        .closest('[role="treeitem"]')
        ?.getAttribute('aria-selected'),
    ).toBe('true')
    fireEvent.dblClick(view.getByRole('button', {name: '새 그룹 레이어 선택'}))
    const groupNameInput = view.getByRole('textbox', {name: '새 그룹 그룹 이름'})

    fireEvent.input(groupNameInput, {target: {value: 'Face'}})
    fireEvent.keyDown(groupNameInput, {key: 'Enter'})

    expect(view.queryByRole('textbox', {name: '새 그룹 그룹 이름'})).toBeNull()
    fireEvent.click(view.getByRole('button', {name: 'Face 숨기기'}))
    fireEvent.click(view.getByRole('button', {name: 'Face 잠그기'}))

    expect(document().scene?.roots[0]).toMatchObject({
      locked: true,
      name: 'Face',
      visible: false,
    })
  })
})

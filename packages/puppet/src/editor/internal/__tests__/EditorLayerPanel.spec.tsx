/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, test, vi} from 'vitest'

import {createDemoDocument, type PuppetDocument} from '../../../player'
import {createDeformer, type SceneSelection} from '../scene-graph'
import {EditorLayerPanel} from '../EditorLayerPanel'

describe('EditorLayerPanel', () => {
  test('should distinguish group and free deformation icons by shape', () => {
    const document = createDeformer(createDemoDocument(), ['mesh-preview'])!
    const view = render(() => <EditorLayerPanel document={document} />)
    const groupIcon = view
      .getByRole('button', {name: 'Shapes 레이어 선택'})
      .parentElement!.querySelector<HTMLElement>('[data-layer-icon="group"]')
    const deformerIcon = view
      .getByRole('button', {name: '새 자유 변형 디포머 레이어 선택'})
      .parentElement!.querySelector<HTMLElement>('[data-layer-icon="deformer"]')

    expect(groupIcon).not.toBeNull()
    expect(deformerIcon).not.toBeNull()
    expect(groupIcon).toHaveClass('puppet-icon-squares')
    expect(deformerIcon).toHaveClass('puppet-icon-mesh')
    expect(groupIcon).toHaveAttribute('aria-hidden', 'true')
    expect(deformerIcon).toHaveAttribute('aria-hidden', 'true')
  })

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

  test('should pick a mask target without changing the source selection', () => {
    const onMaskPick = vi.fn()
    const onSelectionChange = vi.fn()
    const view = render(() => (
      <EditorLayerPanel
        document={createDemoDocument()}
        maskPickSourcePartId="shape-circle"
        onMaskPick={onMaskPick}
        onSelectionChange={onSelectionChange}
      />
    ))

    expect(view.getByRole('button', {name: 'shape-circle 레이어 선택'})).toBeDisabled()
    expect(view.getByRole('button', {name: 'mesh-preview 레이어 선택'})).toBeDisabled()
    expect(view.getByLabelText('2개 파츠의 마스크로 사용')).toBeVisible()
    fireEvent.click(view.getByRole('button', {name: 'shape-diamond 레이어 선택'}))

    expect(onMaskPick).toHaveBeenCalledWith('shape-diamond')
    expect(onSelectionChange).not.toHaveBeenCalled()
  })

  test('should create a free deformer for a multiple selection and edit its state', () => {
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
    const groupNameInput = view.getByRole('textbox', {
      name: '새 그룹 그룹 이름',
    })

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

  test('should preserve empty organizational group creation without deformation bounds', () => {
    const initialDocument = {...createDemoDocument(), scene: undefined}
    const [document, setDocument] = createSignal<PuppetDocument>(initialDocument)
    const view = render(() => (
      <EditorLayerPanel document={document()} onDocumentChange={setDocument} />
    ))

    fireEvent.click(view.getByRole('button', {name: '그룹'}))

    expect(view.getByRole('button', {name: '새 그룹 레이어 선택'})).toBeDefined()
    expect(document().scene?.roots[3]).toMatchObject({children: [], kind: 'group'})
  })

  test('should move a part into and back out of a group with row drop positions', () => {
    const [document, setDocument] = createSignal<PuppetDocument>(createDemoDocument())
    const view = render(() => (
      <EditorLayerPanel document={document()} onDocumentChange={setDocument} />
    ))
    const groupItem = view
      .getByRole('button', {name: 'Shapes 레이어 선택'})
      .closest('[role="treeitem"]')
    const groupRow = groupItem?.querySelector<HTMLElement>('.layer-row')

    expect(groupRow).not.toBeNull()
    vi.spyOn(groupRow!, 'getBoundingClientRect').mockReturnValue({
      bottom: 140,
      height: 40,
      left: 0,
      right: 260,
      toJSON: () => ({}),
      top: 100,
      width: 260,
      x: 0,
      y: 100,
    })

    fireEvent.dragStart(
      view.getByRole('button', {name: 'mesh-preview 레이어 선택'}).closest('[role="treeitem"]')!,
    )
    groupRow!.dispatchEvent(
      new MouseEvent('dragover', {bubbles: true, cancelable: true, clientY: 120}),
    )
    expect(groupRow).toHaveClass('drop-inside')
    groupRow!.dispatchEvent(new MouseEvent('drop', {bubbles: true, cancelable: true, clientY: 120}))

    expect(document().scene?.roots).toHaveLength(1)
    expect(document().scene?.roots[0]).toMatchObject({
      children: [{id: 'shape-circle'}, {id: 'shape-diamond'}, {id: 'mesh-preview'}],
      id: 'shapes',
    })

    const currentGroupRow = view
      .getByRole('button', {name: 'Shapes 레이어 선택'})
      .closest('[role="treeitem"]')
      ?.querySelector<HTMLElement>('.layer-row')
    const nestedPart = view
      .getByRole('button', {name: 'mesh-preview 레이어 선택'})
      .closest('[role="treeitem"]')

    expect(currentGroupRow).not.toBeNull()
    vi.spyOn(currentGroupRow!, 'getBoundingClientRect').mockReturnValue({
      bottom: 140,
      height: 40,
      left: 0,
      right: 260,
      toJSON: () => ({}),
      top: 100,
      width: 260,
      x: 0,
      y: 100,
    })
    fireEvent.dragStart(nestedPart!)
    currentGroupRow!.dispatchEvent(
      new MouseEvent('dragover', {bubbles: true, cancelable: true, clientY: 139}),
    )
    expect(currentGroupRow).toHaveClass('drop-after')
    currentGroupRow!.dispatchEvent(
      new MouseEvent('drop', {bubbles: true, cancelable: true, clientY: 139}),
    )

    expect(document().scene?.roots.map((node) => node.id)).toEqual(['mesh-preview', 'shapes'])
  })

  test('should ignore external drags without leaving drop feedback active', () => {
    const view = render(() => <EditorLayerPanel document={createDemoDocument()} />)
    const groupRow = view
      .getByRole('button', {name: 'Shapes 레이어 선택'})
      .closest('[role="treeitem"]')
      ?.querySelector<HTMLElement>('.layer-row')

    expect(groupRow).not.toBeNull()
    vi.spyOn(groupRow!, 'getBoundingClientRect').mockReturnValue({
      bottom: 140,
      height: 40,
      left: 0,
      right: 260,
      toJSON: () => ({}),
      top: 100,
      width: 260,
      x: 0,
      y: 100,
    })
    const dragOver = new MouseEvent('dragover', {
      bubbles: true,
      cancelable: true,
      clientY: 120,
    })

    expect(groupRow!.dispatchEvent(dragOver)).toBe(true)
    expect(groupRow).not.toHaveClass('drop-inside')
  })
})

test('should rename a part by double click and cancel with Escape', () => {
  const [document, setDocument] = createSignal(createDemoDocument())
  const view = render(() => (
    <EditorLayerPanel document={document()} onDocumentChange={setDocument} />
  ))
  fireEvent.dblClick(view.getByRole('button', {name: 'mesh-preview 레이어 선택'}))
  const input = view.getByRole('textbox', {name: 'mesh-preview 파츠 이름'})
  fireEvent.input(input, {target: {value: '몸통'}})
  fireEvent.keyDown(input, {key: 'Enter'})
  expect(view.getByRole('button', {name: '몸통 레이어 선택'})).toBeVisible()
  expect(document().parts[0]!.id).toBe('mesh-preview')
  fireEvent.dblClick(view.getByRole('button', {name: '몸통 레이어 선택'}))
  fireEvent.input(view.getByRole('textbox', {name: '몸통 파츠 이름'}), {target: {value: '취소'}})
  fireEvent.keyDown(view.getByRole('textbox', {name: '몸통 파츠 이름'}), {key: 'Escape'})
  expect(view.getByRole('button', {name: '몸통 레이어 선택'})).toBeVisible()
})

test('should show frontmost siblings first and move an upper layer in front', () => {
  const [document, setDocument] = createSignal<PuppetDocument>(createDemoDocument())
  const [selection, setSelection] = createSignal<SceneSelection>({
    activeNodeId: 'shape-circle',
    nodeIds: ['shape-circle'],
  })
  const view = render(() => (
    <EditorLayerPanel
      document={document()}
      onDocumentChange={setDocument}
      selection={selection()}
      onSelectionChange={setSelection}
    />
  ))
  const names = () =>
    view
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label'))
      .filter((name) => name?.endsWith('레이어 선택'))
  expect(names()).toEqual([
    'Shapes 레이어 선택',
    'shape-diamond 레이어 선택',
    'shape-circle 레이어 선택',
    'mesh-preview 레이어 선택',
  ])
  fireEvent.click(view.getByRole('button', {name: '선택 레이어 위로 이동'}))
  expect(names()).toEqual([
    'Shapes 레이어 선택',
    'shape-circle 레이어 선택',
    'shape-diamond 레이어 선택',
    'mesh-preview 레이어 선택',
  ])
  const group = document().scene?.roots.find((node) => node.id === 'shapes')
  expect(group).toMatchObject({children: [{id: 'shape-diamond'}, {id: 'shape-circle'}]})
  fireEvent.click(view.getByRole('button', {name: '선택 레이어 아래로 이동'}))
  expect(names()[1]).toBe('shape-diamond 레이어 선택')
})

test('should place a layer at the back when dropped below the root list', () => {
  const [document, setDocument] = createSignal<PuppetDocument>(createDemoDocument())
  const view = render(() => (
    <EditorLayerPanel document={document()} onDocumentChange={setDocument} />
  ))
  fireEvent.dragStart(
    view.getByRole('button', {name: 'shape-circle 레이어 선택'}).closest('[role="treeitem"]')!,
  )
  fireEvent.drop(view.getByRole('tree', {name: '모델 레이어'}))
  expect(document().scene?.roots.map((node) => node.id)).toEqual([
    'shape-circle',
    'mesh-preview',
    'shapes',
  ])
})

test.each(['.layers-panel', '.layer-scroll', '.layer-tree', '.layer-toolbar', '.layer-statistics'])(
  'should clear all selected layers when clicking empty space in %s',
  (selector) => {
    const [selection, setSelection] = createSignal<SceneSelection>({
      activeNodeId: 'shape-circle',
      nodeIds: ['shape-circle', 'shapes'],
    })
    const onDocumentChange = vi.fn()
    const view = render(() => (
      <EditorLayerPanel
        document={createDemoDocument()}
        selection={selection()}
        onSelectionChange={setSelection}
        onDocumentChange={onDocumentChange}
      />
    ))
    fireEvent.click(view.container.querySelector(selector)!)
    expect(selection()).toEqual({activeNodeId: null, nodeIds: []})
    expect(view.queryAllByRole('treeitem', {selected: true})).toHaveLength(0)
    expect(onDocumentChange).not.toHaveBeenCalled()
    fireEvent.click(view.getByRole('button', {name: 'shape-circle 레이어 선택'}))
    expect(selection().activeNodeId).toBe('shape-circle')
    fireEvent.click(view.getByRole('button', {name: 'Shapes 접기'}))
    expect(selection().activeNodeId).toBe('shape-circle')
  },
)

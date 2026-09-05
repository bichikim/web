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
      .querySelector<SVGSVGElement>('[data-layer-icon="group"]')
    const deformerIcon = view
      .getByRole('button', {name: '새 자유 변형 디포머 레이어 선택'})
      .querySelector<SVGSVGElement>('[data-layer-icon="deformer"]')

    expect(groupIcon).not.toBeNull()
    expect(deformerIcon).not.toBeNull()
    expect(groupIcon?.querySelectorAll('rect')).toHaveLength(2)
    expect(deformerIcon?.querySelectorAll('circle')).toHaveLength(4)
    expect(groupIcon?.innerHTML).not.toBe(deformerIcon?.innerHTML)
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

  test('should pick an available mask part without changing the layer selection', () => {
    const onMaskPick = vi.fn()
    const onSelectionChange = vi.fn()
    const view = render(() => (
      <EditorLayerPanel
        document={createDemoDocument()}
        maskPickTargetPartId="shape-circle"
        onMaskPick={onMaskPick}
        onSelectionChange={onSelectionChange}
      />
    ))

    expect(view.getByRole('button', {name: 'shape-circle 레이어 선택'})).toBeDisabled()
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

    expect(view.getByRole('button', {name: '새 자유 변형 디포머 레이어 선택'})).toBeDefined()
    expect(document().scene?.roots[0]).toMatchObject({
      children: [{id: 'mesh-preview'}, {id: 'shape-circle'}],
      columns: 2,
      kind: 'deformer',
      rows: 2,
    })

    fireEvent.click(view.getByRole('button', {name: '새 자유 변형 디포머 레이어 선택'}))

    expect(
      view
        .getByRole('button', {name: '새 자유 변형 디포머 레이어 선택'})
        .closest('[role="treeitem"]')
        ?.getAttribute('aria-selected'),
    ).toBe('true')
    fireEvent.dblClick(view.getByRole('button', {name: '새 자유 변형 디포머 레이어 선택'}))
    const groupNameInput = view.getByRole('textbox', {
      name: '새 자유 변형 디포머 그룹 이름',
    })

    fireEvent.input(groupNameInput, {target: {value: 'Face'}})
    fireEvent.keyDown(groupNameInput, {key: 'Enter'})

    expect(view.queryByRole('textbox', {name: '새 자유 변형 디포머 그룹 이름'})).toBeNull()
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

    expect(document().scene?.roots.map((node) => node.id)).toEqual(['shapes', 'mesh-preview'])
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

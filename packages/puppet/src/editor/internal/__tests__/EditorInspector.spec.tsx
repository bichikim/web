/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, test, vi} from 'vitest'

import {isTwoDimensionalParameterBinding} from '../../../deformation'
import {createDemoDocument, getDocumentScene, type PuppetDocument} from '../../../player'
import {getDeformerAngle} from '../deformer-transform'
import {addParameter, insertParameterKeyform} from '../parameter-keyforms'
import {createParameterPreview} from '../parameter-sampling'
import {createDeformer, setSceneNodeState} from '../scene-graph'
import {EditorInspector} from '../EditorInspector'

describe('EditorInspector', () => {
  test('should omit document metadata while retaining operational notices', () => {
    const view = render(() => (
      <EditorInspector document={createDemoDocument()} notice="편집 결과" />
    ))

    expect(view.queryByText('Renderer')).toBeNull()
    expect(view.queryByText('Format')).toBeNull()
    expect(view.queryByText('Version')).toBeNull()
    expect(view.queryByText('Part')).toBeNull()
    expect(view.queryByText('Triangles')).toBeNull()
    expect(view.queryByText('PNG 메시 정점을 편집한 뒤 JSON으로 저장할 수 있습니다.')).toBeNull()
    expect(view.getByRole('heading', {name: '선택 작업'})).toBeDefined()
    expect(view.getByText('편집 결과')).toBeDefined()
  })

  test('should show part actions only for a selected part', () => {
    const document = createDemoDocument()
    const group = getDocumentScene(document).roots.find((node) => node.kind === 'group')!
    const [activeNodeId, setActiveNodeId] = createSignal('mesh-preview')
    const onAutoMesh = vi.fn()
    const onContainerUnwrap = vi.fn()
    const view = render(() => (
      <EditorInspector
        activeNodeId={activeNodeId()}
        autoMeshAvailable={activeNodeId() === 'mesh-preview'}
        containerUnwrapAvailable={activeNodeId() === group.id}
        document={document}
        onAutoMesh={onAutoMesh}
        onContainerUnwrap={onContainerUnwrap}
      />
    ))

    fireEvent.click(view.getByRole('button', {name: '자동 메시'}))
    expect(onAutoMesh).toHaveBeenCalledOnce()

    setActiveNodeId(group.id)
    expect(view.queryByRole('button', {name: '자동 메시'})).toBeNull()
    fireEvent.click(view.getByRole('button', {name: '컨테이너 해제'}))
    expect(onContainerUnwrap).toHaveBeenCalledOnce()
  })

  test('should edit rest rendering properties without an active parameter keyform', () => {
    const source = createDemoDocument()
    const [document, setDocument] = createSignal({
      ...source,
      parts: source.parts.map((part) =>
        part.id === 'shape-circle' ? {...part, properties: undefined} : part,
      ),
    })
    const view = render(() => (
      <EditorInspector
        activeNodeId="mesh-preview"
        document={document()}
        editMode="parameter"
        onDocumentChange={setDocument}
      />
    ))

    expect(view.getByRole('combobox', {name: '파트 블렌드 모드'})).toBeEnabled()
    expect(view.getByRole('spinbutton', {name: '파트 불투명도'})).toBeEnabled()
    expect(view.getByRole('checkbox', {name: 'shape-circle로 자르기'})).toBeEnabled()
    expect(view.queryByRole('spinbutton', {name: '파트 그리기 순서'})).toBeNull()
    fireEvent.input(view.getByRole('spinbutton', {name: '파트 불투명도'}), {
      target: {value: '0.4'},
    })
    fireEvent.change(view.getByRole('combobox', {name: '파트 블렌드 모드'}), {
      target: {value: 'screen'},
    })
    fireEvent.click(view.getByRole('checkbox', {name: 'shape-circle로 자르기'}))
    fireEvent.click(view.getByRole('checkbox', {name: '마스크 반전'}))
    fireEvent.click(view.getByRole('checkbox', {name: '파츠도 계속 표시'}))

    expect(document().parts[0]?.properties).toEqual({
      blendMode: 'screen',
      clippingMaskIds: ['shape-circle'],
      invertedMask: true,
      opacity: 0.4,
      renderWhenUsedAsMask: true,
    })
  })

  test('should disable mask candidates that would close a cycle', () => {
    const view = render(() => (
      <EditorInspector
        activeNodeId="mesh-preview"
        document={createDemoDocument()}
        editMode="parameter"
      />
    ))

    const circleMask = view.getByRole('checkbox', {name: 'shape-circle로 자르기'})

    expect(circleMask).toBeDisabled()
    expect(circleMask.closest('label')).toHaveAttribute(
      'title',
      '이 파트를 마스크로 지정하면 순환 참조가 생깁니다.',
    )
    expect(view.getByRole('checkbox', {name: 'shape-diamond로 자르기'})).toBeDisabled()
  })

  test('should edit render values on an active part keyform while keeping model controls enabled', () => {
    const source = createDemoDocument()
    const binding = source.parameterBindings![0]!
    const [document, setDocument] = createSignal(source)
    const view = render(() => (
      <EditorInspector
        activeBindingId={binding.id}
        activeKeyformValues={[30, 0]}
        activeNodeId="mesh-preview"
        document={document()}
        editMode="parameter"
        onDocumentChange={setDocument}
        previewDocument={createParameterPreview({
          document: document(),
          parameterValues: {'angle-x': 30, 'angle-y': 0},
        })}
        targetNodeIds={['mesh-preview']}
      />
    ))

    fireEvent.input(view.getByRole('spinbutton', {name: '파트 불투명도'}), {
      target: {value: '0.3'},
    })

    expect(view.getByRole('combobox', {name: '파트 블렌드 모드'})).toBeEnabled()
    expect(document().parts[0]?.properties).toBeUndefined()
    const properties = document().parameterBindings?.[0]?.keyforms[5]?.parts[0]?.properties
    expect(Object.keys(properties ?? {})).toEqual(['opacity'])
    expect(properties?.opacity).toBeCloseTo(0.3)
  })

  test('should preserve the requested composed opacity across multiple parameter bindings', () => {
    const source = createDemoDocument()
    const binding = source.parameterBindings![0]!
    if (!isTwoDimensionalParameterBinding(binding)) {
      throw new Error('Expected a two-dimensional demo parameter')
    }
    const documentWithSecondBinding: PuppetDocument = {
      ...source,
      parameterBindings: [
        binding,
        {
          ...binding,
          id: 'secondary-opacity',
          keyforms: binding.keyforms.map((keyform) => ({
            ...keyform,
            parts: keyform.parts.map((part) => ({...part, properties: {opacity: 0.8}})),
          })),
        },
      ],
    }
    const [document, setDocument] = createSignal(documentWithSecondBinding)
    const parameterValues = {'angle-x': 30, 'angle-y': 0}
    const view = render(() => (
      <EditorInspector
        activeBindingId={binding.id}
        activeKeyformValues={[30, 0]}
        activeNodeId="mesh-preview"
        document={document()}
        editMode="parameter"
        onDocumentChange={setDocument}
        previewDocument={createParameterPreview({document: document(), parameterValues})}
        targetNodeIds={['mesh-preview']}
      />
    ))

    expect(view.getByRole('spinbutton', {name: '파트 불투명도'})).toHaveValue(0.8)
    fireEvent.input(view.getByRole('spinbutton', {name: '파트 불투명도'}), {
      target: {value: '0.7'},
    })

    const preview = createParameterPreview({document: document(), parameterValues})
    expect(preview.parts[0]?.properties?.opacity).toBeCloseTo(0.7)
    const properties = document().parameterBindings?.[0]?.keyforms[5]?.parts[0]?.properties
    expect(Object.keys(properties ?? {})).toEqual(['opacity'])
    expect(properties?.opacity).toBeCloseTo(0.9)
  })

  test('should disable model-only part rendering controls in animation mode', () => {
    const view = render(() => (
      <EditorInspector
        activeNodeId="mesh-preview"
        document={createDemoDocument()}
        editMode="motion"
      />
    ))

    expect(view.getByRole('combobox', {name: '파트 블렌드 모드'})).toBeDisabled()
    expect(view.getByRole('checkbox', {name: 'shape-circle로 자르기'})).toBeDisabled()
    expect(view.getByRole('checkbox', {name: '마스크 반전'})).toBeDisabled()
    expect(view.getByRole('checkbox', {name: '파츠도 계속 표시'})).toBeDisabled()
  })

  test('should show the selected container conversion action in both directions', () => {
    const [targetKind, setTargetKind] = createSignal<'deformer' | 'group'>('deformer')
    const onContainerConvert = vi.fn()
    const view = render(() => (
      <EditorInspector
        containerConversionTarget={targetKind()}
        document={createDemoDocument()}
        onContainerConvert={onContainerConvert}
      />
    ))

    fireEvent.click(view.getByRole('button', {name: '자유 변형 디포머로 변경'}))
    expect(onContainerConvert).toHaveBeenCalledOnce()

    setTargetKind('group')
    fireEvent.click(view.getByRole('button', {name: '그룹으로 변경'}))
    expect(onContainerConvert).toHaveBeenCalledTimes(2)
  })

  test('should separate grid settings and render only the selected control points', () => {
    const deformerDocument = createDeformer(createDemoDocument(), ['mesh-preview'])!
    const deformer = getDocumentScene(deformerDocument).roots[0]!
    const [selectedPointIndices, setSelectedPointIndices] = createSignal<ReadonlyArray<number>>([])
    const view = render(() => (
      <EditorInspector
        activeNodeId={deformer.id}
        document={deformerDocument}
        selectedControlPointIndices={selectedPointIndices()}
      />
    ))

    expect(view.getByRole('group', {name: '회전'})).toBeVisible()
    expect(view.getByRole('group', {name: '격자'})).toBeVisible()
    expect(view.queryByRole('group', {name: /선택한 제어점/})).toBeNull()
    expect(view.queryByRole('spinbutton', {name: /격자 제어점/})).toBeNull()

    setSelectedPointIndices([0, 1])

    expect(view.getByRole('group', {name: '선택한 제어점 1'})).toBeVisible()
    expect(view.getByRole('group', {name: '선택한 제어점 2'})).toBeVisible()
    expect(view.getByRole('spinbutton', {name: '격자 제어점 1 X'})).toBeVisible()
    expect(view.getByRole('spinbutton', {name: '격자 제어점 2 X'})).toBeVisible()
    expect(view.getByRole('spinbutton', {name: '격자 제어점 2 Y'})).toBeVisible()

    setSelectedPointIndices([])
    expect(view.queryByRole('group', {name: /선택한 제어점/})).toBeNull()
  })

  test('should edit transform and control-point values', () => {
    const deformerDocument = createDeformer(createDemoDocument(), ['mesh-preview'])!
    const deformer = getDocumentScene(deformerDocument).roots[0]!
    const [document, setDocument] = createSignal<PuppetDocument>(deformerDocument)
    const view = render(() => (
      <EditorInspector
        activeNodeId={deformer.id}
        document={document()}
        onDocumentChange={setDocument}
        selectedControlPointIndices={[0]}
      />
    ))

    fireEvent.input(view.getByRole('spinbutton', {name: '자유 변형 각도'}), {
      target: {value: '30'},
    })
    const rotated = getDocumentScene(document()).roots[0]
    expect(rotated?.kind === 'deformer' ? getDeformerAngle(rotated) : undefined).toBeCloseTo(30)

    const rotatedPoints = rotated?.kind === 'deformer' ? rotated.controlPoints : []
    fireEvent.input(view.getByRole('spinbutton', {name: '자유 변형 회전 중심 X'}), {
      target: {value: '400'},
    })
    const movedOrigin = getDocumentScene(document()).roots[0]
    expect(movedOrigin?.kind === 'deformer' ? movedOrigin.rotationOrigin : undefined).toEqual({
      x: 400,
      y: 240,
    })
    expect(movedOrigin?.kind === 'deformer' ? movedOrigin.controlPoints : []).toEqual(rotatedPoints)

    fireEvent.input(view.getByRole('spinbutton', {name: '격자 제어점 1 X'}), {
      target: {value: '25'},
    })
    const edited = getDocumentScene(document()).roots[0]
    expect(edited?.kind === 'deformer' ? edited.controlPoints[0] : undefined).toBe(25)
  })

  test('should add and remove curve handles for individual grid points', () => {
    const deformerDocument = createDeformer(createDemoDocument(), ['mesh-preview'])!
    const deformer = getDocumentScene(deformerDocument).roots[0]!
    const [document, setDocument] = createSignal(deformerDocument)
    const view = render(() => (
      <EditorInspector
        activeNodeId={deformer.id}
        document={document()}
        onDocumentChange={setDocument}
        selectedControlPointIndices={[0]}
      />
    ))

    fireEvent.click(view.getByRole('button', {name: '격자 제어점 1 곡률 핸들 추가'}))
    const added = getDocumentScene(document()).roots[0]
    expect(added?.kind === 'deformer' ? added.curveHandles : undefined).toHaveLength(1)
    expect(view.getByRole('button', {name: '격자 제어점 1 곡률 핸들 삭제'})).toBeEnabled()

    fireEvent.click(view.getByRole('button', {name: '격자 제어점 1 곡률 핸들 삭제'}))
    const removed = getDocumentScene(document()).roots[0]
    expect(removed?.kind === 'deformer' ? removed.curveHandles : undefined).toEqual([])
  })

  test('should add curve handles while editing a connected parameter', () => {
    const source = {...createDemoDocument(), motions: [], parameterBindings: [], parameters: []}
    const deformerDocument = createDeformer(source, ['mesh-preview'])!
    const deformer = getDocumentScene(deformerDocument).roots[0]!
    const added = addParameter({document: deformerDocument, nodeIds: [deformer.id]})!
    const [document, setDocument] = createSignal(added.document)
    const view = render(() => (
      <EditorInspector
        activeBindingId={added.binding.id}
        activeKeyformValues={[0]}
        activeNodeId={deformer.id}
        document={document()}
        editMode="parameter"
        previewDocument={createParameterPreview({
          document: document(),
          parameterValues: {[added.binding.parameterIds[0]]: 0},
        })}
        onDocumentChange={setDocument}
        selectedControlPointIndices={[0]}
        targetNodeIds={[deformer.id]}
      />
    ))

    fireEvent.click(view.getByRole('button', {name: '격자 제어점 1 곡률 핸들 추가'}))

    const sceneDeformer = getDocumentScene(document()).roots[0]
    expect(
      sceneDeformer?.kind === 'deformer' ? sceneDeformer.curveHandles : undefined,
    ).toHaveLength(1)
    expect(
      document().parameterBindings?.[0]?.keyforms[0]?.deformers?.[0]?.curveHandles,
    ).toHaveLength(1)
    expect(view.getByRole('button', {name: '격자 제어점 1 곡률 핸들 삭제'})).toBeEnabled()
  })

  test('should show and edit the selected parameter deformer keyform', () => {
    const source = {...createDemoDocument(), motions: [], parameterBindings: [], parameters: []}
    const deformerDocument = createDeformer(source, ['mesh-preview'])!
    const deformer = getDocumentScene(deformerDocument).roots[0]!
    const added = addParameter({document: deformerDocument, nodeIds: [deformer.id]})!
    const inserted = insertParameterKeyform({
      bindingId: added.binding.id,
      document: added.document,
      values: [30],
    })!
    const [document, setDocument] = createSignal(inserted)
    const view = render(() => (
      <EditorInspector
        activeBindingId={added.binding.id}
        activeKeyformValues={[30]}
        activeNodeId={deformer.id}
        document={document()}
        editMode="parameter"
        previewDocument={createParameterPreview({
          document: document(),
          parameterValues: {[added.binding.parameterIds[0]]: 30},
        })}
        onDocumentChange={setDocument}
        targetNodeIds={[deformer.id]}
      />
    ))

    fireEvent.input(view.getByRole('spinbutton', {name: '자유 변형 각도'}), {
      target: {value: '45'},
    })

    const stored = document().parameterBindings?.find((binding) => binding.id === added.binding.id)
      ?.keyforms[1]?.deformers?.[0]
    const rest = getDocumentScene(document()).roots[0]
    const storedDeformer =
      deformer.kind === 'deformer' && stored?.kind === 'deformer'
        ? {...deformer, controlPoints: stored.controlPoints}
        : undefined
    expect(storedDeformer === undefined ? undefined : getDeformerAngle(storedDeformer)).toBeCloseTo(
      45,
    )
    expect(rest?.kind === 'deformer' ? getDeformerAngle(rest) : undefined).toBeCloseTo(0)
  })

  test('should edit the rest deformer outside the active parameter', () => {
    const source = createDemoDocument()
    const deformerDocument = createDeformer(source, ['mesh-preview'])!
    const deformer = getDocumentScene(deformerDocument).roots[0]!
    const binding = deformerDocument.parameterBindings?.[0]
    const onDocumentChange = vi.fn()
    const view = render(() => (
      <EditorInspector
        activeBindingId={binding?.id}
        activeKeyformValues={binding?.keyforms[0]?.values}
        activeNodeId={deformer.id}
        document={deformerDocument}
        editMode="parameter"
        onDocumentChange={onDocumentChange}
        previewDocument={deformerDocument}
        selectedControlPointIndices={[0]}
        targetNodeIds={binding?.targetPartIds}
      />
    ))
    const input = view.getByRole('spinbutton', {name: '격자 제어점 1 X'})

    expect(input).toBeEnabled()
    fireEvent.input(input, {target: {value: '25'}})
    expect(onDocumentChange).toHaveBeenCalledOnce()
    const updated = onDocumentChange.mock.calls[0]?.[0] as PuppetDocument
    const updatedDeformer = getDocumentScene(updated).roots[0]
    expect(
      updatedDeformer?.kind === 'deformer' ? updatedDeformer.controlPoints.slice(0, 2) : [],
    ).toEqual([25, 0])
  })

  test('should change grid divisions and preserve a valid document', () => {
    const deformerDocument = createDeformer(createDemoDocument(), ['mesh-preview'])!
    const deformer = getDocumentScene(deformerDocument).roots[0]!
    const [document, setDocument] = createSignal(deformerDocument)
    const view = render(() => (
      <EditorInspector
        activeNodeId={deformer.id}
        document={document()}
        onDocumentChange={setDocument}
        selectedControlPointIndices={[0]}
      />
    ))

    fireEvent.input(view.getByRole('spinbutton', {name: '격자 가로 칸'}), {
      target: {value: '3'},
    })
    fireEvent.input(view.getByRole('spinbutton', {name: '격자 세로 칸'}), {
      target: {value: '1'},
    })

    const resized = getDocumentScene(document()).roots[0]
    expect(resized).toMatchObject({columns: 3, rows: 1})
    expect(view.getAllByRole('spinbutton', {name: /격자 제어점/})).toHaveLength(2)

    setDocument(setSceneNodeState({document: document(), locked: true, nodeId: deformer.id})!)
    expect(view.getByRole('spinbutton', {name: '격자 가로 칸'})).toBeDisabled()
    expect(view.getByRole('spinbutton', {name: '격자 제어점 1 X'})).toBeDisabled()
  })
})

/** @vitest-environment jsdom */

import {fireEvent, render, screen, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, test, vi} from 'vitest'

import {isTwoDimensionalParameterBinding} from '../../../deformation'
import {generateSpatialMesh} from '../../../deformation/generate-spatial-mesh'
import {resolveSpatialMeshAttachment} from '../../../deformation/bind-spatial-mesh'
import {getSpatialPartPose} from '../../../player/internal/spatial-part'
import {
  createDemoDocument,
  getDocumentScene,
  parseDocument,
  type PuppetDocument,
} from '../../../player'
import {createEmptyDocument} from '../../../player/create-empty-document'
import {getDeformerAngle} from '../deformer-transform'
import {
  addParameter,
  connectParameterNodes,
  insertParameterKeyform,
  setParameterKeyformDeformerControlPoints,
} from '../parameter-keyforms'
import {createParameterPreview} from '../parameter-sampling'
import {createDeformer, setSceneNodeState} from '../scene-graph'
import {EditorInspector} from '../EditorInspector'
import {convertSceneContainers} from '../container-conversion'
import {setSpatialMesh} from '../set-spatial-mesh'
import {createSpatialSurface} from '../set-spatial-surface'

const createMaskCycleDocument = (): PuppetDocument => {
  const createPart = (id: string, clippingMaskIds: ReadonlyArray<string> = []) => ({
    id,
    mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices: [0, 0, 1, 0, 0, 1]},
    properties: {clippingMaskIds},
    texture: {
      height: 1,
      src: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=',
      width: 1,
    },
  })

  return {
    ...createEmptyDocument(),
    parts: [
      createPart('mesh-preview'),
      createPart('shape-circle', ['mesh-preview']),
      createPart('shape-diamond', ['mesh-preview']),
    ],
  }
}

describe('EditorInspector', () => {
  test('should show controls for the selected node', () => {
    const document = createDeformer(createDemoDocument(), ['mesh-preview'])!
    const [activeNodeId, setActiveNodeId] = createSignal<string>()
    const view = render(() => (
      <EditorInspector activeNodeId={activeNodeId()} document={document} editMode="parameter" />
    ))

    expect(view.queryByRole('group', {name: '파트 렌더링'})).toBeNull()
    expect(view.queryByRole('spinbutton', {name: '자유 변형 각도'})).toBeNull()

    setActiveNodeId('mesh-preview')
    expect(view.getByRole('group', {name: '파트 렌더링'})).toBeInTheDocument()
    expect(view.queryByRole('spinbutton', {name: '자유 변형 각도'})).toBeNull()

    setActiveNodeId('deformer')
    expect(view.queryByRole('group', {name: '파트 렌더링'})).toBeNull()
    expect(view.getByRole('spinbutton', {name: '자유 변형 각도'})).toBeInTheDocument()
  })

  test('should show shared 3D move, scale, and rotation controls for a selected 3D deformer', () => {
    const document = convertSceneContainers({
      document: createDemoDocument(),
      nodeIds: ['shapes'],
      targetKind: 'spatial',
    })!
    const view = render(() => (
      <EditorInspector activeNodeId="shapes" document={document} editMode="parameter" />
    ))
    expect(view.getByRole('group', {name: '3D 디포머'})).toBeDefined()
    expect(view.getByRole('spinbutton', {name: '3D 변형 중심 X'})).toBeEnabled()
    expect(view.getByRole('spinbutton', {name: '3D 회전 X'})).toBeEnabled()
    expect(view.getByRole('spinbutton', {name: '3D 이동 X'})).toHaveValue(0)
    expect(view.getByRole('spinbutton', {name: '3D 크기 X'})).toHaveValue(1)
    expect(view.queryByRole('spinbutton', {name: '3D 메시 위치 X'})).toBeNull()
    expect(view.getByRole('button', {name: '메시 만들기'})).toBeEnabled()
    expect(view.queryByRole('spinbutton', {name: '자유 변형 각도'})).toBeNull()
  })

  test('should edit the bind mesh position separately from 3D pose movement', () => {
    const source = convertSceneContainers({
      document: createDemoDocument(),
      nodeIds: ['shapes'],
      targetKind: 'spatial',
    })!
    const mesh = generateSpatialMesh({
      operations: [
        {center: [388, 243, 0], id: 'box', mode: 'add', shape: 'box', size: [600, 500, 80]},
      ],
    })
    const [document, setDocument] = createSignal(
      setSpatialMesh({document: source, mesh, nodeId: 'shapes'})!,
    )
    const view = render(() => (
      <EditorInspector
        activeNodeId="shapes"
        document={document()}
        editMode="parameter"
        onDocumentChange={setDocument}
      />
    ))

    const inspector = view.getByRole('complementary', {name: '선택 작업'})
    const meshPositionInput = view.getByRole('spinbutton', {name: '3D 메시 위치 X'})
    inspector.scrollTop = 120
    meshPositionInput.focus()

    fireEvent.input(meshPositionInput, {
      target: {value: '24'},
    })
    expect(view.getByRole('spinbutton', {name: '3D 메시 위치 X'})).toBe(meshPositionInput)
    expect(view.container.ownerDocument.activeElement).toBe(meshPositionInput)
    expect(inspector.scrollTop).toBe(120)
    expect(getDocumentScene(document()).roots.find((node) => node.id === 'shapes')).toMatchObject({
      spatialMeshPosition: [24, 0, 0],
      spatialTranslation: [0, 0, 0],
    })
    expect(view.getByRole('spinbutton', {name: '3D 이동 X'})).toHaveValue(0)
  })

  test('should store 3D rotation in a connected parameter keyform', () => {
    const source = convertSceneContainers({
      document: {...createDemoDocument(), motions: [], parameterBindings: [], parameters: []},
      nodeIds: ['shapes'],
      targetKind: 'spatial',
    })!
    const added = addParameter({document: source, nodeIds: ['mesh-preview']})!
    const connected = connectParameterNodes({
      bindingId: added.binding.id,
      document: added.document,
      nodeIds: ['shapes'],
    })!
    const inserted = insertParameterKeyform({
      bindingId: added.binding.id,
      document: connected,
      values: [30],
    })!
    const [document, setDocument] = createSignal(inserted)
    const preview = () =>
      createParameterPreview({
        document: document(),
        parameterValues: {[added.binding.parameterIds[0]]: 30},
      })
    const view = render(() => (
      <EditorInspector
        activeBindingId={added.binding.id}
        activeKeyformValues={[30]}
        activeNodeId="shapes"
        document={document()}
        editMode="parameter"
        previewDocument={preview()}
        onDocumentChange={setDocument}
        targetNodeIds={['shapes']}
      />
    ))

    fireEvent.input(view.getByRole('spinbutton', {name: '3D 회전 Y'}), {target: {value: '45'}})
    fireEvent.input(view.getByRole('spinbutton', {name: '3D 이동 X'}), {target: {value: '12'}})
    fireEvent.input(view.getByRole('spinbutton', {name: '3D 크기 Z'}), {target: {value: '1.5'}})
    fireEvent.input(view.getByRole('spinbutton', {name: '3D 변형 중심 Z'}), {
      target: {value: '8'},
    })

    expect(document().parameterBindings?.[0]?.keyforms[1]?.deformers?.[0]).toMatchObject({
      spatialOrigin: [expect.any(Number), expect.any(Number), 8],
      spatialRotation: [0, 45, 0],
      spatialScale: [1, 1, 1.5],
      spatialTranslation: [12, 0, 0],
    })
    const rest = getDocumentScene(document()).roots.find((node) => node.id === 'shapes')
    const posed = getDocumentScene(preview()).roots.find((node) => node.id === 'shapes')
    expect(rest).toMatchObject({
      spatialOrigin: [expect.any(Number), expect.any(Number), 0],
      spatialRotation: [0, 0, 0],
      spatialScale: [1, 1, 1],
      spatialTranslation: [0, 0, 0],
    })
    expect(posed).toMatchObject({
      spatialOrigin: [expect.any(Number), expect.any(Number), 8],
      spatialRotation: [0, 45, 0],
      spatialScale: [1, 1, 1.5],
      spatialTranslation: [12, 0, 0],
    })
    expect(parseDocument(JSON.stringify(document())).ok).toBe(true)
  })

  test('should edit a grouped 3D part surface without duplicate rotation controls', () => {
    const source = convertSceneContainers({
      document: createDemoDocument(),
      nodeIds: ['shapes'],
      targetKind: 'spatial',
    })!
    const [document, setDocument] = createSignal(source)
    const view = render(() => (
      <EditorInspector
        activeNodeId="shape-circle"
        document={document()}
        editMode="parameter"
        onDocumentChange={setDocument}
      />
    ))
    expect(view.getByRole('spinbutton', {name: '3D 제어점 Z'})).toBeEnabled()
    expect(view.queryByRole('button', {name: '3D 면 추가'})).toBeNull()
    expect(view.queryByRole('button', {name: '3D 면 제거'})).toBeNull()
    expect(view.queryByRole('textbox', {name: '공유 그룹'})).toBeNull()
    expect(view.queryByRole('spinbutton', {name: '3D 변형 중심 X'})).toBeNull()
    expect(view.queryByText('회전 중심과 파라미터는 3D 디포머에서 설정합니다.')).toBeNull()

    fireEvent.input(view.getByRole('spinbutton', {name: '3D 제어점 Z'}), {
      target: {value: '12'},
    })
    expect(
      document().parts.find((part) => part.id === 'shape-circle')?.spatial?.controlPoints[2],
    ).toBe(12)
  })

  test('should retain a sculpted image vertex offset from its attached 3D triangle', () => {
    const converted = convertSceneContainers({
      document: createDemoDocument(),
      nodeIds: ['shapes'],
      targetKind: 'spatial',
    })!
    const mesh = generateSpatialMesh({
      operations: [
        {center: [388, 243, 0], id: 'body', mode: 'add', shape: 'box', size: [600, 500, 80]},
      ],
      resolution: 8,
    })
    const [document, setDocument] = createSignal(
      setSpatialMesh({document: converted, mesh, nodeId: 'shapes'})!,
    )
    const part = () => document().parts.find((candidate) => candidate.id === 'shape-circle')!
    const previous = part().spatial!.controlPoints[2]!
    const view = render(() => (
      <EditorInspector
        activeNodeId="shape-circle"
        document={document()}
        editMode="parameter"
        onDocumentChange={setDocument}
      />
    ))
    fireEvent.input(view.getByRole('spinbutton', {name: '3D 제어점 Z'}), {
      target: {value: String(previous + 7)},
    })
    const attachment = part().spatial!.attachments![0]!
    expect(attachment.offset[2]).toBe(7)
    expect(resolveSpatialMeshAttachment(mesh, attachment)?.[2]).toBeCloseTo(previous + 7)
    expect(parseDocument(JSON.stringify(document())).ok).toBe(true)
  })

  test('should not offer a separate 3D surface for a grouped part without control points', () => {
    const source = convertSceneContainers({
      document: createDemoDocument(),
      nodeIds: ['shapes'],
      targetKind: 'spatial',
    })!
    const document = {
      ...source,
      parts: source.parts.map((part) =>
        part.id === 'shape-circle' ? {...part, spatial: undefined} : part,
      ),
    }
    const view = render(() => (
      <EditorInspector activeNodeId="shape-circle" document={document} editMode="parameter" />
    ))

    expect(view.queryByRole('button', {name: '3D 면 추가'})).toBeNull()
    expect(view.queryByRole('group', {name: '3D 면'})).toBeNull()
  })
  test('should hide the standalone 3D surface editor while retaining stored part data', () => {
    const source = createDemoDocument()
    const document = {
      ...source,
      parts: source.parts.map((part) =>
        part.id === 'mesh-preview' ? {...part, spatial: createSpatialSurface(part)} : part,
      ),
    }
    const view = render(() => (
      <EditorInspector activeNodeId="mesh-preview" document={document} editMode="parameter" />
    ))

    expect(view.queryByRole('group', {name: '3D 면'})).toBeNull()
    expect(view.queryByRole('group', {name: '파트 3D 제어점'})).toBeNull()
    expect(view.queryByRole('button', {name: '3D 면 추가'})).toBeNull()
    expect(view.queryByRole('textbox', {name: '공유 그룹'})).toBeNull()
    expect(document.parts[0]?.spatial).toEqual(createSpatialSurface(source.parts[0]!))
  })

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
    expect(view.queryByRole('heading', {name: '선택 작업'})).toBeNull()
    expect(view.getByRole('complementary', {name: '선택 작업'})).toBeDefined()
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
        autoMeshAvailable={activeNodeId() === 'mesh-preview' || activeNodeId() === group.id}
        containerUnwrapAvailable={activeNodeId() === group.id}
        document={document}
        onAutoMesh={onAutoMesh}
        onContainerUnwrap={onContainerUnwrap}
      />
    ))

    const partRendering = view.getByRole('group', {name: '파트 렌더링'})
    fireEvent.click(within(partRendering).getByRole('button', {name: '자동 메시'}))
    expect(onAutoMesh).toHaveBeenCalledOnce()

    setActiveNodeId(group.id)
    const groupRendering = view.getByRole('group', {name: '파트 렌더링'})
    expect(within(groupRendering).getByRole('button', {name: '자동 메시'})).toBeEnabled()
    fireEvent.click(within(groupRendering).getByRole('button', {name: '자동 메시'}))
    expect(onAutoMesh).toHaveBeenCalledTimes(2)
    fireEvent.click(view.getByRole('button', {name: '컨테이너 해제'}))
    expect(onContainerUnwrap).toHaveBeenCalledOnce()
  })

  test('should disable mask candidates that would close a cycle', () => {
    const view = render(() => (
      <EditorInspector
        activeNodeId="shape-circle"
        document={createMaskCycleDocument()}
        editMode="parameter"
      />
    ))

    fireEvent.click(view.getByRole('button', {name: '대상 추가'}))
    const picker = within(view.getByRole('dialog', {name: '대상 추가'}))
    const circleMask = picker.getByRole('checkbox', {name: 'mesh-preview에 마스크 적용'})

    expect(circleMask).toBeDisabled()
    expect(circleMask.closest('label')).toHaveAttribute('title', '순환 참조')
    expect(picker.getByRole('checkbox', {name: 'shape-diamond에 마스크 적용'})).toBeEnabled()
  })

  test('should keep the mask picker open while adding multiple masks', () => {
    const source = createDemoDocument()
    const [document, setDocument] = createSignal({
      ...source,
      parts: source.parts.map((part) =>
        part.id === 'mesh-preview' ? part : {...part, properties: undefined},
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

    fireEvent.click(view.getByRole('button', {name: '대상 추가'}))
    fireEvent.click(view.getByRole('checkbox', {name: 'shape-circle에 마스크 적용'}))
    expect(view.getByRole('dialog', {name: '대상 추가'})).toBeVisible()
    fireEvent.click(view.getByRole('checkbox', {name: 'shape-diamond에 마스크 적용'}))

    for (const id of ['shape-circle', 'shape-diamond']) {
      expect(document().parts.find((part) => part.id === id)?.properties?.clippingMaskIds).toEqual([
        'mesh-preview',
      ])
    }
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

    expect(view.getByRole('button', {name: /^파트 블렌드 모드/})).toBeEnabled()
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

    expect(view.getByRole('button', {name: /^파트 블렌드 모드/})).toBeDisabled()
    expect(view.getByRole('button', {name: '대상 추가'})).toBeDisabled()
    expect(view.queryByRole('checkbox', {name: 'shape-circle에 마스크 적용'})).toBeNull()
    expect(view.getByRole('checkbox', {name: '마스크 반전'})).toBeDisabled()
    expect(view.getByRole('checkbox', {name: '이 파트도 표시'})).toBeDisabled()
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

    const controlPointInput = view.getByRole('spinbutton', {name: '격자 제어점 1 X'})
    controlPointInput.focus()
    fireEvent.input(controlPointInput, {
      target: {value: '25'},
    })
    expect(view.getByRole('spinbutton', {name: '격자 제어점 1 X'})).toBe(controlPointInput)
    expect(view.container.ownerDocument.activeElement).toBe(controlPointInput)
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

  test('should retain other parameter contributions through inspector point, origin and angle input', () => {
    const source = {...createDemoDocument(), motions: [], parameterBindings: [], parameters: []}
    const deformerDocument = createDeformer(source, ['mesh-preview'])!
    const rest = getDocumentScene(deformerDocument).roots[0]!
    if (rest.kind !== 'deformer') {
      throw new Error('Expected a deformer')
    }
    const first = addParameter({document: deformerDocument, nodeIds: [rest.id]})!
    const second = addParameter({document: first.document, nodeIds: [rest.id]})!
    const posed = setParameterKeyformDeformerControlPoints({
      bindingId: second.binding.id,
      controlPoints: rest.controlPoints.map((value, index) => value + (index % 2 === 0 ? 20 : 5)),
      document: second.document,
      nodeId: rest.id,
      rotationOrigin: {x: 200, y: 200},
      values: [0],
    })!
    const [document, setDocument] = createSignal(posed)
    const preview = () =>
      createParameterPreview({document: document(), editingBindingId: first.binding.id})
    const view = render(() => (
      <EditorInspector
        activeBindingId={first.binding.id}
        activeKeyformValues={[0]}
        activeNodeId={rest.id}
        document={document()}
        editMode="parameter"
        previewDocument={preview()}
        onDocumentChange={setDocument}
        targetNodeIds={[rest.id]}
        selectedControlPointIndices={[0]}
      />
    ))
    const firstX = rest.controlPoints[0]! + 20
    const firstY = rest.controlPoints[1]! + 5
    fireEvent.input(view.getByRole('spinbutton', {name: '격자 제어점 1 X'}), {
      target: {value: String(firstX + 1)},
    })
    const pointNode = getDocumentScene(preview()).roots[0]!
    expect(pointNode.kind === 'deformer' ? pointNode.controlPoints.slice(0, 2) : []).toEqual([
      firstX + 1,
      firstY,
    ])
    fireEvent.input(view.getByRole('spinbutton', {name: '자유 변형 회전 중심 X'}), {
      target: {value: '201'},
    })
    const originNode = getDocumentScene(preview()).roots[0]!
    expect(originNode.kind === 'deformer' ? originNode.rotationOrigin : undefined).toEqual({
      x: 201,
      y: 200,
    })
    expect(originNode.kind === 'deformer' ? originNode.controlPoints : []).toEqual(
      pointNode.kind === 'deformer' ? pointNode.controlPoints : [],
    )
    fireEvent.input(view.getByRole('spinbutton', {name: '자유 변형 각도'}), {target: {value: '45'}})
    const rotated = getDocumentScene(preview()).roots[0]!
    expect(rotated.kind === 'deformer' ? getDeformerAngle(rotated) : undefined).toBeCloseTo(45)
    expect(document().parameterBindings?.[1]).toEqual(posed.parameterBindings?.[1])
    expect(document().scene).toEqual(posed.scene)
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

  test('should leave document Physics controls out of the selection inspector', () => {
    const sourceDocument = createDemoDocument()
    const [temporaryDocument, setTemporaryDocument] = createSignal(sourceDocument)
    const view = render(() => (
      <EditorInspector document={temporaryDocument()} onDocumentChange={setTemporaryDocument} />
    ))

    expect(view.queryByRole('group', {name: '물리'})).not.toBeInTheDocument()
  })
})

test('should restrict visual edits while allowing static settings below full influence', () => {
  const onDocumentChange = vi.fn()
  const view = render(() => (
    <EditorInspector
      activeNodeId="mesh-preview"
      document={createDemoDocument()}
      editMode="parameter"
      editingDisabled
      onDocumentChange={onDocumentChange}
    />
  ))
  expect(view.getByRole('spinbutton', {name: '파트 불투명도'})).toBeDisabled()
  expect(view.getByRole('button', {name: '대상 추가'})).toBeEnabled()
  expect(onDocumentChange).not.toHaveBeenCalled()
})

test('should keep static and visual controls disabled for a locked part', () => {
  const document = setSceneNodeState({
    document: createDemoDocument(),
    locked: true,
    nodeId: 'mesh-preview',
  })!
  const view = render(() => (
    <EditorInspector
      activeNodeId="mesh-preview"
      document={document}
      editMode="parameter"
      editingDisabled
    />
  ))
  expect(view.getByRole('button', {name: /^파트 블렌드 모드/})).toBeDisabled()
  expect(view.getByRole('checkbox', {name: '마스크 반전'})).toBeDisabled()
  expect(view.getByRole('button', {name: '대상 추가'})).toBeDisabled()
  expect(view.getByRole('spinbutton', {name: '파트 불투명도'})).toBeDisabled()
})

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

describe('EditorInspector', () => {
  test('should combine three separate shapes in two explicit steps and reopen the editable hierarchy', () => {
    const source = convertSceneContainers({
      document: createDemoDocument(),
      nodeIds: ['shapes'],
      targetKind: 'spatial',
    })!
    const [document, setDocument] = createSignal(source)
    const view = render(() => (
      <EditorInspector
        activeNodeId="shapes"
        document={document()}
        editMode="parameter"
        onDocumentChange={setDocument}
      />
    ))

    fireEvent.click(view.getByRole('button', {name: '메시 만들기'}))
    fireEvent.click(screen.getByRole('button', {name: '박스 추가'}))
    fireEvent.click(screen.getByRole('button', {name: '삼각기둥 추가'}))
    fireEvent.click(screen.getByRole('button', {name: '구체 추가'}))
    expect(screen.getByRole('button', {name: '메시 적용'})).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', {name: '구체 합성 선택'}))
    fireEvent.click(screen.getByRole('checkbox', {name: '박스 합성 선택'}))
    fireEvent.click(screen.getByRole('checkbox', {name: '삼각기둥 합성 선택'}))
    fireEvent.click(screen.getByRole('button', {name: '더하기로 합성'}))
    expect(screen.getByRole('checkbox', {name: '구체 합성 선택'})).toBeEnabled()
    expect(screen.getByRole('button', {name: '메시 적용'})).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', {name: '구체 합성 선택'}))
    fireEvent.click(screen.getByRole('button', {name: '더하기로 합성'}))
    fireEvent.click(screen.getByRole('button', {name: '메시 적용'}))

    const node = getDocumentScene(document()).roots.find((item) => item.id === 'shapes')
    expect(node).toMatchObject({
      spatialMesh: {
        source: {
          kind: 'authored',
          objects: [
            {children: [{children: [{shape: 'box'}, {shape: 'prism'}]}, {shape: 'sphere'}]},
          ],
        },
      },
    })
    fireEvent.click(view.getByRole('button', {name: '메시 편집'}))
    expect(screen.getByRole('button', {name: '박스 편집'})).toBeDefined()
    expect(screen.getByRole('button', {name: '삼각기둥 편집'})).toBeDefined()
    expect(screen.getByRole('button', {name: '구체 편집'})).toBeDefined()
  })

  test('should remove added shapes from the mesh list and restore them with undo', () => {
    const document = convertSceneContainers({
      document: createDemoDocument(),
      nodeIds: ['shapes'],
      targetKind: 'spatial',
    })!
    const view = render(() => (
      <EditorInspector activeNodeId="shapes" document={document} editMode="parameter" />
    ))

    fireEvent.click(view.getByRole('button', {name: '메시 만들기'}))
    fireEvent.click(screen.getByRole('button', {name: '박스 추가'}))
    fireEvent.click(screen.getByRole('button', {name: '구체 추가'}))
    fireEvent.click(screen.getByRole('button', {name: '박스 삭제'}))
    expect(screen.queryByRole('button', {name: '박스 편집'})).toBeNull()
    fireEvent.click(screen.getByRole('button', {name: '실행 취소'}))
    expect(screen.getByRole('button', {name: '박스 편집'})).toBeEnabled()

    fireEvent.click(screen.getByRole('checkbox', {name: '박스 합성 선택'}))
    fireEvent.click(screen.getByRole('checkbox', {name: '구체 합성 선택'}))
    fireEvent.click(screen.getByRole('button', {name: '더하기로 합성'}))
    fireEvent.click(screen.getByRole('button', {name: '박스 삭제'}))
    expect(screen.queryByRole('button', {name: '박스 편집'})).toBeNull()
    expect(screen.getByRole('button', {name: '구체 편집'})).toBeEnabled()
  })

  test('should keyframe mesh placement and pose translation independently', () => {
    const source = convertSceneContainers({
      document: {...createDemoDocument(), motions: [], parameterBindings: [], parameters: []},
      nodeIds: ['shapes'],
      targetKind: 'spatial',
    })!
    const mesh = generateSpatialMesh({
      operations: [
        {center: [388, 243, 0], id: 'box', mode: 'add', shape: 'box', size: [600, 500, 80]},
      ],
    })
    const bound = setSpatialMesh({document: source, mesh, nodeId: 'shapes'})!
    const added = addParameter({document: bound, nodeIds: ['shapes']})!
    const inserted = insertParameterKeyform({
      bindingId: added.binding.id,
      document: added.document,
      values: [30],
    })!
    const [document, setDocument] = createSignal(inserted)
    const parameterId = added.binding.parameterIds[0]!
    const preview = () =>
      createParameterPreview({document: document(), parameterValues: {[parameterId]: 30}})
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

    const meshPositionInput = view.getByRole('spinbutton', {name: '3D 메시 위치 X'})
    meshPositionInput.focus()
    fireEvent.input(meshPositionInput, {
      target: {value: '24'},
    })
    expect(view.getByRole('spinbutton', {name: '3D 메시 위치 X'})).toBe(meshPositionInput)
    expect(view.container.ownerDocument.activeElement).toBe(meshPositionInput)
    fireEvent.input(view.getByRole('spinbutton', {name: '3D 메시 위치 Z'}), {
      target: {value: '8'},
    })

    const rest = getDocumentScene(document()).roots.find((node) => node.id === 'shapes')
    const keyed = document().parameterBindings?.[0]?.keyforms.find(
      (keyform) => keyform.values[0] === 30,
    )?.deformers?.[0]
    expect(rest?.kind === 'deformer' ? rest.spatialMeshPosition : undefined).toBeUndefined()
    expect(keyed?.spatialMeshPosition).toEqual([24, 0, 8])
    expect(getDocumentScene(preview()).roots.find((node) => node.id === 'shapes')).toMatchObject({
      spatialMeshPosition: [24, 0, 8],
      spatialTranslation: [0, 0, 0],
    })
    const part = document().parts.find((candidate) => candidate.id === 'shape-circle')!
    const basePose = getSpatialPartPose({
      document: document(),
      parameterValues: {[parameterId]: 0},
      part,
    })!
    const keyPose = getSpatialPartPose({
      document: document(),
      parameterValues: {[parameterId]: 30},
      part,
    })!
    keyPose.vertices.forEach((coordinate, index) =>
      expect(coordinate).toBeCloseTo(basePose.vertices[index]!),
    )
    expect(keyPose.depths[0]! - basePose.depths[0]!).toBeCloseTo(8)

    fireEvent.input(view.getByRole('spinbutton', {name: '3D 이동 X'}), {
      target: {value: '12'},
    })
    const translatedKeyform = document().parameterBindings?.[0]?.keyforms.find(
      (keyform) => keyform.values[0] === 30,
    )?.deformers?.[0]
    expect(translatedKeyform?.spatialMeshPosition).toEqual([24, 0, 8])
    expect(translatedKeyform?.spatialTranslation).toEqual([12, 0, 0])
    const translatedPose = getSpatialPartPose({
      document: document(),
      parameterValues: {[parameterId]: 30},
      part,
    })!
    translatedPose.vertices.forEach((coordinate, index) =>
      expect(coordinate - keyPose.vertices[index]!).toBeCloseTo(index % 2 === 0 ? 12 : 0),
    )
    expect(translatedPose.depths).toEqual(keyPose.depths)
    expect(parseDocument(JSON.stringify(document())).ok).toBe(true)
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

    expect(view.getByRole('button', {name: /^파트 블렌드 모드/})).toBeEnabled()
    expect(view.getByRole('spinbutton', {name: '파트 불투명도'})).toBeEnabled()
    fireEvent.click(view.getByRole('button', {name: '대상 추가'}))
    expect(view.getByRole('checkbox', {name: 'shape-circle에 마스크 적용'})).toBeEnabled()
    expect(view.queryByRole('spinbutton', {name: '파트 그리기 순서'})).toBeNull()
    fireEvent.input(view.getByRole('spinbutton', {name: '파트 불투명도'}), {
      target: {value: '0.4'},
    })
    fireEvent.keyDown(view.getByRole('button', {name: /^파트 블렌드 모드/}), {key: 'Enter'})
    fireEvent.keyDown(screen.getByRole('option', {name: 'screen'}), {key: 'Enter'})
    fireEvent.click(view.getByRole('button', {name: '대상 추가'}))
    fireEvent.click(view.getByRole('checkbox', {name: 'shape-circle에 마스크 적용'}))
    fireEvent.click(view.getByRole('checkbox', {name: '마스크 반전'}))
    expect(view.getByRole('checkbox', {name: '이 파트도 표시'})).toBeChecked()
    fireEvent.click(view.getByRole('checkbox', {name: '이 파트도 표시'}))

    expect(
      document().parts.find((part) => part.id === 'shape-circle')?.properties?.clippingMaskIds,
    ).toEqual(['mesh-preview'])
    expect(document().parts[0]?.properties).toEqual({
      blendMode: 'screen',
      invertedMask: true,
      opacity: 0.4,
      renderWhenUsedAsMask: false,
    })
  })
})

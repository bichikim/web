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
})

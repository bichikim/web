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
  test('should create, bind, and remove a primitive 3D mesh from the inspector', () => {
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
    expect(screen.getByRole('dialog', {name: '메시 편집'})).toBeDefined()
    expect(screen.getByRole('button', {name: '메시 적용'})).toBeDisabled()
    fireEvent.click(screen.getByRole('button', {name: '박스 추가'}))
    fireEvent.click(screen.getByRole('button', {name: '메시 적용'}))
    expect(getDocumentScene(document()).roots.find((node) => node.id === 'shapes')).toMatchObject({
      spatialMesh: {source: {kind: 'authored'}},
    })
    expect(
      document()
        .parts.find((part) => part.id === 'shape-circle')
        ?.spatial?.controlPoints.some((value, index) => index % 3 === 2 && value > 0),
    ).toBe(true)
    fireEvent.click(view.getByRole('button', {name: '메시 제거'}))
    expect(getDocumentScene(document()).roots.find((node) => node.id === 'shapes')).toMatchObject({
      spatialMesh: undefined,
    })
    expect(view.getByRole('button', {name: '메시 만들기'})).toBeInTheDocument()
    expect(view.queryByText('연결된 메시 없음')).toBeNull()
    expect(view.queryByRole('button', {name: '메시 제거'})).toBeNull()
  })
})

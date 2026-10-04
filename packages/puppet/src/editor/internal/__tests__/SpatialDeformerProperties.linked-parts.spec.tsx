/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'

import {createDemoDocument, getDocumentScene} from '../../../player'
import {convertSceneContainers} from '../container-conversion'
import {SpatialDeformerProperties} from '../SpatialDeformerProperties'

const spatialMeshDialog = vi.hoisted(() => ({render: vi.fn()}))

vi.mock('../SpatialMeshDialog', () => ({
  SpatialMeshDialog: (props: unknown) => {
    spatialMeshDialog.render(props)
    return null
  },
}))

test('should pass linked visible parts to the mesh dialog when opened', () => {
  const document = convertSceneContainers({
    document: createDemoDocument(),
    nodeIds: ['shapes'],
    targetKind: 'spatial',
  })!
  const node = getDocumentScene(document).roots.find((candidate) => candidate.id === 'shapes')
  if (node?.kind !== 'deformer' || node.deformerType !== 'spatial') {
    throw new Error('Missing spatial deformer')
  }
  const view = render(() => <SpatialDeformerProperties document={document} node={node} />)

  fireEvent.click(view.getByRole('button', {name: '메시 만들기'}))
  expect(spatialMeshDialog.render).toHaveBeenLastCalledWith(
    expect.objectContaining({
      isOpen: true,
      referenceParts: expect.arrayContaining([
        expect.objectContaining({id: 'shape-circle'}),
        expect.objectContaining({id: 'shape-diamond'}),
      ]),
      targetParts: expect.arrayContaining([
        expect.objectContaining({id: 'shape-circle'}),
        expect.objectContaining({id: 'shape-diamond'}),
      ]),
    }),
  )
  view.unmount()
})

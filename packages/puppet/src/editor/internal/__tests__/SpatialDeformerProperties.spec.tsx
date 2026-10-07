/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'

import {createDemoDocument, getDocumentScene} from '../../../player'
import {convertSceneContainers} from '../container-conversion'
import {SpatialDeformerProperties} from '../SpatialDeformerProperties'

test('should allow retrying the same GLB after an import error', async () => {
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
  const input = screen.getByLabelText('GLB 메시 가져오기') as HTMLInputElement
  const file = new File(['invalid'], 'mesh.glb', {type: 'model/gltf-binary'})
  const arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(0))
  Object.defineProperty(file, 'arrayBuffer', {value: arrayBuffer})

  fireEvent.change(input, {target: {files: [file]}})
  await screen.findByRole('alert')
  expect(input.value).toBe('')
  expect(arrayBuffer).toHaveBeenCalledTimes(1)

  fireEvent.change(input, {target: {files: [file]}})
  expect(arrayBuffer).toHaveBeenCalledTimes(2)
})

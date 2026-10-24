/** @vitest-environment jsdom */
import {fireEvent, render} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'
import {createDemoDocument} from '../../../player'
import {createCurveDeformer, getSceneNode} from '../scene-graph'
import {CurveProperties} from '../CurveProperties'

test('should split a selected curve and disable removal of its endpoints', () => {
  const document = createCurveDeformer(createDemoDocument(), ['mesh-preview'])!
  const node = getSceneNode(document, 'curve')!
  if (node.kind !== 'deformer') {
    throw new Error('Expected deformer')
  }
  const onDocumentChange = vi.fn()
  const view = render(() => (
    <CurveProperties document={document} node={node} onDocumentChange={onDocumentChange} />
  ))
  expect(view.getByRole('button', {name: '연결점 삭제'})).toBeDisabled()
  fireEvent.click(view.getByRole('button', {name: '구간 나누기'}))
  const changed = getSceneNode(onDocumentChange.mock.calls[0]![0], 'curve')!
  expect(changed.kind === 'deformer' && changed.curveBreaks).toEqual([0, 0.5, 1])
})

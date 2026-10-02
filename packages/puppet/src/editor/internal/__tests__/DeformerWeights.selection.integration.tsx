/** @vitest-environment jsdom */

import {cleanup, fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test} from 'vitest'

import type {PuppetSceneDeformerNode} from '../../../player'
import {DeformerWeights} from '../DeformerWeights'
import {getSceneNode} from '../scene-graph'
import {EDITABLE_BONE_DOCUMENT} from './fixtures/deformer-weights'

afterEach(cleanup)

test('should edit and reset a selected weight through the production preview', () => {
  const [document, setDocument] = createSignal(EDITABLE_BONE_DOCUMENT)
  const node = () => getSceneNode(document(), 'bone') as PuppetSceneDeformerNode
  const view = render(() => (
    <DeformerWeights document={document()} node={node()} onDocumentChange={setDocument} />
  ))

  fireEvent.click(view.getByRole('button', {name: '영향도 편집'}))
  fireEvent.click(view.getByRole('button', {name: '정점 선택'}))
  fireEvent.click(view.getByRole('button', {name: 'mesh-preview 정점 1'}))

  const firstWeight = view.getByRole('spinbutton', {name: '본 1 영향도'})
  fireEvent.input(firstWeight, {target: {value: '25'}})
  fireEvent.change(firstWeight)

  expect(node().boneWeights?.[0]?.weights).toEqual([0.25, 0.75])
  expect(view.getByRole('spinbutton', {name: '본 2 영향도'})).toHaveValue(75)

  fireEvent.click(view.getByRole('button', {name: '자동 영향도로 복원'}))

  expect(node().boneWeights).toEqual([])
  expect(view.getByText('자동 영향도')).toBeInTheDocument()
})

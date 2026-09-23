/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, test, vi} from 'vitest'
import {type PuppetDocument} from '../../../player'
import {DeformerEditor} from '../DeformerEditor'
import {
  addParameter,
  addTwoDimensionalParameter,
  insertParameterKeyform,
  setParameterKeyformDeformerPoint,
} from '../parameter-keyforms'
import {createParameterPreview} from '../parameter-sampling'
import {getSceneNode} from '../scene-graph'
import {
  createDeformer,
  createDocument,
  getEditorSvg,
  mockViewportBounds,
} from './fixtures/deformer-editor'

describe('DeformerEditor parameters', () => {
  test.each([0, 0.5, 1])('should edit the original deformer keyform at influence %s', (weight) => {
    const initial = {
      ...createDocument(createDeformer()),
      motions: [],
      parameterBindings: [],
      parameters: [],
    }
    const added = addParameter({document: initial, nodeIds: ['deformer']})!
    const inserted = insertParameterKeyform({
      bindingId: added.binding.id,
      document: added.document,
      values: [30],
    })!
    const [document, setDocument] = createSignal({
      ...inserted,
      parameterBindings: inserted.parameterBindings!.map((binding) => ({
        ...binding,
        influences: [{parameterId: added.binding.parameterIds[0], points: [{value: 30, weight}]}],
      })),
    })
    const view = render(() => (
      <DeformerEditor
        activeBindingId={added.binding.id}
        activeKeyformValues={[30]}
        activeNodeId="deformer"
        document={document()}
        editMode="parameter"
        previewDocument={createParameterPreview({
          document: document(),
          editingBindingId: added.binding.id,
          parameterValues: {[added.binding.parameterIds[0]]: 30},
        })}
        onDocumentChange={setDocument}
        targetNodeIds={['deformer']}
      />
    ))
    const svg = getEditorSvg(view.container)
    mockViewportBounds(svg)

    fireEvent(
      view.getByRole('button', {name: '자유 변형 회전 핸들'}),
      new MouseEvent('pointerdown', {bubbles: true, clientX: 330, clientY: 170}),
    )
    fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 210, clientY: 220}))
    fireEvent(svg, new MouseEvent('pointerup', {bubbles: true}))

    const rest = getSceneNode(document(), 'deformer')
    const keyform = document()
      .parameterBindings?.find((binding) => binding.id === added.binding.id)
      ?.keyforms.find((candidate) => candidate.values[0] === 30)
      ?.deformers?.find((candidate) => candidate.nodeId === 'deformer')
    expect(rest?.kind === 'deformer' ? rest.controlPoints.slice(0, 4) : []).toEqual([0, 0, 100, 0])
    expect(keyform?.controlPoints[0]).toBeCloseTo(100)
    expect(keyform?.controlPoints[1]).toBeCloseTo(0)
    expect(keyform?.controlPoints[2]).toBeCloseTo(100)
    expect(keyform?.controlPoints[3]).toBeCloseTo(100)
  })

  test.each([false, true])(
    'should preserve other binding contributions during repeated point edits (2D: %s)',
    (twoDimensional) => {
      const initial = {...createDocument(createDeformer()), parameterBindings: [], parameters: []}
      const first = addParameter({document: initial, nodeIds: ['deformer']})!
      const inserted = insertParameterKeyform({
        bindingId: first.binding.id,
        document: first.document,
        values: [30],
      })!
      const firstPose = setParameterKeyformDeformerPoint({
        bindingId: first.binding.id,
        document: inserted,
        nodeId: 'deformer',
        pointIndex: 0,
        values: [30],
        x: 10,
        y: 0,
      })!
      const second = (twoDimensional ? addTwoDimensionalParameter : addParameter)({
        document: firstPose,
        nodeIds: ['deformer'],
      })!
      const values = twoDimensional ? ([30, 30] as const) : ([30] as const)
      const secondDocument = twoDimensional
        ? second.document
        : insertParameterKeyform({bindingId: second.binding.id, document: second.document, values})!
      const posed = setParameterKeyformDeformerPoint({
        bindingId: second.binding.id,
        document: secondDocument,
        nodeId: 'deformer',
        pointIndex: 0,
        values,
        x: 20,
        y: 0,
      })!
      const [document, setDocument] = createSignal(posed)
      const view = render(() => (
        <DeformerEditor
          activeBindingId={first.binding.id}
          activeKeyformValues={[30]}
          activeNodeId="deformer"
          document={document()}
          editMode="parameter"
          previewDocument={createParameterPreview({
            document: document(),
            editingBindingId: first.binding.id,
            parameterValues: Object.fromEntries(
              [...first.binding.parameterIds, ...second.binding.parameterIds].map((id) => [id, 30]),
            ),
          })}
          onDocumentChange={setDocument}
          targetNodeIds={['deformer']}
        />
      ))
      const point = view.getByRole('button', {name: '격자 제어점 1'})
      expect(point).toHaveAttribute('cx', '30')
      fireEvent.keyDown(point, {key: 'ArrowRight'})
      expect(point).toHaveAttribute('cx', '31')
      fireEvent.keyDown(point, {key: 'ArrowRight'})
      expect(point).toHaveAttribute('cx', '32')
      expect(
        document().parameterBindings?.[0]?.keyforms.find((keyform) => keyform.values[0] === 30)
          ?.deformers?.[0]?.controlPoints[0],
      ).toBe(12)
      expect(document().parameterBindings?.[1]).toEqual(posed.parameterBindings?.[1])
    },
  )

  test('should edit the rest deformer without a parameter', () => {
    const document = createDocument(createDeformer())
    const onDocumentChange = vi.fn()
    const view = render(() => (
      <DeformerEditor
        activeNodeId="deformer"
        document={document}
        editMode="parameter"
        onDocumentChange={onDocumentChange}
        previewDocument={document}
      />
    ))
    const point = view.getByRole('button', {name: '격자 제어점 1'})

    expect(view.queryByRole('status')).toBeNull()
    expect(point).toHaveAttribute('aria-disabled', 'false')
    fireEvent.keyDown(point, {key: 'ArrowRight'})
    expect(onDocumentChange).toHaveBeenCalledOnce()
    const updated = onDocumentChange.mock.calls[0]?.[0] as PuppetDocument
    const deformer = getSceneNode(updated, 'deformer')
    expect(deformer?.kind === 'deformer' ? deformer.controlPoints.slice(0, 2) : []).toEqual([1, 0])
  })
})

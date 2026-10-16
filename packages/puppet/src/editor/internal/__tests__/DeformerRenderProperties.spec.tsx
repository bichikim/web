/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, test} from 'vitest'

import {
  parseDocumentValue,
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
} from '../../../player'
import {getDeformerKeyformEntry, getSceneDeformer} from '../deformer-render-properties'
import {DeformerRenderProperties} from '../DeformerRenderProperties'

const createDocument = (): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parameterBindings: [
    {
      id: 's',
      keyforms: [0, 1].map((value) => ({
        deformers: [{controlPoints: [0, 0, 10, 0], kind: 'deformer', nodeId: 'rot'}],
        parts: [],
        values: [value],
      })),
      parameterIds: ['s'],
      targetDeformerIds: ['rot'],
      targetPartIds: [],
    },
  ],
  parameters: [{defaultValue: 0, id: 's', maximum: 1, minimum: 0, name: 'S'}],
  parts: [],
  scene: {
    roots: [
      {
        boneRestPoints: [0, 0, 10, 0],
        bounds: {height: 20, width: 20, x: -10, y: -10},
        children: [],
        columns: 1,
        controlPoints: [0, 0, 10, 0],
        deformerType: 'rotation',
        id: 'rot',
        kind: 'deformer',
        locked: false,
        name: 'Rot',
        rows: 1,
        visible: true,
      },
    ],
  },
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 1, width: 1},
})

const renderPanel = (keyform?: {bindingId: string; values: readonly [number]}) => {
  const [document, setDocument] = createSignal(createDocument())
  render(() => (
    <DeformerRenderProperties
      disabled={false}
      document={document()}
      keyform={keyform}
      nodeId="rot"
      onDocumentChange={setDocument}
    />
  ))
  return document
}

describe('DeformerRenderProperties', () => {
  test('should edit rest opacity, with the scale needing a keyform', () => {
    const document = renderPanel()
    expect(screen.getByRole('spinbutton', {name: '회전 디포머 배율'})).toHaveProperty(
      'disabled',
      true,
    )
    fireEvent.input(screen.getByRole('spinbutton', {name: '디포머 불투명도'}), {
      target: {value: '0.4'},
    })
    expect(getSceneDeformer(document(), 'rot')?.properties).toEqual({opacity: 0.4})
  })

  test('should key opacity and scale in the selected keyform', () => {
    const keyform = {bindingId: 's', values: [1] as const}
    const document = renderPanel(keyform)
    fireEvent.input(screen.getByRole('spinbutton', {name: '디포머 불투명도'}), {
      target: {value: '0.3'},
    })
    fireEvent.input(screen.getByRole('spinbutton', {name: '회전 디포머 배율'}), {
      target: {value: '1.5'},
    })
    expect(getDeformerKeyformEntry(document(), 'rot', keyform)).toMatchObject({
      properties: {opacity: 0.3},
      rotationScale: 1.5,
    })
    expect(getSceneDeformer(document(), 'rot')?.properties).toBeUndefined()
    expect(parseDocumentValue(document()).ok).toBe(true)
  })
})

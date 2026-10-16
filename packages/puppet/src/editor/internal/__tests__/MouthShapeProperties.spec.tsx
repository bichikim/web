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
import {deleteParameter} from '../parameter-keyforms'
import {setMouthShapeParameter} from '../mouth-shapes'
import {MouthShapeProperties} from '../MouthShapeProperties'
import {ParameterRoleProperties} from '../ParameterRoleProperties'

const parameter = (id: string, defaultValue = 0) => ({
  defaultValue,
  id,
  maximum: 1,
  minimum: 0,
  name: id,
})

const createDocument = (): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parameterBindings: [
    {
      id: 'b-open',
      keyforms: [{parts: [], values: [0]}],
      parameterIds: ['open'],
      targetPartIds: [],
    },
  ],
  parameterRoles: {lipSync: ['open']},
  parameters: [parameter('open'), parameter('wide', 0.5)],
  parts: [],
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 1, width: 1},
})

describe('mouth shapes editing', () => {
  test('should list mouth parameters by role and store each vowel from the current values', () => {
    const [document, setDocument] = createSignal(createDocument())
    render(() => (
      <>
        <ParameterRoleProperties
          document={document()}
          parameterIds={['open', 'wide']}
          onDocumentChange={setDocument}
        />
        <MouthShapeProperties
          document={document()}
          parameterValues={{open: 0.9, wide: 0.1}}
          onDocumentChange={setDocument}
        />
      </>
    ))
    fireEvent.click(screen.getByRole('checkbox', {name: 'open 입 모양(모음)'}))
    fireEvent.click(screen.getByRole('checkbox', {name: 'wide 입 모양(모음)'}))
    expect(document().mouthShapes?.parameterIds).toEqual(['open', 'wide'])
    expect(document().mouthShapes?.vowels.o).toEqual([0, 0.5])
    fireEvent.click(screen.getByRole('button', {name: '아: 현재 값 저장'}))
    expect(document().mouthShapes?.vowels.a).toEqual([0.9, 0.1])
    expect(parseDocumentValue(document()).ok).toBe(true)
  })

  test('should drop deleted parameters from mouth shapes and roles', () => {
    const shaped = setMouthShapeParameter(
      setMouthShapeParameter(createDocument(), 'open', true),
      'wide',
      true,
    )
    const deleted = deleteParameter({bindingId: 'b-open', document: shaped})!
    expect(deleted.mouthShapes?.parameterIds).toEqual(['wide'])
    expect(deleted.mouthShapes?.vowels.i).toEqual([0.5])
    expect(deleted.parameterRoles).toBeUndefined()
    expect(parseDocumentValue(deleted).ok).toBe(true)
  })
})

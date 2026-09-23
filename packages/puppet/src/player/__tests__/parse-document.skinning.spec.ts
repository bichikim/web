import {expect, test} from 'vitest'
import {createSkinDocument} from '../../deformation/__tests__/fixtures/skin'
import {parseDocument} from '../parse-document'
import {serializeDocument} from '../serialize-document'

test('should round trip skinning weights and inverse bind transforms', () => {
  const document = createSkinDocument()
  expect(parseDocument(serializeDocument(document))).toMatchObject({
    document: JSON.parse(serializeDocument(document)),
    ok: true,
  })
})

test.each(['missing', 'weight', 'count', 'duplicate', 'matrix', 'strength'])(
  'should reject invalid skinning %s',
  (kind) => {
    const document = JSON.parse(serializeDocument(createSkinDocument()))
    const skin = document.scene.roots.find(
      (node: {skinning?: unknown}) => node.skinning !== undefined,
    ).skinning
    if (kind === 'strength') {
      skin.influences[0].strength = 2
    }
    if (kind === 'missing') {
      skin.influences[0].nodeId = 'missing'
    }
    if (kind === 'weight') {
      skin.influences[0].weights[0] = -1
    }
    if (kind === 'count') {
      skin.influences[0].weights.pop()
    }
    if (kind === 'duplicate') {
      skin.influences[1].nodeId = skin.influences[0].nodeId
    }
    if (kind === 'matrix') {
      skin.influences[0].inverseBind.xx = 0
    }
    expect(parseDocument(JSON.stringify(document))).toEqual({
      error: {code: 'invalid-document'},
      ok: false,
    })
  },
)

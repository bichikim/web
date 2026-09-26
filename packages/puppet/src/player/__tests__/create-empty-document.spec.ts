import {describe, expect, test} from 'vitest'

import {createEmptyDocument} from '../create-empty-document'
import {PUPPET_DOCUMENT_FORMAT, PUPPET_DOCUMENT_VERSION} from '../document'

describe('createEmptyDocument', () => {
  test('should create a valid document without model or animation content', () => {
    expect(createEmptyDocument()).toEqual({
      format: PUPPET_DOCUMENT_FORMAT,
      motions: [],
      parameterBindings: [],
      parameters: [],
      parts: [],
      scene: {roots: []},
      version: PUPPET_DOCUMENT_VERSION,
      viewport: {height: 480, width: 640},
    })
  })

  test('should create independent collection instances', () => {
    const first = createEmptyDocument()
    const second = createEmptyDocument()

    expect(first).not.toBe(second)
    expect(first.parts).not.toBe(second.parts)
    expect(first.scene).not.toBe(second.scene)
  })
})

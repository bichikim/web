import {describe, expect, test} from 'vitest'

import {PUPPET_DOCUMENT_FORMAT, PUPPET_DOCUMENT_VERSION, type PuppetDocument} from '../document'
import {pickGroupMotion} from '../motion-groups'

const document: PuppetDocument = {
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [
    {duration: 1, group: 'tap', id: 'a', tracks: []},
    {duration: 1, group: 'tap', id: 'b', tracks: []},
    {duration: 1, id: 'c', tracks: []},
  ],
  parameterRoles: {lipSync: ['mouth']},
  parameters: [{defaultValue: 0, id: 'mouth', maximum: 1, minimum: 0, name: 'Mouth'}],
  parts: [],
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 1, width: 1},
}

describe('motion groups', () => {
  test('should pick a motion of the group', () => {
    expect(pickGroupMotion(document, 'tap', () => 0.99)?.id).toBe('b')
    expect(pickGroupMotion(document, 'tap', () => 0)?.id).toBe('a')
    expect(pickGroupMotion(document, 'none', () => 0)).toBeUndefined()
  })
})

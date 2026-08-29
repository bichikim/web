/** @vitest-environment jsdom */

import {describe, expect, test} from 'vitest'

import {importPng} from '../import-png'

describe('importPng', () => {
  test('should reject a file that is not a PNG', async () => {
    const result = await importPng(new File(['text'], 'notes.txt', {type: 'text/plain'}))

    expect(result).toEqual({error: {code: 'invalid-file'}, ok: false})
  })
})

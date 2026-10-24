import {expect, it, vi} from 'vitest'

vi.mock('yaml', () => ({
  parse: () => {
    const failure: unknown = 'parser stopped'
    // oxlint-disable-next-line no-throw-literal -- exercises the unknown error boundary.
    throw failure
  },
}))

import {parseKnowledgeConfig} from '../parse'

it('should normalize a non-Error YAML parser failure', () => {
  expect(parseKnowledgeConfig('version: 1')).toEqual({
    error: {
      code: 'invalid-config',
      issues: ['YAML: parser stopped'],
    },
    ok: false,
  })
})

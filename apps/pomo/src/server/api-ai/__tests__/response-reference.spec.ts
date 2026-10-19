/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {createApiAiResponseReference, parseApiAiResponseReference} from '../response-reference'

describe('createApiAiResponseReference', () => {
  it('should preserve the supplied identifier without validating or normalizing it', () => {
    expect(createApiAiResponseReference('opaque-ID')).toBe('pomo-api:opaque-ID')
  })
})

describe('parseApiAiResponseReference', () => {
  it.each([
    '00000000-0000-0000-0000-000000000000',
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    '123E4567-E89B-92D3-1456-426614174001',
  ])('should preserve case and permissive version and variant input %s', (jobId) => {
    expect(parseApiAiResponseReference(`pomo-api:${jobId}`)).toBe(jobId)
  })

  it.each([
    '123e4567-e89b-12d3-a456-426614174001',
    'POMO-API:123e4567-e89b-12d3-a456-426614174001',
    'pomo-api:123e4567e89b12d3a456426614174001',
    'pomo-api:１２３e4567-e89b-12d3-a456-426614174001',
    'pomo-api:123e4567-e89b-12d3-a456-426614174001\n',
    'pomo-api:123e4567-e89b-12d3-a456-426614174001\u2028',
    'pomo-api:123e4567-e89b-12d3-a456-426614174001 ',
  ])('should reject malformed response handles for %j', (reference) => {
    expect(parseApiAiResponseReference(reference)).toBeNull()
  })
})

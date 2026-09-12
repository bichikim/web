import {describe, expect, it} from 'vitest'

import {createKnowledgePointId} from '../point-id'

const POINT_ID_INPUT = {
  docId: 'architecture/session-policy',
  repoId: 'github.com/bichikim/web',
  schemaVersion: 1,
  unitId: 'refresh',
  workspaceId: 'refs/heads/dev',
} as const

describe('createKnowledgePointId', () => {
  it('should return the same RFC 4122 version 5 UUID for the same logical unit', () => {
    const firstPointId = createKnowledgePointId(POINT_ID_INPUT)
    const secondPointId = createKnowledgePointId({...POINT_ID_INPUT})

    expect(firstPointId).toBe(secondPointId)
    expect(firstPointId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })

  it.each([
    ['repoId', 'github.com/example/web'],
    ['workspaceId', 'refs/heads/main'],
    ['docId', 'architecture/token-policy'],
    ['unitId', 'expiry'],
    ['schemaVersion', 2],
  ] as const)('should change when %s changes', (property, value) => {
    const changedInput = {...POINT_ID_INPUT, [property]: value}

    expect(createKnowledgePointId(changedInput)).not.toBe(createKnowledgePointId(POINT_ID_INPUT))
  })
})

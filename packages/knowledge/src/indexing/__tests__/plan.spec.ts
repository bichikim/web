import {describe, expect, it} from 'vitest'

import {createIndexPlan} from '../plan'

describe('createIndexPlan', () => {
  it('should classify source and indexed digests in stable point ID order', () => {
    const result = createIndexPlan({
      indexed: [
        {contentHash: 'old-z', pointId: 'z'},
        {contentHash: 'old-b', pointId: 'b'},
        {contentHash: 'same-d', pointId: 'd'},
        {contentHash: 'old-f', pointId: 'f'},
        {contentHash: 'old-c', pointId: 'c'},
        {contentHash: 'same-g', pointId: 'g'},
      ],
      source: [
        {contentHash: 'new-e', pointId: 'e'},
        {contentHash: 'same-d', pointId: 'd'},
        {contentHash: 'new-f', pointId: 'f'},
        {contentHash: 'new-b', pointId: 'b'},
        {contentHash: 'new-a', pointId: 'a'},
        {contentHash: 'same-g', pointId: 'g'},
      ],
    })

    expect(result).toEqual({
      ok: true,
      value: {
        add: [
          {contentHash: 'new-a', pointId: 'a'},
          {contentHash: 'new-e', pointId: 'e'},
        ],
        delete: [
          {contentHash: 'old-c', pointId: 'c'},
          {contentHash: 'old-z', pointId: 'z'},
        ],
        unchanged: [
          {contentHash: 'same-d', pointId: 'd'},
          {contentHash: 'same-g', pointId: 'g'},
        ],
        update: [
          {contentHash: 'new-b', pointId: 'b'},
          {contentHash: 'new-f', pointId: 'f'},
        ],
      },
    })
  })

  it.each([
    {
      duplicatePointId: 'source-id',
      indexed: [],
      source: [
        {contentHash: 'one', pointId: 'source-id'},
        {contentHash: 'two', pointId: 'source-id'},
      ],
    },
    {
      duplicatePointId: 'indexed-id',
      indexed: [
        {contentHash: 'one', pointId: 'indexed-id'},
        {contentHash: 'two', pointId: 'indexed-id'},
      ],
      source: [],
    },
  ])('should reject duplicate point ID $duplicatePointId', (input) => {
    expect(createIndexPlan(input)).toEqual({
      error: {
        code: 'duplicate-point-id',
        pointId: input.duplicatePointId,
      },
      ok: false,
    })
  })
})

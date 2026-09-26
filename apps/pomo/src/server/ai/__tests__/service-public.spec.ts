/** @vitest-environment node */
import {describe, expect, it, vi} from 'vitest'

import type {AiArtifactRecord, AiJobRecord} from '../../repositories/ai-jobs'
import {createPublicAiJobService} from '../service-public'

const JOB_ID = '019d0000-0000-7000-8000-000000000002'
const USER_ID = '019d0000-0000-7000-8000-000000000001'
const NOW = new Date('2026-09-20T00:00:00.000Z')
const OBJECT_KEY = 'ai/jobs/019d0000-0000-7000-8000-000000000002/archive/result.mp3'

const createJob = (result: AiJobRecord['result']): AiJobRecord =>
  ({
    id: JOB_ID,
    result,
    userId: USER_ID,
  }) as AiJobRecord

const createArtifact = (overrides: Partial<AiArtifactRecord> = {}): AiArtifactRecord =>
  ({
    contentType: 'audio/mpeg',
    durationMs: 1_000,
    expiresAt: new Date('2026-09-20T00:10:00.000Z'),
    objectKey: OBJECT_KEY,
    sizeBytes: 10,
    ...overrides,
  }) as AiArtifactRecord

describe('public AI job service', () => {
  it('should inject the clock, owner lookup, and signer at the download boundary', async () => {
    const findArtifactForUser = vi.fn().mockResolvedValue(createArtifact())
    const createDownloadUrl = vi.fn().mockResolvedValue({
      expiresAt: new Date('2026-09-20T00:10:00.000Z'),
      url: 'https://private.example.test/signed',
    })
    const service = createPublicAiJobService({
      clock: () => NOW,
      createDownloadUrl,
      findArtifactForUser,
    })

    const result = await service.createAiJobResult(
      createJob({artifact: {contentType: 'audio/mpeg', objectKey: OBJECT_KEY}}),
    )

    expect(result).toEqual({
      artifact: {
        contentType: 'audio/mpeg',
        durationMs: 1_000,
        expiresAt: '2026-09-20T00:10:00.000Z',
        sizeBytes: 10,
        url: 'https://private.example.test/signed',
      },
    })
    expect(findArtifactForUser).toHaveBeenCalledWith(JOB_ID, USER_ID)
    expect(createDownloadUrl).toHaveBeenCalledWith(OBJECT_KEY, {
      expiresAt: new Date('2026-09-20T00:10:00.000Z'),
      now: NOW,
    })
  })

  it('should refuse a result whose injected artifact has no usable lifetime', async () => {
    const createDownloadUrl = vi.fn()
    const service = createPublicAiJobService({
      clock: () => NOW,
      createDownloadUrl,
      findArtifactForUser: vi
        .fn()
        .mockResolvedValue(createArtifact({expiresAt: new Date('2026-09-20T00:00:00.500Z')})),
    })

    await expect(
      service.createAiJobResult(
        createJob({artifact: {contentType: 'audio/mpeg', objectKey: OBJECT_KEY}}),
      ),
    ).resolves.toBeNull()
    expect(createDownloadUrl).not.toHaveBeenCalled()
  })
})

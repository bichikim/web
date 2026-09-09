/** @vitest-environment node */
import {expect, it, vi} from 'vitest'

import {createMemoryMemo} from '../schedule'
import {createMemoryMemoDialogue} from '../dialogue'

it('should generate and save compressed dialogue audio for a memo', async () => {
  const memo = createMemoryMemo({
    exactReminderAt: null,
    id: 'memo-1',
    now: new Date('2026-09-04T03:00:00.000Z'),
    random: () => 0,
    recallMode: 'none',
    text: '여권 갱신하기',
  })
  const audio = new Blob(['opus'], {type: 'audio/ogg; codecs=opus'})
  const generate = vi.fn().mockResolvedValue({
    ok: true,
    value: {
      audio,
      durationMs: 1200,
      segments: [{durationMs: 1200, index: 0, startMs: 0, text: memo.text}],
    },
  })
  const saveDialogue = vi.fn().mockResolvedValue(undefined)

  await expect(
    createMemoryMemoDialogue({
      client: {} as never,
      generate,
      language: 'ko',
      memo,
      modelId: 'int8',
      repository: {saveDialogue},
      voiceId: 'M2',
    }),
  ).resolves.toMatch(/^memory-memo-memo-1:/u)
  expect(generate).toHaveBeenCalledWith(
    expect.objectContaining({language: 'ko', modelId: 'int8', text: memo.text, voiceId: 'M2'}),
  )
  expect(saveDialogue).toHaveBeenCalledWith({
    audio,
    dialogue: expect.objectContaining({
      audioKey: expect.stringMatching(/^memory-memo-memo-1:/u),
      id: expect.stringMatching(/^memory-memo-memo-1:/u),
      language: 'ko',
      modelId: 'int8',
      text: memo.text,
      version: 1,
      voiceId: 'M2',
    }),
  })
})

it('should reject a failed voice generation without saving a dialogue', async () => {
  const memo = createMemoryMemo({
    exactReminderAt: null,
    id: 'memo-1',
    now: new Date('2026-09-04T03:00:00.000Z'),
    random: () => 0,
    recallMode: 'none',
    text: '여권 갱신하기',
  })
  const saveDialogue = vi.fn()

  await expect(
    createMemoryMemoDialogue({
      client: {} as never,
      generate: vi.fn().mockResolvedValue({message: 'failed', ok: false}),
      language: 'ko',
      memo,
      modelId: 'int8',
      repository: {saveDialogue},
      voiceId: 'M2',
    }),
  ).rejects.toThrow('failed')
  expect(saveDialogue).not.toHaveBeenCalled()
})

it('should isolate overlapping generations of the same memo from stale cleanup', async () => {
  const memo = createMemoryMemo({
    exactReminderAt: null,
    id: 'memo-1',
    now: new Date('2026-09-04T03:00:00.000Z'),
    random: () => 0,
    recallMode: 'none',
    text: '여권 갱신하기',
  })
  const stored = new Set<string>()
  const options = {
    client: {} as never,
    generate: vi.fn().mockResolvedValue({
      ok: true,
      value: {
        audio: new Blob(['audio']),
        durationMs: 1200,
        segments: [],
      },
    }),
    language: 'ko' as const,
    memo,
    modelId: 'int8' as const,
    repository: {
      saveDialogue: vi.fn(async ({dialogue}) => {
        stored.add(dialogue.id)
      }),
    },
    voiceId: 'M2' as const,
  }
  const [discarded, delivered] = await Promise.all([
    createMemoryMemoDialogue(options),
    createMemoryMemoDialogue(options),
  ])
  stored.delete(discarded)
  expect(stored.has(delivered)).toBe(true)
})

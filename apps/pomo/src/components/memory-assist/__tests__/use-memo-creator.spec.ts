/** @vitest-environment jsdom */

import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {type MemoryMemo, updateMemoryMemos} from '../../../features/memory-assist'
import {type MemoCreator, useMemoCreator} from '../use-memo-creator'

vi.mock('../../../features/memory-assist', async () => ({
  ...(await vi.importActual('../../../features/memory-assist')),
  updateMemoryMemos: vi.fn(),
}))

interface DraftScenario {
  readonly name: string
  readonly change: (creator: MemoCreator) => void
  readonly text: string
  readonly recallMode: string
}

const scenarios: ReadonlyArray<DraftScenario> = [
  {
    change: (creator) => creator.changeText('새 초안'),
    name: 'edited text',
    recallMode: 'none',
    text: '새 초안',
  },
  {
    change: (creator) => creator.changeReminder({...creator.reminderDraft(), recallMode: 'random'}),
    name: 'changed reminder',
    recallMode: 'random',
    text: '이전 메모',
  },
  {
    change: (creator) => {
      creator.changeText('새 초안')
      creator.changeText('이전 메모')
    },
    name: 'text restored to submitted value',
    recallMode: 'none',
    text: '이전 메모',
  },
  {
    change: (creator) => {
      creator.changeOpen(false)
      creator.changeOpen(true)
    },
    name: 'reopened session',
    recallMode: 'none',
    text: '이전 메모',
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  vi.mocked(updateMemoryMemos).mockImplementation(async (update) => update([]))
})

afterEach(cleanup)

it.each(scenarios)(
  'should preserve $name after late success and allow another save',
  async (scenario) => {
    const persistence = Promise.withResolvers<ReadonlyArray<MemoryMemo>>()
    vi.mocked(updateMemoryMemos).mockReturnValueOnce(persistence.promise)
    const {result: creator} = renderHook(useMemoCreator)
    creator.changeOpen(true)
    creator.changeText('이전 메모')
    const saving = creator.save()
    scenario.change(creator)
    const draft = sessionStorage.getItem('pomo:memory-memo:draft:v1')
    persistence.resolve([])
    await saving

    expect(sessionStorage.getItem('pomo:memory-memo:draft:v1')).toBe(draft)
    expect(creator.text()).toBe(scenario.text)
    expect(creator.reminderDraft().recallMode).toBe(scenario.recallMode)
    expect(creator.isOpen()).toBe(true)
    await creator.save()
    expect(sessionStorage.getItem('pomo:memory-memo:draft:v1')).toBeNull()
    expect(creator.text()).toBe('')
    expect(creator.isOpen()).toBe(false)
    expect(updateMemoryMemos).toHaveBeenCalledTimes(2)
  },
)

it.each(scenarios)('should ignore a late failure after $name', async (scenario) => {
  const persistence = Promise.withResolvers<ReadonlyArray<MemoryMemo>>()
  vi.mocked(updateMemoryMemos).mockReturnValueOnce(persistence.promise)
  const {result: creator} = renderHook(useMemoCreator)
  creator.changeOpen(true)
  creator.changeText('이전 메모')
  const saving = creator.save()
  scenario.change(creator)
  const draft = sessionStorage.getItem('pomo:memory-memo:draft:v1')
  persistence.reject(new Error('write failed'))
  await saving

  expect(creator.message()).toBeNull()
  expect(creator.text()).toBe(scenario.text)
  expect(sessionStorage.getItem('pomo:memory-memo:draft:v1')).toBe(draft)
})

it('should retain the draft and report a failure in the original session', async () => {
  vi.mocked(updateMemoryMemos).mockRejectedValueOnce(new Error('write failed'))
  const {result: creator} = renderHook(useMemoCreator)
  creator.changeOpen(true)
  creator.changeText('저장할 메모')
  await creator.save()
  expect(creator.message()).toBe('메모를 저장하지 못했어요.')
  expect(creator.text()).toBe('저장할 메모')
  expect(creator.isOpen()).toBe(true)
  expect(sessionStorage.getItem('pomo:memory-memo:draft:v1')).toContain('저장할 메모')
})

it('should preserve a restored draft after the disposed creator saves', async () => {
  const persistence = Promise.withResolvers<ReadonlyArray<MemoryMemo>>()
  vi.mocked(updateMemoryMemos).mockReturnValueOnce(persistence.promise)
  const first = renderHook(useMemoCreator)
  first.result.changeOpen(true)
  first.result.changeText('이전 메모')
  const saving = first.result.save()
  cleanup()
  const {result: creator} = renderHook(useMemoCreator)
  expect(creator.text()).toBe('이전 메모')
  creator.changeOpen(true)
  creator.changeText('새 편집 세션')
  const draft = sessionStorage.getItem('pomo:memory-memo:draft:v1')
  persistence.resolve([])
  await saving
  expect(sessionStorage.getItem('pomo:memory-memo:draft:v1')).toBe(draft)
  expect(creator.text()).toBe('새 편집 세션')
})

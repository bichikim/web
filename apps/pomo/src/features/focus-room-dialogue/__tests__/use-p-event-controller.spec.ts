/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {usePEventController} from '../use-p-event-controller'
import {MAX_LATEST_REPLACEMENT_DIALOGUE_IDS} from '../dialogue-playback-policy'
// oxlint-disable-next-line import/default -- Vite exposes raw imports as default strings.
import source from '../use-p-event-controller.ts?raw'

it('should load with the development localization output', () => {
  expect(usePEventController).toBeTypeOf('function')
})

it('should import messages from the output-structure-independent entrypoint', () => {
  expect(source).toContain("from '@paraglide/message'")
  expect(source).not.toMatch(/from '@paraglide\/message\//u)
})

const playback = vi.hoisted(() => ({
  cancel: vi.fn(),
  dispose: vi.fn(),
  playSequence: vi.fn(async () => undefined),
  prepare: vi.fn(),
}))
vi.mock('../entry-playback-controller', () => ({createEntryPlaybackController: () => playback}))
const repositoryMocks = vi.hoisted(() => ({
  listEventBindings: vi.fn(async (): Promise<unknown[]> => []),
}))
vi.mock('../repository', () => ({
  createPDialogueRepository: () => ({
    dispose: vi.fn(),
    listDialogues: async () => [],
    listEventBindings: repositoryMocks.listEventBindings,
  }),
}))

it.each([true, false])('should propagate playback completion %s', async (completed) => {
  playback.prepare.mockResolvedValueOnce(completed)
  const view = renderHook(() => usePEventController({}))
  await expect(view.result.playDialogue('memo')).resolves.toBe(completed)
  view.cleanup()
})

it('should return false when playback is disabled', async () => {
  const view = renderHook(() => usePEventController({isPlaybackEnabled: false}))
  await expect(view.result.playDialogue('memo')).resolves.toBe(false)
  view.cleanup()
})

it('should cap only catch-up event dialogue playback', async () => {
  const dialogueIds = Array.from({length: 40}, (_, index) => `dialogue-${index}`)
  repositoryMocks.listEventBindings.mockResolvedValue([
    {
      dialogueIds,
      event: 'focus-start',
      playbackMode: 'sequential-all',
      version: 3,
    },
  ])
  playback.playSequence.mockClear()

  const view = renderHook(() => usePEventController({}))
  await view.result.playDialogueEvents(['focus-start'])
  expect(playback.playSequence).toHaveBeenLastCalledWith(
    expect.anything(),
    expect.objectContaining({dialogueIds}),
  )

  await view.result.playDialogueEvents(['focus-start'], undefined, {
    replacementPolicy: 'latest',
  })
  expect(playback.playSequence).toHaveBeenLastCalledWith(
    expect.anything(),
    expect.objectContaining({
      dialogueIds: dialogueIds.slice(-MAX_LATEST_REPLACEMENT_DIALOGUE_IDS),
      replacementPolicy: 'latest',
    }),
  )
  view.cleanup()
})

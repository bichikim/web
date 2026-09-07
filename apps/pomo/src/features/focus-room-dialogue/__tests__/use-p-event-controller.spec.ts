/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {usePEventController} from '../use-p-event-controller'
// oxlint-disable-next-line import/default -- Vite exposes raw imports as default strings.
import source from '../use-p-event-controller.ts?raw'

it('should load with the development localization output', () => {
  expect(usePEventController).toBeTypeOf('function')
})

it('should import messages from the output-structure-independent entrypoint', () => {
  expect(source).toContain("from '@paraglide/message'")
  expect(source).not.toMatch(/from '@paraglide\/message\//u)
})

const playback = vi.hoisted(() => ({cancel: vi.fn(), dispose: vi.fn(), prepare: vi.fn()}))
vi.mock('../entry-playback-controller', () => ({createEntryPlaybackController: () => playback}))
vi.mock('../repository', () => ({
  createPDialogueRepository: () => ({
    dispose: vi.fn(),
    listDialogues: async () => [],
    listEventBindings: async () => [],
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

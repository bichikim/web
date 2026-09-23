/** @vitest-environment node */
import {expect, it, vi} from 'vitest'

import {failureResult} from 'src/features/result'
import type {SupertonicClient} from 'src/features/supertonic'
import type {DialogueEditorState} from '../features/focus-room-dialogue/dialogue-editor-state'
import {createDialogueModelSession} from '../features/focus-room-dialogue/use-focus-room-dialogue-editor/model-session'

const supertonicMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}))

vi.mock('src/features/supertonic', async (importOriginal) => {
  const actual = await importOriginal<typeof import('src/features/supertonic')>()
  return {
    ...actual,
    createSupertonicClient: supertonicMocks.createClient,
  }
})

it('should not set NaN progress when supertonic reports zero-byte download progress', async () => {
  const states: DialogueEditorState[] = []
  const initialize = vi.fn<SupertonicClient['initialize']>(async (options) => {
    options.onProgress({fileName: 'vocoder.onnx', loadedBytes: 0, totalBytes: 0})
    return failureResult({
      code: 'download-failed',
      fileName: 'vocoder.onnx',
      phase: 'download',
      retryable: true,
      status: 503,
    })
  })
  supertonicMocks.createClient.mockReturnValue({
    cancelGeneration: vi.fn(),
    dispose: vi.fn(),
    generate: vi.fn(),
    generateStream: vi.fn(),
    initialize,
  } satisfies SupertonicClient)

  const session = createDialogueModelSession({
    isDisposed: () => false,
    setState: (state) => states.push(state),
    state: () => states.at(-1) ?? {message: '', status: 'idle'},
  })

  await session.prepare('full')

  expect(initialize).toHaveBeenCalledOnce()

  const progressUpdates = states.filter(
    (state): state is Extract<DialogueEditorState, {status: 'preparing'}> =>
      state.status === 'preparing' && state.message.includes('준비 중'),
  )

  expect(progressUpdates).toHaveLength(1)
  expect(progressUpdates[0]?.progress).toBe(0)
  expect(Number.isNaN(progressUpdates[0]?.progress)).toBe(false)
})

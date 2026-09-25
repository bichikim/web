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

it('should keep error status when progress arrives after initialize failure', async () => {
  let reportProgress:
    | ((progress: {
        readonly fileName: string
        readonly loadedBytes: number
        readonly totalBytes: number
      }) => void)
    | undefined
  const initialize = vi.fn<SupertonicClient['initialize']>(async (options) => {
    reportProgress = options.onProgress
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

  const states: DialogueEditorState[] = []
  const session = createDialogueModelSession({
    isDisposed: () => false,
    setState: (state) => states.push(state),
    state: () => states.at(-1) ?? {message: '', status: 'idle'},
  })

  await session.prepare('full')

  reportProgress?.({fileName: 'vocoder.onnx', loadedBytes: 50, totalBytes: 100})

  expect(states.at(-1)).toMatchObject({status: 'error'})
})

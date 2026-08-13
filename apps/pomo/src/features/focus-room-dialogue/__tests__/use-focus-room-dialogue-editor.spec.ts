import {createRoot} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {successResult, type SupertonicClient} from '../../supertonic'
import {
  type FocusRoomDialogueEditorController,
  useFocusRoomDialogueEditor,
} from '../use-focus-room-dialogue-editor'

const supertonicMocks = vi.hoisted(() => ({createClient: vi.fn()}))
const repositoryMocks = vi.hoisted(() => ({saveDialogue: vi.fn(async () => undefined)}))

vi.mock('../../supertonic', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../supertonic')>()
  return {...actual, createSupertonicClient: supertonicMocks.createClient}
})

vi.mock('../repository', () => ({
  createFocusRoomDialogueRepository: () => ({saveDialogue: repositoryMocks.saveDialogue}),
}))

interface DialogueEditorTestRoot {
  readonly controller: FocusRoomDialogueEditorController
  readonly dispose: () => void
}

const createAudio = () => ({
  generationTime: 1,
  sampleRate: 24_000,
  samples: Float32Array.of(0),
})

const createClient = (calls: Array<string>): SupertonicClient => ({
  cancelGeneration: vi.fn(),
  dispose: vi.fn(),
  generate: vi.fn(),
  generateStream: vi.fn(async function* generateStream() {
    calls.push('generate')
    yield successResult({
      audio: {...createAudio(), index: 0, total: 1},
      type: 'chunk' as const,
    })
    yield successResult({audio: createAudio(), type: 'complete' as const})
  }),
  initialize: vi.fn(async () => {
    calls.push('prepare')
    return successResult(undefined)
  }),
})

const createEditorRoot = (): DialogueEditorTestRoot => {
  let disposeRoot: () => void = () => undefined
  const controller = createRoot((dispose) => {
    disposeRoot = dispose
    return useFocusRoomDialogueEditor({dialogueId: () => null})
  })

  return {controller, dispose: disposeRoot}
}

beforeEach(() => {
  sessionStorage.clear()
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:dialogue'),
    revokeObjectURL: vi.fn(),
  })
  vi.stubGlobal('crypto', {randomUUID: vi.fn(() => 'dialogue-id')})
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useFocusRoomDialogueEditor', () => {
  it('should restore and update the new-dialogue draft for the current tab', async () => {
    const draftKey = 'pomo:focus-room-dialogue:draft:new'
    sessionStorage.setItem(draftKey, '새로고침 전에 작성한 대사')
    const editor = createEditorRoot()

    await Promise.resolve()
    expect(editor.controller.text()).toBe('새로고침 전에 작성한 대사')

    editor.controller.setText('계속 작성한 대사')
    expect(sessionStorage.getItem(draftKey)).toBe('계속 작성한 대사')

    editor.dispose()
  })

  it('should prepare an unprepared model before generating and reuse it afterward', async () => {
    const calls: Array<string> = []
    const client = createClient(calls)
    supertonicMocks.createClient.mockReturnValue(client)
    const editor = createEditorRoot()

    expect(editor.controller.modelId()).toBe('full')
    expect(editor.controller.canGenerate()).toBe(false)

    editor.controller.setText('자동 준비 후 바로 생성하는 대사')
    expect(editor.controller.canGenerate()).toBe(true)

    await editor.controller.generate()
    expect(calls).toEqual(['prepare', 'generate'])
    expect(client.initialize).toHaveBeenCalledWith(expect.objectContaining({modelId: 'full'}))

    await editor.controller.generate()
    expect(calls).toEqual(['prepare', 'generate', 'generate'])
    expect(client.initialize).toHaveBeenCalledTimes(1)

    expect(sessionStorage.getItem('pomo:focus-room-dialogue:draft:new')).not.toBeNull()
    await editor.controller.save()
    expect(repositoryMocks.saveDialogue).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem('pomo:focus-room-dialogue:draft:new')).toBeNull()

    editor.dispose()
  })
})

import {createSignal} from 'solid-js'
import {vi} from 'vitest'

import type {DialogueEditorState, PDialogueEditorController} from 'src/features/focus-room-dialogue'
import type {EditorHarness} from './types'

export const createEditorHarness = (): EditorHarness => {
  const [audioUrl, setAudioUrl] = createSignal<string | null>(null)
  const [canGenerate, setCanGenerate] = createSignal(true)
  const [canRegenerateSegments, setCanRegenerate] = createSignal(false)
  const [canSave, setCanSave] = createSignal(false)
  const [durationMs, setDuration] = createSignal(0)
  const [language, setLanguage] = createSignal<'ko' | 'en'>('ko')
  const [modelId, setModelId] = createSignal<'full' | 'int8'>('full')
  const [progress, setProgress] = createSignal(0)
  const [regeneratingSegmentIndex, setRegeneratingIndex] = createSignal<number | null>(null)
  const [segments, setSegments] = createSignal<ReturnType<PDialogueEditorController['segments']>>(
    [],
  )
  const [state, setState] = createSignal<DialogueEditorState>({
    message: '준비됨',
    status: 'idle',
  })
  const [text, setTextValue] = createSignal('오늘도 잘할 수 있어요.')
  const [voiceId, setVoiceId] = createSignal<'Yuna' | 'F1'>('Yuna')
  const controller: PDialogueEditorController = {
    audioUrl,
    canGenerate,
    canRegenerateSegments,
    canSave,
    dialogueId: () => null,
    durationMs,
    generate: vi.fn().mockResolvedValue(undefined),
    language,
    modelId,
    progress,
    regenerateSegment: vi.fn().mockResolvedValue(undefined),
    regeneratingSegmentIndex,
    save: vi.fn().mockResolvedValue(null),
    segments,
    setLanguage,
    setModelId,
    setText: vi.fn(setTextValue),
    setVoiceId,
    state,
    text,
    voiceId,
  }

  return {
    controller,
    setAudioUrl,
    setCanGenerate,
    setCanRegenerate,
    setCanSave,
    setDuration,
    setProgress,
    setRegeneratingIndex,
    setSegments,
    setState,
    setTextValue,
  }
}

import {createRoot, createSignal} from 'solid-js'
import {expect, it} from 'vitest'

import {useDialogueSceneGaze} from '../use-dialogue-scene-gaze'

it('should force user gaze only while a speech source is playing', () => {
  createRoot((dispose) => {
    const [configuredGaze] = createSignal<'focused'>('focused')
    const [isDialoguePlaying, setIsDialoguePlaying] = createSignal(false)
    const [isExternalSpeechPlaying, setIsExternalSpeechPlaying] = createSignal(false)
    const sceneGaze = useDialogueSceneGaze(
      configuredGaze,
      isDialoguePlaying,
      isExternalSpeechPlaying,
    )

    expect(sceneGaze()).toBe('focused')

    setIsDialoguePlaying(true)
    expect(sceneGaze()).toBe('user')

    setIsDialoguePlaying(false)
    expect(sceneGaze()).toBe('focused')

    setIsExternalSpeechPlaying(true)
    expect(sceneGaze()).toBe('user')

    setIsExternalSpeechPlaying(false)
    expect(sceneGaze()).toBe('focused')
    dispose()
  })
})

let context: AudioContext | undefined

/**
 * The editor's shared audio output for motion sounds, created on first use; `undefined` where
 * Web Audio is unavailable. It stays suspended until `resumeEditorAudio` runs in a user gesture.
 */
export const getEditorAudioDestination = (): AudioNode | undefined => {
  if (context === undefined && typeof AudioContext !== 'undefined') {
    context = new AudioContext()
  }
  return context?.destination
}

/** Lets motion sounds play; browsers allow it from a user gesture such as the play button. */
export const resumeEditorAudio = () => {
  if (context?.state === 'suspended') {
    context.resume().catch(() => undefined)
  }
}

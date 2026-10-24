type DialogueAudioModule = typeof import('./generate-dialogue-audio')

export const createDialogueAudioPreview = async (
  ...args: Parameters<DialogueAudioModule['createDialogueAudioPreview']>
) => (await import('./generate-dialogue-audio')).createDialogueAudioPreview(...args)

export const createDialogueAudioSamples = async (
  ...args: Parameters<DialogueAudioModule['createDialogueAudioSamples']>
) => (await import('./generate-dialogue-audio')).createDialogueAudioSamples(...args)

export const generateCompressedDialogueAudio = async (
  ...args: Parameters<DialogueAudioModule['generateCompressedDialogueAudio']>
) => (await import('./generate-dialogue-audio')).generateCompressedDialogueAudio(...args)

export const generateDialogueAudio = async (
  ...args: Parameters<DialogueAudioModule['generateDialogueAudio']>
) => (await import('./generate-dialogue-audio')).generateDialogueAudio(...args)

export const regenerateDialogueSegmentAudio = async (
  ...args: Parameters<DialogueAudioModule['regenerateDialogueSegmentAudio']>
) => (await import('./generate-dialogue-audio')).regenerateDialogueSegmentAudio(...args)

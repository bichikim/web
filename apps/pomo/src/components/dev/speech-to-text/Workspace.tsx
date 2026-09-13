import {clientOnly} from '@solidjs/start'

export const SpeechToTextWorkspace = clientOnly(
  async () => {
    const {SpeechToTextLab} = await import('src/components/speech-to-text-lab/SpeechToTextLab')
    return {default: SpeechToTextLab}
  },
  {
    lazy: true,
  },
)

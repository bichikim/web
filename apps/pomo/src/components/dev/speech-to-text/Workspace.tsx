import {clientOnly} from '@solidjs/start'

export const SpeechToTextWorkspace = clientOnly(() => import('src/components/SpeechToTextLab'), {
  lazy: true,
})

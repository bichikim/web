import {clientOnly} from '@solidjs/start'

export const TextMoodWorkspace = clientOnly(() => import('src/components/TextMoodLab'), {
  lazy: true,
})

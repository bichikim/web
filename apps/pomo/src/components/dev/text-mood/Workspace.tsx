import {clientOnly} from '@solidjs/start'

export const TextMoodWorkspace = clientOnly(
  async () => {
    const {TextMoodLab} = await import('src/components/text-mood-lab/TextMoodLab')
    return {default: TextMoodLab}
  },
  {
    lazy: true,
  },
)

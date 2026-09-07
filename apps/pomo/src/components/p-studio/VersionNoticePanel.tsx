import {clientOnly} from '@solidjs/start'

export const VersionNoticePanel = clientOnly(
  async () => {
    const {PVersionNotice} = await import('../PVersionNotice')
    return {default: PVersionNotice}
  },
  {lazy: true},
)

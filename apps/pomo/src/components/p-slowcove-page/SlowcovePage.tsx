import {clientOnly} from '@solidjs/start'

export const ALL_IN_ONE_LAYOUT = 'all-in-one'
export const SLOWCOVE_RETURN_HREF = `/?layout=${ALL_IN_ONE_LAYOUT}`

export const SlowcovePage = clientOnly(
  async () => {
    const {PSlowcovePage} = await import('./PSlowcovePage')
    return {default: PSlowcovePage}
  },
  {lazy: true},
)

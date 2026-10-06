import {clientOnly} from '@solidjs/start'

export const ALL_IN_ONE_LAYOUT = 'all-in-one'
export const RELAX_RETURN_HREF = `/?layout=${ALL_IN_ONE_LAYOUT}`

export const RelaxPlayerPage = clientOnly(
  async () => {
    const {PRelaxPlayerPage} = await import('./PRelaxPlayerPage')
    return {default: PRelaxPlayerPage}
  },
  {lazy: true},
)

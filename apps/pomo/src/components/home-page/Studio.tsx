import {lazy} from 'solid-js'

export const HomeStudio = lazy(async () => {
  const studioModule = await import('../PStudio')
  return {default: studioModule.PStudio}
})

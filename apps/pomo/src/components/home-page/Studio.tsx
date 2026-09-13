import {lazy} from 'solid-js'

export const HomeStudio = lazy(async () => {
  const studioModule = await import('../p-studio/PStudio')
  return {default: studioModule.PStudio}
})

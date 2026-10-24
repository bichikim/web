import {once} from 'es-toolkit/function'
import type {BackgroundRepository} from './model'

/** Opens the background repository for the current build target. */
export const getBackgroundRepository = once(
  (): Promise<BackgroundRepository> =>
    import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true'
      ? import('./native-repository').then(({createNativeRepository}) => createNativeRepository())
      : import('./web-repository').then(({createWebRepository}) => createWebRepository()),
)

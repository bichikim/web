import type {BackgroundRepository} from './model'

let repository: Promise<BackgroundRepository> | null = null

/** Opens the background repository for the current build target. */
export const getBackgroundRepository = (): Promise<BackgroundRepository> => {
  repository ??=
    import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true'
      ? import('./native-repository').then(({createNativeRepository}) => createNativeRepository())
      : import('./web-repository').then(({createWebRepository}) => createWebRepository())
  return repository
}

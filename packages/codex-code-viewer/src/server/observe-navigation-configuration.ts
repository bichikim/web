import type {FileIndex} from './create-file-index'
import {isNavigationConfiguration} from './navigation-cache'

interface NavigationResources {
  readonly languages: {dispose(): void}
  readonly background: {dispose(): void}
  readonly navigation: {reset(): void}
}

/** Releases project analyzers when configuration or unknown workspace inputs change. */
export const observeNavigationConfiguration = (
  index: Pick<FileIndex, 'subscribeChanges'>,
  resources: NavigationResources,
) => {
  let changed = false
  const reset = (): void => {
    resources.languages.dispose()
    resources.background.dispose()
    resources.navigation.reset()
    changed = false
  }
  const stop = index.subscribeChanges(({path}) => {
    if (path === null || isNavigationConfiguration(path)) {
      changed = true
    }
  })
  return {
    dispose: stop,
    refresh: () => {
      if (changed) {
        reset()
      }
    },
    reset,
  }
}

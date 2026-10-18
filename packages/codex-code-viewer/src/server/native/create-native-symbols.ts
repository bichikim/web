import {createNativeNavigation} from './create-native-navigation'
import {resolveNativeBinary} from './resolve-native-binary'
import {success, type WorkspaceTree} from '../../shared/contracts'
import type {NativeQuery} from './types'

/** Owns the native semantic session for one worker workspace and its validated drafts. */
export const createNativeSymbols = (root: string) => {
  const navigation = createNativeNavigation({
    binary: resolveNativeBinary,
    documents: [],
    receive: () => undefined,
    root,
  })
  return {
    dispose: navigation.dispose,
    inputs: () => navigation.inputs(),
    prepare: (discovery?: WorkspaceTree) => {
      if (discovery !== undefined) {
        navigation.seed(discovery)
      }
      return navigation.warm()
    },
    prioritize: navigation.prioritize,
    query: async (input: NativeQuery) => success(await navigation.query(input)),
    seed: navigation.seed,
    warm: navigation.warm,
  }
}

import {reactive, UnwrapNestedRefs} from 'vue'
import {createUuid} from './create-uuid'
import {StoreManager, useManager} from './manager'

export type Setup<T extends Record<string, any>, R> = (initState: Partial<T>) => R

const uuid = createUuid('data')

export interface UseStoreOptions<T, R> {
  initState?: T
  /**
   * target manager
   */
  manager?: StoreManager
  name?: string | symbol
  setup: Setup<T, R>
}

export const createStore = <T extends Record<string, any>, R extends Record<string, any>>(
  options: UseStoreOptions<T, R>,
) => {
  const {manager, name = uuid(), setup, initState} = options

  return (): UnwrapNestedRefs<R> => {
    const storeManager = manager ?? useManager()
    if (!storeManager) {
      // eslint-disable-next-line functional/no-throw-statement
      throw new Error('no manager')
    }
    const savedData: any = storeManager.get(name)

    if (savedData) {
      return savedData
    }

    const data = reactive(setup(initState ?? {}))

    storeManager.set(name, data)

    return data
  }
}

export const defineStore = createStore

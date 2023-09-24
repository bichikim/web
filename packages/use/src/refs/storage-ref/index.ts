import {CookieStorageOptions, getWindow, storage} from '@winter-love/utils'
import {onEvent} from 'src/hooks'
import {reactiveRef} from 'src/refs/reactive-ref'
import {ReactiveOptions} from 'src/types'
import {computed, reactive, ref, Ref, watch} from 'vue'

export interface StorageRefOptions {
  reset?: boolean
}

export interface CookieStorageRefOptions extends StorageRefOptions, CookieStorageOptions {
  //
}

export function storageRef<Data>(
  type: 'local',
  key: string,
  initValue?: Data,
  options?: ReactiveOptions<StorageRefOptions>,
): Ref<Data | null>
export function storageRef<Data>(
  type: 'session',
  key: string,
  initValue?: Data,
  options?: ReactiveOptions<StorageRefOptions>,
): Ref<Data | null>
export function storageRef<Data>(
  type: 'cookie',
  key: string,
  initValue?: Data,
  options?: ReactiveOptions<CookieStorageRefOptions>,
): Ref<Data | null>

export function storageRef<Data>(
  type: any,
  key: string,
  initValue?: Data,
  options?: ReactiveOptions<Record<string, any>>,
): Ref<Data | null> {
  const valueRef: Ref<Data | null> = ref<any>(initValue ?? null)
  const optionsRef = reactiveRef(
    reactive({
      domain: undefined,
      expires: undefined,
      path: undefined,
      reset: undefined,
      sameSite: undefined,
      secure: undefined,
      ...options,
    }),
  )
  const storageRef = computed(() => storage(type, optionsRef.value))
  const updateValue = () => {
    valueRef.value = storageRef.value.get(key)
  }

  const saveValue = (value: Data | undefined | null, emptyOnly: boolean = false) => {
    const savedValue = storageRef.value.get(key)

    if (emptyOnly) {
      if (savedValue === null || savedValue === undefined) {
        storageRef.value.set(key, value ?? null)
      }
      return
    }
    storageRef.value.set(key, value ?? null)
  }
  saveValue(valueRef.value, true)
  updateValue()

  onEvent(getWindow(), 'storage', () => {
    updateValue()
  })

  watch(valueRef, (value) => {
    saveValue(value)
  })

  return valueRef
}

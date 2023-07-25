import {isNil} from '@winter-love/lodash'
import {CookieStorageOptions, storage} from '@winter-love/utils'
import {onEvent} from 'src/hooks'
import {mutRef} from 'src/refs/mut-ref'
import {resolveRef} from 'src/refs/resolve-ref'
import {MaybeRef} from 'src/types'
import {computed, Ref, ref, watch} from 'vue'

export interface StorageRefOptions {
  reset?: boolean
}

export interface CookieStorageRefOptions extends StorageRefOptions, CookieStorageOptions {
  //
}

/**
 * 변경 되는 것과 동시에 지정된 storage 에 저장합니다
 * 저장된 값이 있으면 초기 실행시 저장된 값이 됩니다
 * 저장된 값이 없으면 지정된 초기 값을 저장 합니다
 * @param type
 * @param key
 * @param value
 * @param options
 */
export function storageRef<Data>(
  type: 'local',
  key: string,
  value?: MaybeRef<Data>,
  options?: MaybeRef<StorageRefOptions>,
): Ref<Data>
export function storageRef<Data>(
  type: 'session',
  key: string,
  value?: MaybeRef<Data>,
  options?: MaybeRef<StorageRefOptions>,
): Ref<Data>
export function storageRef<Data>(
  type: 'cookie',
  key: string,
  value: MaybeRef<Data>,
  options?: MaybeRef<CookieStorageRefOptions>,
): Ref<Data>
export function storageRef<Data>(
  type: any,
  key: string,
  value?: MaybeRef<Data>,
  options?: MaybeRef<Record<string, any>>,
): Ref<Data> {
  const valueRef = mutRef(resolveRef(value))
  const optionsRef = resolveRef(options)
  // const freezeWatch = ref(false)
  const storageRef = computed(() => storage(type, optionsRef.value))
  const storageValueRef: Ref<Data> = ref<any>()
  const resetRef = computed(() => optionsRef.value?.reset ?? false)

  const updateValue = () => {
    storageValueRef.value = storageRef.value.get(key)
  }

  const setStore = (value) => {
    storageRef.value.set(key, value)
    storageValueRef.value = value
  }

  updateValue()
  if (resetRef.value || (isNil(storageValueRef.value) && valueRef.value !== undefined)) {
    setStore(valueRef.value)
  }

  onEvent(window, 'storage', () => {
    updateValue()
  })

  watch(valueRef, setStore)

  return computed({
    get: () => storageValueRef.value,
    set: setStore,
  })
}

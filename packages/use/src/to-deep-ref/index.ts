import {DeepGet, getItem, setItem} from '@winter-love/utils'
import {computed, isRef, Ref, WritableComputedRef} from 'vue'

// ref
export function toDeepRef<T, Key1 extends keyof T>(
  item: Ref<T>,
  path: [Key1],
): WritableComputedRef<DeepGet<T, [Key1]>>
export function toDeepRef<T, Key1 extends keyof T, Key2 extends keyof T[Key1]>(
  item: Ref<T>,
  path: [Key1, Key2],
): WritableComputedRef<DeepGet<T, [Key1, Key2]>>
export function toDeepRef<
  T,
  Key1 extends keyof T,
  Key2 extends keyof T[Key1],
  Key3 extends keyof T[Key1][Key2],
>(item: Ref<T>, path: [Key1, Key2, Key3]): WritableComputedRef<DeepGet<T, [Key1, Key2, Key3]>>
export function toDeepRef<
  T,
  Key1 extends keyof T,
  Key2 extends keyof T[Key1],
  Key3 extends keyof T[Key1][Key2],
  Key4 extends keyof T[Key1][Key2][Key3],
>(item: Ref<T>, path: [Key1, Key2, Key3]): WritableComputedRef<DeepGet<T, [Key1, Key2, Key3, Key4]>>

// reactive
export function toDeepRef<T, Key1 extends keyof T>(
  item: T,
  path: [Key1],
): WritableComputedRef<DeepGet<T, [Key1]>>
export function toDeepRef<T, Key1 extends keyof T, Key2 extends keyof T[Key1]>(
  item: T,
  path: [Key1, Key2],
): WritableComputedRef<DeepGet<T, [Key1, Key2]>>
export function toDeepRef<
  T,
  Key1 extends keyof T,
  Key2 extends keyof T[Key1],
  Key3 extends keyof T[Key1][Key2],
>(item: T, path: [Key1, Key2, Key3]): WritableComputedRef<DeepGet<T, [Key1, Key2, Key3]>>
export function toDeepRef<
  T,
  Key1 extends keyof T,
  Key2 extends keyof T[Key1],
  Key3 extends keyof T[Key1][Key2],
  Key4 extends keyof T[Key1][Key2][Key3],
>(item: T, path: [Key1, Key2, Key3]): WritableComputedRef<DeepGet<T, [Key1, Key2, Key3, Key4]>>
export function toDeepRef(item: any, path: string[]): WritableComputedRef<any> {
  const _isRef = isRef(item)

  if (_isRef) {
    return computed({
      get() {
        return getItem(item.value, path)
      },
      set(value) {
        setItem(item.value, path, value)
      },
    })
  }

  return computed({
    get() {
      return getItem(item, path)
    },
    set(value) {
      setItem(item, path, value)
    },
  })
}

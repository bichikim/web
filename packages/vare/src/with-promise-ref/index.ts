import {Ref} from 'vue'

export type AnyPromiseFunction = (...args: any[]) => Promise<any> | any

export const withWait = <F extends AnyPromiseFunction>(
  target: F,
  callback?: (value: boolean) => any,
): F => {
  return (async (...args: any[]) => {
    callback?.(true)
    const result = target(...args)
    callback?.(false)
    return result
  }) as any
}

export const withError = <F extends AnyPromiseFunction>(
  target: F,
  callback?: (error: any) => any,
): F => {
  return ((...args: any[]) => {
    try {
      return target(...args)
    } catch (error: any) {
      callback?.(error)
    }
  }) as any
}

export const withPromise = <F extends AnyPromiseFunction>(
  target: F,
  valueCallback: (value: boolean) => any,
  errorCallback?: (error: any) => any,
): F => {
  return withError(withWait(target, valueCallback), errorCallback)
}

export const refToCallback = <Value>(valueRef?: Ref<Value>) => {
  return (value: Value) => {
    if (valueRef) {
      valueRef.value = value
    }
  }
}

export const withWaitRef = <F extends AnyPromiseFunction>(
  target: F,
  valueRef?: Ref<boolean>,
): F => {
  return withWait(target, refToCallback(valueRef))
}

export const withErrorRef = <F extends AnyPromiseFunction>(target: F, errorRef?: Ref<any>): F => {
  return withError(target, refToCallback(errorRef))
}

export const withPromiseRef = <F extends AnyPromiseFunction>(
  target: F,
  valueRef?: Ref<any>,
  errorRef?: Ref<any>,
): F => {
  return withPromise(target, refToCallback(valueRef), refToCallback(errorRef))
}

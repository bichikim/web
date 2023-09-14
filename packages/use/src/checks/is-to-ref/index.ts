import {isReadonly, ToRef} from 'vue'
export declare type IfAny<T, Y, N> = 0 extends 1 & T ? Y : N

export const isToRef = <T>(value: any): value is ToRef<T> => {
  return Boolean(value?._key)
}

export const isWritableToRef = <T>(value: any): value is ToRef<T> => {
  return !isReadonly(value?._object) && isToRef(value)
}

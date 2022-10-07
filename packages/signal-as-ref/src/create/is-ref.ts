import type {Ref} from 'vue'

export type IsRef = (value) => value is Ref

export const createIsRef = (): IsRef => {
  return (value: any): value is Ref => {
    if (typeof value === 'object') {
      return 'peek' in value && 'value' in value && 'subscribe' in value
    }
    return false
  }
}

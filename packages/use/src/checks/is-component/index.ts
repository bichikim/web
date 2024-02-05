import {Component} from 'vue'

export const isComponent = (value: any): value is Component => {
  if (value === null) {
    return false
  }
  const type = typeof value
  return (
    type === 'function' ||
    (type === 'object' &&
      (typeof value.setup === 'function' || typeof value.render === 'function'))
  )
}

import {Component} from 'vue'

export const isComponent = (value: any): value is Component => {
  const type = typeof value
  return type === 'function' || type === 'object'
}

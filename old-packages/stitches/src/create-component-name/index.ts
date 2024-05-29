import {Component, FunctionalComponent} from 'vue'

export const createComponentName = (
  component: Component | FunctionalComponent | string,
): string => {
  if (typeof component === 'string') {
    return component
  }
  return component.name ?? 'unknown'
}

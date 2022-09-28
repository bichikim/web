import {flatten, isPlainObject} from '@winter-love/lodash'

export const $$$CSS_COMPONENT_PROPS = Symbol('css-component-props')

export const getComposersProps = (composers: any[]) => {
  return flatten(
    composers.map((composer) => {
      if (typeof composer === 'function') {
        return composer[$$$CSS_COMPONENT_PROPS] ?? []
      }
      if (isPlainObject(composer)) {
        const {variants = {}} = composer
        return Object.keys(variants)
      }
      return []
    }),
  )
}

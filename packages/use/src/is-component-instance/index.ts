import {ComponentPublicInstance} from 'vue'

export interface ComponentPublicInstanceHasElement extends ComponentPublicInstance {
  $el: Element | undefined | null
}

export const isComponentInstance = (value: any): value is ComponentPublicInstanceHasElement =>
  Boolean(value?.$el)

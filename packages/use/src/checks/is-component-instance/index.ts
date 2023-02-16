import {ComponentPublicInstance} from 'vue'

export const isComponentInstance = (value: any): value is ComponentPublicInstance =>
  Boolean(value?.$el && value.$nextTick)

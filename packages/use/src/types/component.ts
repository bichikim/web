import {ComponentPublicInstance, VNodeChild} from 'vue'

export type Children = VNodeChild
export type MaybeElement = ComponentPublicInstance | HTMLElement | null | undefined
export type MaybeElementOrWindow =
  | ComponentPublicInstance
  | HTMLElement
  | null
  | undefined
  | Window

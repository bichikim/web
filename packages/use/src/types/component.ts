import {ComponentPublicInstance, VNode} from 'vue'

export type Children = VNode | VNode[] | string | number | undefined | null
export type MaybeElement = ComponentPublicInstance | HTMLElement | null | undefined

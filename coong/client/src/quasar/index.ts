import {AllowedComponentProps, ComponentPublicInstance} from '@vue/runtime-core'
import {QBtn as QBtn_, QLayout as QLayout_, QPageContainer as QPageContainer_} from 'Quasar'

export interface AttrsEvent {
  onClick?: (...args: unknown[]) => unknown
}

export type OtherQuasarKeys = '$d' | '$q' | '$n' | '$t' | '$i18n' | '$rt' | '$tc' | '$te' | '$tm'

export type FixQuasarComponent<Component, OtherOmit extends string = ''> = {
  new(): ComponentPublicInstance<AttrsEvent
    & Omit<Component, keyof ComponentPublicInstance | OtherQuasarKeys | OtherOmit> & AllowedComponentProps>
}

export const QBtn: FixQuasarComponent<QBtn_, 'click'> = QBtn_ as any
export const QLayout: FixQuasarComponent<QLayout_> = QLayout_ as any
export const QPageContainer: FixQuasarComponent<QPageContainer_> = QPageContainer_ as any

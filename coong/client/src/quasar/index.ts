import {AllowedComponentProps, ComponentPublicInstance} from '@vue/runtime-core'
import {
  QBtn as QBtn_,
  QBtnGroup as QBtnGroup_,
  QExpansionItem as QExpansionItem_,
  QItem as QItem_,
  QItemLabel as QItemLabel_,
  QItemSection as QItemSection_,
  QLayout as QLayout_,
  QList as QList_,
  QPageContainer as QPageContainer_,
  QToggle as QToggle_,
} from 'Quasar'

export interface AttrsEvent {
  onClick?: (...args: unknown[]) => unknown
}

export type OtherQuasarKeys = '$d' | '$q' | '$n' | '$t' | '$i18n' | '$rt' | '$tc' | '$te' | '$tm'

export type FixQuasarComponent<Component, OtherOmit extends string = '', Add = Record<string, never>> = {
  new(): ComponentPublicInstance<AttrsEvent
    & Omit<Component, keyof ComponentPublicInstance | OtherQuasarKeys | OtherOmit> & AllowedComponentProps>
    & Add
}

export const QBtn: FixQuasarComponent<QBtn_, 'click'> = QBtn_ as any
export const QLayout: FixQuasarComponent<QLayout_> = QLayout_ as any
export const QPageContainer: FixQuasarComponent<QPageContainer_> = QPageContainer_ as any
export const QList: FixQuasarComponent<QList_> = QList_ as any
export const QItem: FixQuasarComponent<QItem_> = QItem_ as any
export const QExpansionItem: FixQuasarComponent<QExpansionItem_> = QExpansionItem_ as any
export const QBtnGroup: FixQuasarComponent<QBtnGroup_> = QBtnGroup_ as any
export const QItemSection = QItemSection_
export const QItemLabel = QItemLabel_
export const QToggle: any = QToggle_

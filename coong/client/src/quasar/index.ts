import {
  QBtn as QBtn_,
  QLayout as QLayout_,
  QPageContainer as QPageContainer_,
  Dark,
  ClosePopup,
  Quasar,
} from 'Quasar'
import {ComponentPublicInstance, AllowedComponentProps} from '@vue/runtime-core'

export interface AttrsEvent {
  onClick?: (...args: unknown[]) => unknown
}

export type OtherQuasarKeys = '$d' | '$q' | '$n' | '$t' | '$i18n' | '$rt' | '$tc' | '$te' | '$tm'

const {install} = Quasar

export type FixQuasarComponent<Component, OtherOmit extends string = ''> = {
  new (): ComponentPublicInstance<AttrsEvent & Omit<Component, keyof ComponentPublicInstance | OtherQuasarKeys | OtherOmit> & AllowedComponentProps>
}

export const QBtn: FixQuasarComponent<QBtn_, 'click'> = QBtn_ as any
export const QLayout: FixQuasarComponent<QLayout_> = QLayout_ as any
export const QPageContainer: FixQuasarComponent<QPageContainer_> = QPageContainer_ as any

export const createQuasarPlugin = (ssrContext = {}) => (app) => {
  (install as any)(app, {
    config: {
      brand: {
        darkBG: '#151515',
        primary: '#151515',
        sunshine: '#f4f4f4',
        whiteField: '#E2E1E1',
      },
      globalProperties: {},
      screen: {
        bodyClasses: true,
      },
    },
    components: {},
    directives: {
      ClosePopup,
    },
    importStrategy: 'auto',
    plugins: {
       Dark, // Dialog, Loading, LoadingBar, Notify,
    },
  }, ssrContext)
}

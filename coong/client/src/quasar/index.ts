import {ComponentPublicInstance, FunctionalComponent} from 'vue'
import './main.scss'
import './quasar.variables.scss'
import {
  QBtn as _QBtn,
  QLayout as _QLayout,
  QPageContainer as _QPageContainer,
  Dialog,
  Loading,
  LoadingBar,
  Notify,
  Quasar,
} from 'quasar'

export type OtherQuasarKeys = '$d' | '$q' | '$n' | '$t' | '$i18n' | '$rt' | '$tc' | '$te' | '$tm'

export type FixQuasarType<Component extends Record<string, any>, Omits extends string = ''> =
  FunctionalComponent<Omit<Component, keyof ComponentPublicInstance | OtherQuasarKeys | Omits>>

export const QBtn: FixQuasarType<_QBtn, 'click'> = _QBtn as any
export const QLayout: FixQuasarType<_QLayout> = _QLayout as any
export const QPageContainer: FixQuasarType<_QPageContainer> = _QPageContainer as any

export function initQuasar(app) {
  app.use(Quasar, {
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
    importStrategy: 'auto',
    plugins: {
      Dialog, Loading, LoadingBar, Notify,
    },
  })
}

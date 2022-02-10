import {QBtn, QDialog, QLayout, QPageContainer} from 'quasar'
import {SignInPage} from 'src/pages/_layout/_components/SignInPage'
import {csx} from 'src/plugins/hyper-components'
import {user} from 'src/store/user'
import {defineComponent, Fragment, h, ref} from 'vue'
import {RouterView} from 'vue-router'
import {provideLayout} from './use-layout'
import {ionCloseOutline} from '@quasar/extras/ionicons-v5'
import {debug} from 'src/use/debug'

const PagesLayout = defineComponent({
  name: 'PagesLayout',
  setup() {
    const {isMagicAuthLink} = provideLayout()
    const {isAuthenticated} = user.$

    const isOpenAuth = ref(isAuthenticated.value)

    const onCloseAuth = () => {
      isOpenAuth.value = false
    }

    debug({
      isOpenAuth,
    })

    return () => (
      h(Fragment, [
        h(QLayout, {view: 'lHh Lpr lFf'}, () => [
          h(QPageContainer, () => [
            h(RouterView),
          ]),
        ]),
        h(QDialog, {
          maximized: true,
          modelValue: !isOpenAuth.value,
          persistent: true,
          transitionHide: 'slide-up',
          transitionShow: 'slide-down',
        }, () => [
          h(SignInPage, {inProgress: isMagicAuthLink.value}),
          h(QBtn, csx({
            css: {bg: 'white', ps: 'absolute', tr: 0},
            dense: true,
            flat: true,
            icon: ionCloseOutline,
            onClick: onCloseAuth,
            round: true,
          })),
        ]),
      ])
    )
  },
})

export default PagesLayout

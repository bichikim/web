import {QBtn, QDialog, QLayout, QPageContainer} from 'quasar'
import {SignInPage} from 'src/pages/_layout/_components/SignInPage'
import {csx} from 'src/plugins/hyper-components'
import {useUser} from 'src/store/user'
import {defineComponent, Fragment, h, ref, toRefs} from 'vue'
import {RouterView} from 'vue-router'
import {provideLayout} from './use-layout'
import {ionCloseOutline} from '@quasar/extras/ionicons-v5'
import {debug} from 'src/use/debug'

const PagesLayout = defineComponent({
  name: 'PagesLayout',
  setup() {
    const user = useUser()
    const {isMagicAuthLink} = provideLayout()
    const {isAuthenticated} = toRefs(user)

    const isOpenAuth = ref(!isAuthenticated.value)

    const onCloseAuth = () => {
      isOpenAuth.value = false
    }

    debug({
      isOpenAuth,
    })

    return () => (
      h(Fragment, [
        // hydration error
        h(QLayout, {view: 'lHh Lpr lFf'}, () => [
          h(QPageContainer, () => [
            h(RouterView),
          ]),

        ]),
        h(QDialog, {
          maximized: true,
          modelValue: isOpenAuth.value,
          persistent: true,
          transitionHide: 'slide-up',
          transitionShow: 'slide-down',
        }, () => [
          h(SignInPage, {inProgress: isMagicAuthLink.value}, () => [
            h('div', csx({
              css: {
                p: 10,
                ps: 'absolute', tr: 0,
              },
            }), [
              h(QBtn, csx({
                css: {bg: '$transparent-white', radius: 0},
                dense: true,
                flat: true,
                icon: ionCloseOutline,
                onClick: onCloseAuth,
              })),
            ]),
          ]),
        ]),
      ])
    )
  },
})

export default PagesLayout

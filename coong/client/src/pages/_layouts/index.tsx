import {SignInPage} from './_components/SignInPage'
import {HBox, HBtn, HDialog, HLayout, HPageContainer} from '@winter-love/hyper-components'
import {useUser} from 'src/store/user'
import {computed, defineComponent, Fragment, h, ref} from 'vue'
import {RouterView} from 'vue-router'
import {provideLayout} from './use-layout'
import {ionCloseOutline} from '@quasar/extras/ionicons-v5'
import {debug} from 'hooks/debug'
import {SignInMethod} from 'src/graphql'

const PagesLayout = defineComponent({
  name: 'PagesLayout',
  setup() {
    const {isMagicAuthLink} = provideLayout()
    const user = useUser()
    const isSignIn = computed<boolean>(() => user.isSignIn)
    const isOpenAuth = ref(!isSignIn.value)
    const email = computed({
      get(): string {
        return user.email
      },
      set(value: string) {
        user.email = value
      },
    })
    const method = computed({
      get() {
        return user.method
      },
      set(value: SignInMethod) {
        user.method = value
      },
    })

    const onCloseAuth = () => {
      isOpenAuth.value = false
    }
    const onSignIn = () => {
      user.singIn()
    }
    const onUpdateEmail = (value: string) => {
      email.value = value
    }
    const onUpdateMethod = (value: SignInMethod) => {
      method.value = value
    }

    debug({
      email,
      isOpenAuth,
      method,
      user,
    })
    return () => (
      <>
        <HLayout>
          <HPageContainer>
            <RouterView />
          </HPageContainer>
        </HLayout>
      </>
    )
    // return () => (
    //   h(Fragment, [
    //     // hydration error
    //     h(HLayout, {view: 'lHh Lpr lFf'}, () => [
    //       h(HPageContainer, () => [
    //         h(RouterView),
    //       ]),
    //
    //     ]),
    //     h(HDialog, {
    //       maximized: true,
    //       modelValue: isOpenAuth.value,
    //       persistent: true,
    //       transitionHide: 'slide-up',
    //       transitionShow: 'slide-down',
    //     }, () => [
    //       h(SignInPage, {
    //         email: email.value,
    //         inProgress: isMagicAuthLink.value,
    //         method: method.value,
    //         'onSign-in': onSignIn,
    //         'onUpdate:email': onUpdateEmail,
    //         'onUpdate:method': onUpdateMethod,
    //       }, () => [
    //         h(HBox, {
    //           css: {
    //             p: 10,
    //             ps: 'absolute', tr: 0,
    //           },
    //         }, () => [
    //           h(HBtn, {
    //             css: {bg: '$transparent-white', radius: 0},
    //             dense: true,
    //             flat: true,
    //             icon: ionCloseOutline,
    //             onClick: onCloseAuth,
    //           }),
    //         ]),
    //       ]),
    //     ]),
    //   ])
    // )
  },
})

export default PagesLayout
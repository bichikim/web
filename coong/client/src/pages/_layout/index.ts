import {QDialog, QLayout, QPageContainer} from 'quasar'
import {SignInPage} from 'src/pages/_layout/_components/SignInPage'
import {computed, defineComponent, Fragment, h} from 'vue'
import {RouterView} from 'vue-router'
import {provideLayout} from './use-layout'
import {user} from 'src/store/user'

const PagesLayout = defineComponent({
  name: 'PagesLayout',
  render() {
    const {isAuthenticated} = this
    return (
      h(Fragment, [
        h(QLayout, {view: 'lHh Lpr lFf'}, () => [
          h(QPageContainer, () => [
            h(RouterView),
          ]),
        ]),
        h(QDialog, {
          maximized: true,
          modelValue: !isAuthenticated,
          persistent: true,
          transitionHide: 'slide-up',
          transitionShow: 'slide-down',
        }, () => [
          h(SignInPage),
        ]),
      ])
    )
  },
  setup() {
    const layout = provideLayout()
    return {
      isAuthenticated: user.$.isAuthenticated,
    }
  },
})

export default PagesLayout

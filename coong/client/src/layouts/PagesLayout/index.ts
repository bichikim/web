import {QLayout, QPageContainer} from 'src/quasar'
import {defineComponent, h} from 'vue'
import {RouterView} from 'vue-router'
import {Hamburger} from './components'

const PagesLayout = defineComponent({
  name: 'PagesLayout',
  setup() {
    const onHamburger = () => {
      console.log('ham')
    }

    return () => (
      h(QLayout, {view: 'lHh Lpr lFf'}, () => [
        h(QPageContainer, () => [
          h(Hamburger, {onClick: onHamburger}),
          h(RouterView),
        ]),
      ])
    )
  },
})

export default PagesLayout

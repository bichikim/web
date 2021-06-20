import {Navigation} from './components'
import {defineComponent, h, ref} from 'vue'
import {QFooter, QLayout, QPageContainer} from 'quasar'
import {RouterView} from 'vue-router'

export const MainLayout = defineComponent({
  components: {
    Navigation,
  },
  name: 'MainLayout',
  render() {
    return (
      h(QLayout, {view: 'lHh Lpr lFf'}, () => [
        h(QPageContainer, () => [
          h(RouterView),
        ]),
        h(QFooter, {class: 'bg-transparent'}, () => [
          h(Navigation),
        ]),
      ])
    )
  },
  setup() {
    const buttons = ref([])

    return {
      buttons,
    }
  },
})

export default MainLayout

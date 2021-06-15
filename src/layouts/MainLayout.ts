import {Navigation} from './components'
import {defineComponent, ref, h} from 'vue'
import {QLayout, QFooter, QPageContainer} from 'quasar'
import {RouterView} from 'vue-router'

export const MainLayout = defineComponent({
  name: 'MainLayout',
  components: {
    Navigation,
  },
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

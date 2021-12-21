import {QLayout, QPageContainer} from 'quasar'
import {defineComponent, h} from 'vue'
import {RouterView} from 'vue-router'

const PagesLayout = defineComponent({
  name: 'PagesLayout',
  setup() {

    return () => (
      h(QLayout, {view: 'lHh Lpr lFf'}, () => [
        h(QPageContainer, () => [
          h(RouterView),
        ]),
      ])
    )
  },
})

export default PagesLayout

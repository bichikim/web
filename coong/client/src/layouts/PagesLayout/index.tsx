import {QLayout, QPageContainer} from 'quasar'
import {defineComponent} from 'vue'
import {RouterView} from 'vue-router'
import {Hamburger} from './components'

const PagesLayout = defineComponent({
  name: 'PagesLayout',
  setup() {
    return () => (
      <QLayout view='lHh Lpr lFf'>
        <QPageContainer>
          <Hamburger/>
          <RouterView/>
        </QPageContainer>
      </QLayout>
    )
  },
})

export default PagesLayout

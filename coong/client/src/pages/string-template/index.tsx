import {QPage} from 'quasar'
import {defineComponent} from 'vue'

export const StringTemplate = defineComponent({
  setup() {
    return () => (
      <QPage>
        <div>hello-world</div>
      </QPage>
    )
  },
})
export default StringTemplate

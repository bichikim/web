import {defineComponent} from 'vue'
import {QBtn, QPage} from 'quasar'

export const Graphql = defineComponent({
  components: {
    QBtn,
    QPage,
  },
  name: 'GraphqlPage',
  setup() {

    return {}
  },
  template: `
    <q-page>
      <q-btn>hello</q-btn>
    </q-page>
  `,
})

export default Graphql

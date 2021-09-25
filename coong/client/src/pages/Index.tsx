import {defineComponent, ref} from 'vue'
import {QItem, QItemLabel, QItemSection, QList, QToggle} from 'src/quasar'

const IndexPage = defineComponent({
  setup() {
    const toggle = ref(false)
    return () => {
      return (
        <div>
          <QList>
            <QItem v-stitches={[{color: '$red1'}]}>
              <QItemSection>
                <QItemLabel>hello</QItemLabel>
                <QItemLabel caption={true}>greeting</QItemLabel>
              </QItemSection>
              <QItemSection side={true}>
                <QToggle v-model={toggle.value}/>
              </QItemSection>
            </QItem>
          </QList>
        </div>
      )
    }
  },
})

export default IndexPage

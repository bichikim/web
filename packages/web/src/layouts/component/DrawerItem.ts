import {computed, defineComponent, toRefs, ExtractPropTypes, h} from 'vue'
import {QIcon, QItem, QItemSection} from 'quasar'

const props = {
  title: {type: String},
  to: {type: String},
  icon: {type: String},
}

export type DrawerItemProps = ExtractPropTypes<typeof props>

export const DrawerItem = defineComponent({
  template: `
    <q-item
        v-if="isShow"
        :to="to"
        clickable
        tag="a"
    >
    <q-item-section
        v-if="icon"
    >
      <q-icon :name="icon"/>
    </q-item-section>
    <q-item-section>
      <q-item-label>{{ title }}</q-item-label>
    </q-item-section>
    </q-item>
  `,
  props: {
    title: {type: String},
    to: {type: String},
    icon: {type: String},
  },
  name: 'DrawerItem',
  setup(props) {
    const {to, title} = toRefs(props)
    const isShow = computed(() => {
      return Boolean(to?.value && title?.value)
    })
    return () => (
      h(QIcon, {}, () => [

      ])
    )
  },
})

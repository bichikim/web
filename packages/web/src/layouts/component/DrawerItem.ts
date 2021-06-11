import {defineComponent, ExtractPropTypes, h} from 'vue'
import {QIcon} from 'quasar'

const props = {
  title: {type: String},
  to: {type: String},
  icon: {type: String},
}

export type DrawerItemProps = ExtractPropTypes<typeof props>

export const DrawerItem = defineComponent({
  props: {
    title: {type: String},
    to: {type: String},
    icon: {type: String},
  },
  name: 'DrawerItem',
  setup() {
    // const {to, title} = toRefs(props)
    // const isShow = computed(() => {
    //   return Boolean(to?.value && title?.value)
    // })
    return () => (
      h(QIcon, {}, () => [

      ])
    )
  },
})

import {defineComponent, PropType} from 'vue'
import {DrawerItemProps, DrawerItem} from './DrawerItem'

export default defineComponent({
  components: {
    DrawerItem,
  },
  name: 'Drawer',
  props: {
    list: {type: Array as PropType<DrawerItemProps[]>},
  },
  setup() {
    return {

    }
  },
})

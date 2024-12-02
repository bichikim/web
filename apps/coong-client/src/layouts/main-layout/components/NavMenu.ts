import {NavMenuItem} from './NavMenuItem'
import {defineComponent} from 'vue'
export const NavMenu = defineComponent({
  components: {
    NavMenuItem,
  },
  props: {
    list: {default: () => [], type: Array as PropType<NavMenuType[]>},
  },
  template: `
    <ul v-for="item in list" class="menu menu-horizontal" :key="item.id ?? item.text">
      <NavMenuItem v-bind="item" />
    </ul>
  `,
})
export interface NavMenuType {
  children?: NavMenuType[]
  id?: string
  isButton?: boolean
  text?: string
}

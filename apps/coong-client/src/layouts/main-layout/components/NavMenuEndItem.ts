import {defineComponent} from 'vue'
import {NavMenuType} from './NavMenu'

export const NavMenuEndItem = defineComponent({
  props: {
    children: {type: Array as PropType<NavMenuType[]>},
    id: {type: String},
    text: {type: String},
  },
  template: `
    <li>
      <a class="rounded-md">{{ text }}</a>
    </li>
  `,
})

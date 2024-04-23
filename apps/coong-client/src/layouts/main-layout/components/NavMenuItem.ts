// import IconMdiAccountBox from '~icons/carbon/caret-down'
import {NavMenuType} from './NavMenu'
import {NavMenuEndItem} from './NavMenuEndItem'
import {defineComponent} from 'vue'

export const NavMenuItem = defineComponent({
  components: {
    // IconMdiAccountBox,
    NavMenuEndItem,
  },
  props: {
    children: {type: Array as PropType<NavMenuType[]>},
    id: {type: String},
    text: {type: String},
  },
  template: `
    <li>
      <a class="rounded-md">
        {{text}}
      </a>
      <ul v-if="children" class="bg-base-100 shadow-x1 p-2">
        <NavMenuEndItem v-for="item in children" v-bind="item" />
      </ul>
    </li>
  `,
})

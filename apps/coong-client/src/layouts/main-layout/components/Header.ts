import {defineComponent} from 'vue'
import {Logo} from './Logo'
import {NavBar} from './NavBar'
import {NavMenu, NavMenuType} from './NavMenu'

export const Header = defineComponent({
  components: {
    Logo,
    NavBar,
    NavMenu,
  },
  props: {
    navList: {type: Array as PropType<NavMenuType[]>},
  },
  setup: () => {
    return {}
  },
  template: `
    <div>hello</div>
  `,
})

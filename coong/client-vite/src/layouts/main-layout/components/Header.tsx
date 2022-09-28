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
    return () => <div>header</div>
  },
})

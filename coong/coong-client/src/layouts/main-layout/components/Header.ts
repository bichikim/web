import {Logo} from './Logo'
import {NavBar} from './NavBar'
import {NavMenu, NavMenuType} from './NavMenu'
import {defineComponent, h} from 'vue'

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
    return () => h('div', 'Piano')
  },
})

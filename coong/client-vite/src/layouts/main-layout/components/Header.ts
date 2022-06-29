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
  template: `
    <nav-bar>
    <template #start>
      <logo />
    </template>
    <template #end>
      <nav-menu :list="navList" />
    </template>
    </nav-bar>
  `,
})

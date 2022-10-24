import {NavMenuType} from 'layouts/main-layout/components/NavMenu'

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

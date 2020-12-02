import {defineComponent, h} from 'vue'
import {RouterView, RouterLink} from 'vue-router'
import {Box} from '@winter-love/ui'

const buttons: Record<string, any> = {
  md: {
    bra: 10,
    height: 56,
    dp: 'flex',
    fxj: 'center',
    fxa: 'center',
    gap: 10,
  },
}

const bgSet = {
  default: {
    bg: '#D6D8E7',
  },
}

const BoxRouterLink = defineComponent({
  name: 'box-router-link',
  props: ['to'],
  setup(props, {attrs, slots}) {
    return () => {
      return h(Box, {...props, ...attrs, as: RouterLink}, slots)
    }
  },
})

export default defineComponent({
  name: 'default-layout',
  setup() {
    return () => {
      return (
        h(Box, {}, () => [
          h(Box, {dp: 'flex', fxd: 'column'}, () => [
            h(BoxRouterLink, {to: {name: 'Home'}, feed: [buttons.md, bgSet.default]}, () => 'home'),
            h(BoxRouterLink, {to: 'About'}, () => 'about'),
            h(BoxRouterLink, {to: 'Board'}, () => 'board'),
          ]),
          h(RouterView),
        ])
      )
    }
  },
})

import {defineComponent, h} from 'vue-demi'

export const HPage = defineComponent({
  name: 'HPage',
  render() {
    return (
      h('main', {}, this.$slots)
    )
  },
  setup() {
    return {}
  },
})

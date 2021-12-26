import {defineComponent, h, ref} from 'vue-demi'

export const component = defineComponent({
  render() {
    return (
      h('div', this.name)
    )
  },
  setup() {
    const nameRef = ref('foo')
    return {
      name: nameRef,
    }
  },
})

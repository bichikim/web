import {defineComponent, h, ref} from 'vue'
import {QAvatar, QBtn, QImg} from 'quasar'

export const Hamburger = defineComponent({
  name: 'Hamburger',
  props: {
    // eslint-disable-next-line vue/require-default-prop
    avatar: {type: String},
    name: {default: 'Unknown', type: String},
  },
  render() {
    return h(QBtn, {class: 'bg-primary', padding: 'none', push: true}, () => [
      h(QAvatar, {size: '42px'}, () => [
        h(QImg, {src: 'https://cdn.quasar.dev/img/avatar2.jpg'}),
      ]),
    ])
  },
  setup: () => {
    const text = ref('foo')
    return {
      text,
    }
  },
})

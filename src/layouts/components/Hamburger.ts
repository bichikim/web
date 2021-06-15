import {defineComponent, h, ref} from 'vue'
import {QBtn, QAvatar, QImg} from 'quasar'

export const Hamburger = defineComponent({
  name: 'Hamburger',
  props: {
    name: {type: String, default: 'Unknown'},
    avatar: {type: String},
  },
  render() {
    return h(QBtn, {push: true, class: 'bg-primary', padding: 'none'}, () => [
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

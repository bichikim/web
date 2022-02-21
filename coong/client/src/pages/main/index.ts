import {QPage} from 'quasar'
import {user} from 'src/store/user'
import {defineComponent, h, ref} from 'vue'
import {csx} from 'src/plugins/hyper-components'

const Count = defineComponent((_, {slots}) => {
  return () => {
    console.log('Counter')
    return h('div', slots.default?.())
  }
})

const IndexPage = defineComponent({
  name: 'IndexPage',
  render() {
    console.log('Vue')
    return (
      h(QPage, () => [
        h('div', csx({css: {bg: '$transparent-white', color: 'green'}}), `hello ${this.name}`),
        h(Count, () => this.count),
        h(Count, () => this.count2),
        h('button', {onClick: this.onIncrease}, 'increase'),
        h('button', {onClick: this.onIncrease2}, 'increase2'),
      ])
    )
  },
  setup() {
    const name = ref('foo')
    const count = ref(1)
    const count2 = ref(1)

    const onIncrease = () => {
      count.value += 1
    }

    const onIncrease2 = () => {
      count2.value += 1
    }

    return {
      count,
      count2,
      hasEmail: user.$.hasEmail,
      isSignIn: user.$.isSignIn,
      name,
      onIncrease,
      onIncrease2,
    }
  },
})

export default IndexPage

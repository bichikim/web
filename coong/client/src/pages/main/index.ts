import {QPage} from 'quasar'
import {user} from 'src/store/user'
import {defineComponent, h, ref} from 'vue'
import {csx} from 'src/plugins/hyper-components'

const IndexPage = defineComponent({
  name: 'IndexPage',
  render() {
    return (
      h(QPage, () => [
        h('div', csx({css: {bg: '$transparent-white', color: 'green'}}), `hello ${this.name}`),
        h('div', this.count),
        h('div', this.count2),
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
      isSignIn: user.$.isAuthenticated,
      name,
      onIncrease,
      onIncrease2,
    }
  },
})

export default IndexPage

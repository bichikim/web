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
      ])
    )
  },
  setup() {
    const name = ref('foo')

    return {
      hasEmail: user.$.hasEmail,
      isSignIn: user.$.isSignIn,
      name,
    }
  },
})

export default IndexPage

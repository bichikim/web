import {QPage} from 'quasar'
import {user} from 'src/store/user'
import {defineComponent, h} from 'vue'

const IndexPage = defineComponent({
  name: 'IndexPage',
  render() {
    return (
      h(QPage, () => [
        h('div', 'hello'),
      ])
    )
  },
  setup() {
    return {
      hasEmail: user.$.hasEmail,
      isSignIn: user.$.isSignIn,
    }
  },
})

export default IndexPage

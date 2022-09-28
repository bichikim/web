/* eslint-disable sort-keys-fix/sort-keys-fix */
import {debug} from 'hooks/debug'
import {useDefaultLayout} from 'layouts/use-default-layout'
import {useUser} from 'src/store/user'
import {defineComponent, toRefs} from 'vue'

const IndexPage = defineComponent({
  name: 'IndexPage',
  setup: () => {
    const layout = useDefaultLayout()
    const user = useUser()
    const {isOpenAuth} = toRefs(layout)

    const onOpenAuth = () => {
      isOpenAuth.value = true
    }

    const {isSignIn} = toRefs(user)

    debug({
      //
      isSignIn,
    })

    return () => <div>hello</div>
  },
})

export default IndexPage

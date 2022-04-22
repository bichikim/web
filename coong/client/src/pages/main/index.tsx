/* eslint-disable sort-keys-fix/sort-keys-fix */
import {HBox, HPage, useCsx} from '@winter-love/hyper-components'
import {BackdropFilterText} from 'components/BackdropFilterText'
import {debug} from 'hooks/debug'
import {useDefaultLayout} from 'layouts/use-default-layout'
import {useUser} from 'src/store/user'
import {defineComponent, toRefs} from 'vue'
import {GradientBg} from './_component'

const textShadow = '0 0 30px rgba(255,255,255,0.5), 0 0 15px rgba(255,255,255,0.5)'

const IndexPage = defineComponent({
  name: 'IndexPage',
  setup: () => {
    const layout = useDefaultLayout()
    const user = useUser()
    const {isOpenAuth} = toRefs(layout)
    const csx = useCsx()

    const onOpenAuth = () => {
      isOpenAuth.value = true
    }

    const {isSignIn} = toRefs(user)

    debug({
      //
      isSignIn,
    })

    return () => (
      <HPage css={{bg: 'black'}}>
        <GradientBg css={{ai: 'center', fd: 'column', gap: 15, jc: 'center'}}>
          <BackdropFilterText
            {...csx({
              css: {
                $$activeColor: 'rgba(200, 200, 200, 0.3)',
                $$filter: 'blur(5px)',
                fontSize: '6rem',
                fontWeight: 900,
              },
            })}
          >
            Coong
          </BackdropFilterText>
          <HBox
            css={{
              c: 'white',
              s: '$h5',
              textShadow,
            }}
          >
            {
              isSignIn.value
                ? <HBox>
                  <span>Welcome </span>
                  <HBox as="button" onClick={user.signOut} css={{textDecoration: 'underline'}}>{user.email}</HBox><br/>
                  <span>Web3 Project is under construction</span><br/>
                  <span>Wait for it to open</span><br/>
                </HBox>
                : <HBox
                  as="button"
                  onClick={onOpenAuth}
                >Login</HBox>
            }
          </HBox>
        </GradientBg>
      </HPage>
    )
  },
})

export default IndexPage

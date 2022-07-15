import {HBox, HPage} from '@winter-love/hyper-components'
import {GradientBg} from './_components'
const textShadow = '0 0 30px rgba(255,255,255,0.5), 0 0 15px rgba(255,255,255,0.5)'

interface SwitchProps {
  is: boolean
}
const Switch: FC<SwitchProps> = (props, {slots}) => {
  return props.is ? slots.default?.() : slots.else?.() ?? null
}

Switch.props = {
  is: {type: Boolean},
}

const IndexPage = defineComponent({
  name: 'IndexPage',
  setup: () => {
    const isSignIn = ref(false)
    return () => html`
      <${HPage}>
        <${GradientBg} css="${{ai: 'center', fd: 'column', gap: 15, jc: 'center'}}">
          <${HBox} css="${{c: 'white', s: '$h5', textShadow}}">
            <${Switch} is="${isSignIn.value}">
              ${{
                default: () => 'hello',
                else: () => 'hell',
                isSignIn,
              }}
            <//>
          <//>
        <//>
      <//>
    `
  },
})

export default IndexPage

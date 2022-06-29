import {defineComponent} from 'vue'
import {IntroSection, LoginSection, ValueSection} from './components'
import {useUser} from 'src/store/user'

export const Main = defineComponent({
  components: {
    IntroSection,
    LoginSection,
    ValueSection,
  },
  setup() {
    const user = useUser()
    return {
      // user,
    }
  },
  template: `
    <div>
<!--    <span>{{ user.name }}</span>-->
    <IntroSection />
    <ValueSection />
    <LoginSection />
    </div>
  `,
})

export default Main

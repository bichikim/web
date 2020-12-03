import {defineComponent} from 'vue'
import HelloWorld from '/@/components/HelloWorld'
import logo from './assets/logo.png'

export default defineComponent({
  template: `
  <img alt="Vue logo" src="${logo}" />
  <HelloWorld msg="Hello Vue 3.0 + Vite" />
  `,
  name: 'App',
  components: {
    HelloWorld,
  },
})

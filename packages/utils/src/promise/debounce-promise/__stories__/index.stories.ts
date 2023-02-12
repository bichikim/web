import {ref} from 'vue'
import {debouncePromise} from '../'

export default {
  title: 'utils/promise/debounce-promise',
}

export const Default = () => {
  const foo = debouncePromise(() => Math.random(), 1000)
  return {
    setup() {
      const number = ref(0)
      const change = () => {
        foo().then((value) => {
          number.value += value
        })
      }
      return {
        change,
        number,
      }
    },
    template: `
      <div>
      <span>{{number}}</span>
      <button @click="change">change</button>
      </div>
    `,
  }
}

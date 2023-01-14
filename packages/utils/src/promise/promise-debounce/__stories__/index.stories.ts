import {ref} from 'vue'
import {promiseDebounce} from '../'

export default {
  title: 'utils/Promise Debounce',
}

export const Default = () => {
  const foo = promiseDebounce(() => Math.random(), 1000)
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

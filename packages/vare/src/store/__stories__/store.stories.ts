import {defineStore} from '../'
import {ref, toRefs} from 'vue'

export default {
  title: 'vare/store',
}

const useUser = defineStore({
  name: 'user',
  setup() {
    const name = ref('foo')
    const age = ref(0)
    const increaseAge = () => {
      age.value += 1
    }
    const changName = () => {
      name.value = `${name.value}o`
    }
    return {
      age,
      changName,
      increaseAge,
      name,
    }
  },
})

export const Default = () => ({
  setup() {
    const user = useUser()
    const {name, age, increaseAge, changName} = toRefs(user)
    return {
      age,
      changName,
      increaseAge,
      name,
    }
  },
  template: `
    <div>
      <div>{{ name }}</div>
      <div>{{ age }}</div>
      <button @click="increaseAge">increaseAge</button>
      <button @click="changName">changName</button>
    </div>
  `,
})

import {ref, watch} from 'vue-demi'
import {asyncPipe} from '../'

export const Default = () => {

  const deco = asyncPipe(
    (name: string) => Promise.resolve([`${name}-foo`, name]),
    (name: string, nextName: string) => Promise.resolve(`${name}-bar-${nextName}`),
  )

  return {
    setup() {
      const name = ref('john')

      const switchName = () => {
        if (name.value === 'john') {
          name.value = 'foo'
          return
        }
        name.value = 'john'
      }

      const decoName = ref('')

      watch(name, (name) => {
        deco(name).then((newName) => {
          decoName.value = newName
        })
      })

      return {
        decoName,
        name,
        switchName,
      }
    },
    template: `
      <div>
      <span>{{decoName}}</span>
      <input v-model="name">
      <button @click="switchName">switch name</button>
      </div>
    `,
  }

}

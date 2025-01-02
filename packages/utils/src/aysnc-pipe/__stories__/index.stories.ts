import {ref, watch} from 'vue'
import {asyncPipe} from '../'

export default {
  title: 'use/asyncPipe',
}

export const Default = () => {
  const deco = asyncPipe(
    (name: string) => Promise.resolve([`${name}-foo`, name]),
    ([name, nextName]) => Promise.resolve(`${name}-bar-${nextName}`),
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

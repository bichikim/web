import {defineComponent, ref, toRefs} from 'vue'
import {useVerifyInput, useVerifyInputs, verifyDirective} from '../'

export const Default = () => {
  const TUseInput = defineComponent({
    setup: () => {
      const rootInput = ref()
      const verifyInput = useVerifyInput(rootInput, (value) => value.length < 2 && 'min length 2')
      const {verify: verifyRootInput} = toRefs(verifyInput)
      return {
        rootInput,
        verifyRootInput,
      }
    },
    template: `
      <div>
        <input ref="rootInput" />
        <button @click="verifyRootInput">trigger verify</button>
      </div>
    `,
  })

  const TInput = defineComponent({
    directives: {
      verify: verifyDirective,
    },
    template: `
      <div>
        <input v-verify="(value) => value.length > 4 && 'max length 4'" />
      </div>
    `,
  })
  const TFrom = defineComponent({
    components: {
      TInput,
      TUseInput,
    },
    directives: {
      verify: verifyDirective,
    },
    setup() {
      const showInput = ref(true)
      const verifyInputs = useVerifyInputs()
      const {isValid, errorMessage, verify: verifyAll} = toRefs(verifyInputs)
      return {
        errorMessage,
        isValid,
        showInput,
        verifyAll,
      }
    },
    template: `
      <div>
        <span>{{ isValid }}</span><br>
        <span>{{ errorMessage }}</span>
        <button @click="showInput = !showInput">toggle input</button><br>
        <span>t-input max 4</span><TInput v-if="showInput" ></TInput>
        <span>t-use-input min 2</span><TUseInput />
        <span>input all ways ok</span><input v-verify="() => false" />
        <button @click="verifyAll">verifyAll</button>
      </div>
    `,
  })

  return {
    components: {
      TFrom,
    },
    template: `
      <t-from>
        
      </t-from>
    `,
  }
}

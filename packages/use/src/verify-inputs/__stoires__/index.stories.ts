import {defineComponent, ref, toRefs} from 'vue-demi'
import {useVerifyInput, useVerifyInputs, verifyDirective} from '../'

export default {
  title: 'use/verify-inputs',
}

export const Default = () => {
  const TUseInput = defineComponent({
    setup: () => {
      const rootInput = ref()
      useVerifyInput(rootInput, (value) => value.length > 2 && 'max length 2')
      return {
        rootInput,
      }
    },
    template: `
      <div>
        <input ref="rootInput" />
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
      const {isValid, errorMessage} = toRefs(verifyInputs)
      return {
        errorMessage,
        isValid,
        showInput,
      }
    },
    template: `
      <div>
        <span>{{ isValid }}</span><br>
        <span>{{ errorMessage }}</span>
        <button @click="showInput = !showInput">toggle input</button><br>
        <span>t-input</span><TInput v-if="showInput" ></TInput>
        <span>t-use-input</span><TUseInput />
        <span>input</span><input v-verify="() => false" />
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

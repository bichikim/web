import {defineComponent} from 'vue'
import {Box} from 'src/components/Box'

export const Pure = defineComponent({
  components: {
    Box,
  },
  template: `
    <box :css="{bg: '$red1', p: 20}">
      <div v-css="{color: 'black'}">hello</div>
    </box>
  `,
})

export default Pure

import {defineComponent, ref} from 'vue'
import {ArcRotateCamera, Box, Engine, HemisphericLight, Scene} from 'src/components/babylon'
import {Vector3} from '@babylonjs/core'

export const Babylon = defineComponent({
  components: {
    ArcRotateCamera,
    Box,
    Engine,
    HemisphericLight,
    Scene,
  },
  name: 'Babylon',
  setup() {
    const lightDirection = ref(new Vector3(0, 0, 0))
    return {
      lightDirection,
    }
  },
  template: `
    <engine v-css="{width: '100%'}">
      <scene>
        <arc-rotate-camera />
        <hemispheric-light :direction="lightDirection" />
        <box />
      </scene>
    </engine>
  `,
})

export default Babylon

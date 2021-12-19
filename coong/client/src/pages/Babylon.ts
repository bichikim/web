import {defineComponent} from 'vue'
import {ArcRotateCamera, Box, Engine, HemisphericLight, Scene} from 'src/components/babylon'

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
    return {}
  },
  template: `
    <engine>
      <scene>
        <arc-rotate-camera />
        <hemispheric-light />
        <box />
      </scene>
    </engine>
  `,
})

export default Babylon

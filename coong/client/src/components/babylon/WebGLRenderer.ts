import {
  defineComponent,
  h,
  inject,
  InjectionKey,
  onUpdated,
  provide,
  Ref,
  ShallowRef,
  shallowRef,
  watch,
  onBeforeUnmount,
} from 'vue'
import Three, {WebGLRendererParameters} from 'three'
import {useThree} from './Three'

export const WebGLRenderer = defineComponent({
  name: 'WebGLRenderer',
  render() {
    return null
  },
  setup() {
    const three = useThree()
    const renderer = shallowRef(new Three.WebGLRenderer({
      canvas: three.target,
    }))
    three.renderer = renderer

    watch(three.target, (el: HTMLCanvasElement | undefined) => {
      if (el) {
        renderer.value.domElement = el
      }
    })

    const onRender = () => {
      const {scene, camera} = three
      if (scene && camera) {
        renderer.value.render(scene, camera)
      }
    }

    onBeforeUnmount(() => {
      three.renderer = undefined
    })

    onUpdated(() => {
      onRender()
    })
    return {}
  },
})

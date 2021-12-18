import Babylon from 'babylonjs'
import {computed, ComputedRef, defineComponent, h, inject, InjectionKey, provide, ref, ShallowRef} from 'vue'

export const BabylonEngineKey: InjectionKey<ComputedRef<Babylon.Engine>> = Symbol('babylon-engine')

export const useEngine = (): ShallowRef<Babylon.Engine | undefined> => {
  return inject(BabylonEngineKey, ref())
}

export const provideEngine = (canvas: ShallowRef<HTMLCanvasElement | undefined>) => {
  const engine = computed(() => {
    const canvasValue = canvas.value
    if (canvasValue) {
      return new Babylon.Engine(canvasValue, true)
    }
    return null
  })
  provide(BabylonEngineKey, engine)
  return engine
}

export const Engine = defineComponent({
  name: 'Engine',
  props: {
    antialias: {type: Boolean, default: true},
  },
  render() {
    return (
      h('canvas', {ref: 'root'})
    )
  },
  setup() {
    const root = ref()
    const engine = provideEngine(root)

    return {
      root,
    }
  },
})


import * as Babylon from '@babylonjs/core'
import {
  computed,
  defineComponent,
  h,
  inject,
  InjectionKey,
  onBeforeUnmount,
  provide,
  reactive,
  ref,
  shallowRef,
  ShallowRef,
  watchEffect,
} from 'vue'
import {watchUpdate} from './watch-update'
import {QResizeObserver} from 'quasar'

export interface EngineMeta {
  engine?: Babylon.Engine
}

export const engineKey: InjectionKey<EngineMeta> = Symbol('babylon-engine')

export const useEngine = (): EngineMeta => {
  return inject(engineKey, reactive({}))
}

export const provideEngine = (
  canvas: ShallowRef<HTMLCanvasElement | undefined>,
) => {
  const engine = shallowRef<undefined | Babylon.Engine>()

  watchEffect(async () => {
    const canvasValue = canvas.value
    if (!canvasValue) {
      return
    }

    engine.value = new Babylon.Engine(canvasValue, true)
  })

  const result = reactive({
    engine,
  })

  provide(engineKey, result)
  return result
}

export const Engine = defineComponent({
  name: 'Engine',
  props: {
    antialias: {default: true, type: Boolean},
  },
  render() {
    // eslint-disable-next-line functional/no-this-expression
    const {$slots, onResize} = this
    return (
      h('div', [
        h('canvas', {ref: 'canvas', style: {height: '100%', width: '100%'}}, $slots.default?.()),
        h(QResizeObserver, {onResize}),
      ])
    )
  },
  setup() {
    const canvas = ref()
    const engineMeta = provideEngine(canvas)
    const engineRef = computed(() => {
      return engineMeta.engine
    })

    watchUpdate(engineRef, (engine) => {
      engine.runRenderLoop(() => {
        engine.scenes.forEach((scene) => scene.render())
      })
    })

    onBeforeUnmount(() => {
      const engine = engineRef.value
      if (engine) {
        engine.stopRenderLoop()
      }
    })

    const onResize = () => {
      const engine = engineRef.value
      if (engine) {
        engine.resize()
      }
    }

    return {
      canvas,
      engineMeta,
      onResize,
    }
  },
})


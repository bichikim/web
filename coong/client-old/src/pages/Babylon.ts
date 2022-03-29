import {Color4, Vector3} from '@babylonjs/core'
import {QPage} from 'quasar'
import {ArcRotateCamera, Engine, HemisphericLight, Loader, Scene} from 'src/components/babylon'
import {defineComponent, h, ref, resolveDirective, withDirectives} from 'vue'

const styleFunction = (_: any, height: any) => {
  return {
    height: `${height}px`,
  }
}

export const Babylon = defineComponent({
  name: 'Babylon',
  render() {
    const {lightDirection, sceneColor} = this
    const css = resolveDirective('css') ?? {}
    return (
      h(QPage, {styleFn: styleFunction}, () => [
        withDirectives(h(Engine, {}, () => [
          h(Scene, {color: sceneColor}, () => [
            h(ArcRotateCamera, {isControl: true}),
            h(HemisphericLight, {direction: lightDirection}),
            h(Loader),
          ]),
        ]), [[css, {height: '100%', width: '100%'}]]),
      ])
    )
  },
  setup() {
    const lightDirection = ref(new Vector3(0, 0, 0))
    const sceneColor = ref(new Color4(0, 0, 0, 0))

    return {
      lightDirection,
      sceneColor,
    }
  },
})

export default Babylon

import {QBtn} from 'quasar'
import {h, resolveDirective, withDirectives} from 'vue-demi'
import {HGlow} from '../'

export default {
  title: 'Hyper Components/HGlow',
}

export const Default = () => ({
  render() {
    const css = resolveDirective('css') ?? {}
    return (
      h('div', {
        style: {
          alignItems: 'center', backgroundColor: 'black', display: 'flex',
          gap: '10px', height: '400px', justifyContent: 'center',
          width: '100%',
        },
      }, [
        h(HGlow, {}, () => [
          withDirectives(h(QBtn, {
            style: {
              color: 'white',
            },
          }, () => 'Hello World'), [[css, [{}, {linearGradient: 'hyper'}]]]),
        ]),
        h(HGlow, {}, () => [
          h(QBtn, {
            push: true,
            rounded: true,
            style: {
              background: 'linear-gradient(90deg, #03a9f4, #f441a5, #ffeb3b, #03a9f4)',
              backgroundSize: '400%',
              color: 'white',
            },
          }, () => 'Hello World'),
        ]),
        h(HGlow, {}, () => [
          h('div', {style: {backgroundColor: 'white', height: '10px', width: '100px'}}),
        ]),
        h(HGlow, {}, () => [
          'hello',
        ]),
      ])
    )
  },
  setup() {
    return {}
  },
})

import {defineComponent, h} from 'vue'
import {Synth, now} from 'tone'

export default defineComponent(() => {
  const synth = new Synth().toDestination()
  const onPlay = () => {
    const current = now()
    synth.triggerAttack('C4', current)
    synth.triggerRelease(current + 1)
  }
  return () =>
    h('div', [
      //
      h('button', {onClick: onPlay}, 'play'),
    ])
})

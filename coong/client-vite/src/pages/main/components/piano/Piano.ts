import {usePiano} from 'src/hooks/piano'
import {defineComponent, h} from 'vue'
import {PianoButton} from './PianoButton'

export const Piano = defineComponent({
  setup: () => {
    const piano = usePiano()
    return () =>
      h('div', [
        //
        h(PianoButton, {onClick: piano['1c'].play}),
        h(PianoButton, {onClick: piano['1d'].play}),
        h(PianoButton, {onClick: piano['1e'].play}),
        h(PianoButton, {onClick: piano['1f'].play}),
        h(PianoButton, {onClick: piano['1g'].play}),
        h(PianoButton, {onClick: piano['2a'].play}),
      ])
  },
})

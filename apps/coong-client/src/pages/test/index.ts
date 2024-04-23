import {SplendidGrandPiano} from 'smplr'
import {computed, defineComponent, h, onMounted, shallowRef, ref} from 'vue'
import {createSplendidGrandPiano} from 'src/instruments/splendid-grand-piano'

export default defineComponent(() => {
  // const audioContext: AudioContext = new StandardizedAudioContext() as any
  // const piano = new SplendidGrandPiano(audioContext)
  // const marimba = new Soundfont(audioContext, {instrument: 'electric_grand_piano'})
  const piano = createSplendidGrandPiano()

  const disabled = ref(true)

  onMounted(async () => {
    await piano.load
    disabled.value = false
  })

  const onPlay = () => {
    piano.start({note: 'C4'})
  }
  return () =>
    h('div', [
      //
      h(
        'button',
        {disabled: disabled.value, onClick: onPlay},
        disabled.value ? 'loading' : 'play',
      ),
    ])
})

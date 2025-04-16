import {createMemo, ParentProps} from 'solid-js'
import {useGlobalTouchEmitter} from 'src/components/real-button/use-global-touch'
import {PianoContext} from './piano-context'
import {SampleStart} from 'src/use/instruments/splendid-grand-piano'

export type HPianoRootProps = ParentProps & {
  detune?: number
  down?: Set<string | number>
  gainOffset?: number
  lpfCutoffHz?: number
  onDown?: (key: string | number | SampleStart) => void
  onUp?: (key: string | number) => void
  velocity?: number
}

export const HPianoRoot = (props: HPianoRootProps) => {
  useGlobalTouchEmitter({preventTouchContext: true, topLevelElementOnly: true})

  const onDown = (key: string | number) => {
    props.onDown?.({
      detune: props.detune,
      gainOffset: props.gainOffset,
      lpfCutoffHz: props.lpfCutoffHz,
      note: key,
      velocity: props.velocity,
    })
  }

  const onUp = (key: string | number) => {
    props.onUp?.(key)
  }
  const down = createMemo(() => props.down ?? new Set<string | number>())

  return (
    <PianoContext.Provider value={{down, onDown, onUp, scale: 100}}>
      {props.children}
    </PianoContext.Provider>
  )
}

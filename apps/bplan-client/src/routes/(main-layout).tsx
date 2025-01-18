import {RouteSectionProps} from '@solidjs/router'
import {emitAllIds} from 'src/components/real-button/use-global-touch'
import {createSplendidGrandPiano, SplendidGrandPianoContext} from 'src/use/instruments'

const layoutCss =
  'absolute overflow-hidden top-0 left-0 bottom-0 right-0 before:content-[""] before:absolute before:top-0 ' +
  'before:bottom-0 before:left-0 before:right-0 before:pattern-a'

export default function MainLayout(props: RouteSectionProps) {
  const [splendidGrandPiano, splendidGrandPianoController] = createSplendidGrandPiano({
    onEmitInstrument: emitAllIds,
  })

  return (
    <SplendidGrandPianoContext.Provider
      value={[splendidGrandPiano, splendidGrandPianoController]}
    >
      <div id="layout" class={layoutCss}>
        {props.children}
      </div>
    </SplendidGrandPianoContext.Provider>
  )
}

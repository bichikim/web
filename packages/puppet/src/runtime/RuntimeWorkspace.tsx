import {type JSX, Match, Switch} from 'solid-js'
import type {PuppetDocument} from '../player'
import {getRuntimeParameters} from '../tracking/parameter-groups'
import {useGraphEditor} from './graph/use-graph-editor'
import type {RuntimeControls} from './use-runtime-controls'
interface RuntimeWorkspaceProps {
  readonly document: PuppetDocument
  readonly controls: RuntimeControls
  readonly studio: boolean
  readonly children: (workspace?: ReturnType<typeof useGraphEditor>) => JSX.Element
}
export const RuntimeWorkspace = (props: RuntimeWorkspaceProps) => {
  const renderStudio = () => {
    const workspace = useGraphEditor({
      controls: props.controls,
      get parameters() {
        const profile = props.controls.profile()
        return getRuntimeParameters(
          props.document.parameters ?? [],
          profile?.groups ?? [],
          profile?.drafts ?? [],
        )
      },
    })
    return props.children(workspace)
  }
  return (
    <Switch>
      <Match when={props.studio}>{renderStudio()}</Match>
      <Match when={!props.studio}>{props.children()}</Match>
    </Switch>
  )
}

import {type JSX, untrack} from 'solid-js'
import type {PuppetDocument} from '@winter-love/puppet/player'
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
  const workspace = useGraphEditor({
    get controls() {
      return props.controls
    },
    get parameters() {
      const profile = props.controls.profile()
      return getRuntimeParameters(
        props.document.parameters ?? [],
        profile?.groups ?? [],
        profile?.drafts ?? [],
      )
    },
  })
  return <>{untrack(() => props.children(workspace))}</>
}

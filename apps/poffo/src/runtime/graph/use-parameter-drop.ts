import type {Node} from '@dschz/solid-flow'
import {type Accessor, batch} from 'solid-js'
import type {SetStoreFunction} from 'solid-js/store'
import type {RuntimeProfile} from '../../tracking/types'
import {dropParameter} from './drop-parameter'
interface UseParameterDropProps {
  readonly nodes: Accessor<Node[]>
  readonly pinParameter: (id: string) => void
  readonly profile: Accessor<RuntimeProfile | undefined>
  readonly setNodes: SetStoreFunction<Node[]>
  readonly updateProfile: (profile: RuntimeProfile) => void
}
export const useParameterDrop =
  (props: UseParameterDropProps) => (event: {targetNode: Node | null}) => {
    const profile = props.profile()
    if (profile === undefined || event.targetNode === null) {
      return
    }
    const result = dropParameter({
      groups: profile.groups ?? [],
      mappings: profile.mappings,
      node: event.targetNode,
      nodes: props.nodes(),
    })
    if (result === undefined) {
      return
    }
    batch(() => {
      props.pinParameter(result.node.id.replace(/^parameter:/u, ''))
      props.setNodes((node) => node.id === result.node.id, result.node)
      props.updateProfile({...profile, groups: result.groups, mappings: result.mappings})
    })
  }

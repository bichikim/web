import type {Node} from '@dschz/solid-flow'
import {type Accessor, type StoreSetter} from 'solid-js'

import type {RuntimeProfile} from '../../tracking/types'
import {dropParameter} from './drop-parameter'
interface UseParameterDropProps {
  readonly nodes: Accessor<Node[]>
  readonly pinParameter: (id: string) => void
  readonly profile: Accessor<RuntimeProfile | undefined>
  readonly setNodes: StoreSetter<Node[]>
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
    props.pinParameter(result.node.id.replace(/^parameter:/u, ''))
    props.setNodes((draft) => {
      const node = draft.find((entry) => entry.id === result.node.id)
      if (node !== undefined) {
        Object.assign(node, result.node)
      }
    })
    props.updateProfile({...profile, groups: result.groups, mappings: result.mappings})
  }

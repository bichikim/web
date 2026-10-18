import type {GraphConnection} from './resolve-connection'
import {type Accessor, createContext, useContext} from 'solid-js'
import type {PuppetParameter} from '../../player'
import type {RuntimeControls} from '../use-runtime-controls'
interface MappingGraphContext {
  readonly onDeleteCard: (id: string) => void
  readonly onConnect: (connection: GraphConnection) => void
  readonly onEdit: () => void
  readonly parameters: Accessor<ReadonlyArray<PuppetParameter>>
  readonly controls: RuntimeControls
}
export const MappingGraphContext = createContext<MappingGraphContext>()
export const useMappingGraph = () => {
  const context = useContext(MappingGraphContext)
  if (context === undefined) {
    throw new Error('Mapping graph context is missing')
  }
  return context
}

import {useWorkspaceLayout} from './use-workspace-layout'
import {arrangeGraphNodes} from './arrange-graph-nodes'
import {getParameterPorts} from './get-parameter-ports'
import {useCardDeletion} from './use-card-deletion'
import {useParameterDrop} from './use-parameter-drop'
import {createGraphElements} from './create-graph-elements'
import {type Edge, type Node} from '@dschz/solid-flow'
import {batch, createEffect, createMemo, createSignal, untrack} from 'solid-js'
import {createStore, reconcile} from 'solid-js/store'
import type {PuppetParameter} from '../../player'
import type {RuntimeControls} from '../use-runtime-controls'
import {type GraphConnection, resolveConnection} from './resolve-connection'
interface UseGraphEditorProps {
  readonly parameters: ReadonlyArray<PuppetParameter>
  readonly controls: RuntimeControls
}
export const useGraphEditor = (props: UseGraphEditorProps) => {
  const [selectedEdge, setSelectedEdge] = createSignal<string | null>(null)
  const [extraPorts, setExtraPorts] = createSignal<string[]>([])
  const deletion = useCardDeletion({
    controls: props.controls,
    pinParameters: (ids) => setExtraPorts((previous) => [...new Set([...previous, ...ids])]),
  })
  const [revision, setRevision] = createSignal(0)
  const [nodes, setNodes] = createStore<Node[]>([])
  const [edges, setEdges] = createStore<Edge[]>([])
  const visible = () => props.controls.profile()?.mappings ?? []
  const ports = createMemo(() =>
    getParameterPorts({
      extraPorts: extraPorts(),
      groups: props.controls.profile()?.groups ?? [],
      hiddenIds: deletion.hiddenIds(),
      mappings: visible(),
      parameters: props.parameters,
    }),
  )
  const addPort = (id: string) => {
    if (id !== '__add__') {
      deletion.revealCard(`parameter:${id}`)
      setExtraPorts((previous) => [...new Set([...previous, id])])
    }
  }
  createEffect(() => {
    revision()
    const mappings = visible()
    const elements = createGraphElements({
      groups: props.controls.profile()?.groups ?? [],
      mappings,
      parameters: ports().parameters,
      preservePositions: true,
      previous: untrack(() => nodes.map((node) => ({...node, position: {...node.position}}))),
    })
    untrack(() =>
      setNodes(reconcile(elements.nodes.filter((node) => !deletion.hiddenIds().includes(node.id)))),
    )
    setEdges(
      reconcile(
        elements.edges.filter(
          (edge) =>
            !deletion.hiddenIds().includes(edge.source) &&
            !deletion.hiddenIds().includes(edge.target),
        ),
      ),
    )
  })
  const resolve = (connection: GraphConnection) =>
    resolveConnection({
      connection,
      groups: props.controls.profile()?.groups ?? [],
      mappings: props.controls.profile()?.mappings ?? [],
      parameters: props.parameters,
    })
  const handleConnect = (connection: GraphConnection) => {
    const result = resolve(connection)
    const profile = props.controls.profile()
    if (result !== undefined && profile !== undefined) {
      batch(() => {
        deletion.revealCard(`mapping:${result.mapping.parameterId}`)
        if (result.previousId !== undefined && result.previousId !== result.mapping.parameterId) {
          setNodes(
            (node) => node.id === `mapping:${result.previousId}`,
            'id',
            `mapping:${result.mapping.parameterId}`,
          )
        }
        props.controls.updateProfile({
          ...profile,
          drafts: profile.drafts?.filter((id) => id !== result.previousId),
          mappings: [
            ...profile.mappings.filter(
              (mapping) =>
                mapping.parameterId !== result.previousId &&
                mapping.parameterId !== result.mapping.parameterId,
            ),
            result.mapping,
          ],
        })
      })
    }
    setRevision((value) => value + 1)
  }
  const disconnect = (identifiers: ReadonlyArray<string>) => {
    const profile = props.controls.profile()
    if (profile === undefined) {
      return
    }
    props.controls.updateProfile({
      ...profile,
      mappings: profile.mappings.map((mapping) => ({
        ...mapping,
        ...(identifiers.includes(`input:${mapping.parameterId}`) ? {inputConnected: false} : {}),
        ...(identifiers.includes(`output:${mapping.parameterId}`) ? {outputConnected: false} : {}),
      })),
    })
    setSelectedEdge(null)
  }
  const handleDelete = (removed: {nodes: Node[]; edges: Edge[]}) => {
    batch(() => {
      disconnect(removed.edges.map((edge) => edge.id))
      removed.nodes.forEach((node) => deletion.removeCard(node.id))
    })
    setRevision((value) => value + 1)
  }
  const selectedMapping = () =>
    props.controls
      .profile()
      ?.mappings.find(
        (mapping) =>
          selectedEdge() === `input:${mapping.parameterId}` ||
          selectedEdge() === `output:${mapping.parameterId}`,
      )
  const handleDragStop = useParameterDrop({
    nodes: () => nodes,
    pinParameter: addPort,
    profile: props.controls.profile,
    setNodes,
    updateProfile: props.controls.updateProfile,
  })
  const workspace = useWorkspaceLayout({
    controls: props.controls,
    extraPorts,
    hiddenIds: deletion.hiddenIds,
    nodes: () => nodes,
    restoreHiddenIds: deletion.restoreHiddenIds,
    setExtraPorts,
    setNodes,
  })
  return {
    ...workspace,
    addPort,
    arrange: () => setNodes(reconcile(arrangeGraphNodes(nodes))),
    edges,
    handleConnect,
    handleDelete,
    handleDragStop,
    nodes,
    portOptions: () => ports().options,
    removeCard: deletion.removeCard,
    resolve,
    selectEdge: (event: {edge: Edge}) => setSelectedEdge(event.edge.id),
    selectedMapping,
  }
}

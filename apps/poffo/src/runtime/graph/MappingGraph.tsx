import {collapseGraphCards} from './collapse-graph-cards'
import {addCorrection} from './add-correction'
import {ParameterPicker} from './ParameterPicker'
import {withGraphCardMenu} from './with-graph-card-menu'
import {ParameterGroupNode} from './ParameterGroupNode'
import {getRuntimeParameters} from '../../tracking/parameter-groups'
import {ManualInputNode} from './ManualInputNode'
import {ButtonInputNode} from './ButtonInputNode'
import {MappingEdge} from './MappingEdge'
import {createSignal, Show, untrack} from 'solid-js'
import {ConnectionForm} from './ConnectionForm'
import '@dschz/solid-flow/dist/style.css'
import {Background, Controls, type Node, SolidFlow, SolidFlowProvider} from '@dschz/solid-flow'
import {EditorButton} from '@winter-love/puppet/editor'
import type {PuppetParameter} from '@winter-love/puppet/player'
import type {RuntimeControls} from '../use-runtime-controls'
import {MappingGraphContext} from './context'
import {TrackingInputNode} from './TrackingInputNode'
import {ParameterOutputNode} from './ParameterOutputNode'
import {CorrectionNode} from './CorrectionNode'
import type {useGraphEditor} from './use-graph-editor'
interface MappingGraphProps {
  readonly parameters: ReadonlyArray<PuppetParameter>
  readonly controls: RuntimeControls
  readonly workspace: ReturnType<typeof useGraphEditor>
}
const NODE_TYPES = {
  button: withGraphCardMenu(ButtonInputNode),
  correction: withGraphCardMenu(CorrectionNode),
  manual: withGraphCardMenu(ManualInputNode),
  parameterGroup: withGraphCardMenu(ParameterGroupNode),
  parameters: withGraphCardMenu(ParameterOutputNode),
  tracking: withGraphCardMenu(TrackingInputNode),
}
const EDGE_TYPES = {mapping: MappingEdge}
export const MappingGraph = (props: MappingGraphProps) => {
  const graph = untrack(() => props.workspace)
  let trash: HTMLDivElement | undefined
  const [trashActive, setTrashActive] = createSignal(false)
  const overTrash = (event: MouseEvent | TouchEvent) => {
    const point = 'changedTouches' in event ? event.changedTouches[0] : event
    const bounds = trash?.getBoundingClientRect()
    return (
      point !== undefined &&
      bounds !== undefined &&
      point.clientX >= bounds.left &&
      point.clientX <= bounds.right &&
      point.clientY >= bounds.top &&
      point.clientY <= bounds.bottom
    )
  }
  const handleDrag = (event: {event: MouseEvent | TouchEvent}) =>
    setTrashActive(overTrash(event.event))
  const handleDrop = (event: {event: MouseEvent | TouchEvent; targetNode: Node | null}) => {
    if (event.targetNode !== null && overTrash(event.event)) {
      graph.removeCard(event.targetNode.id)
    } else {
      graph.handleDragStop(event)
    }
    setTrashActive(false)
  }
  const [editingConnection, setEditingConnection] = createSignal(false)
  const parameters = () =>
    getRuntimeParameters(
      props.parameters,
      props.controls.profile()?.groups ?? [],
      props.controls.profile()?.drafts ?? [],
    )
  const addGroup = () => {
    const profile = props.controls.profile()
    if (profile === undefined) {
      return
    }
    props.controls.updateProfile({
      ...profile,
      groups: [
        ...(profile.groups ?? []),
        {id: crypto.randomUUID(), mode: 'folder', name: '정리 그룹', parameterIds: []},
      ],
    })
  }
  return (
    <MappingGraphContext.Provider
      value={{
        get controls() {
          return props.controls
        },
        onConnect: graph.handleConnect,
        onDeleteCard: graph.removeCard,
        onEdit: () => setEditingConnection(true),
        parameters,
      }}
    >
      <section class="puppet-mapping-graph" aria-label="파라미터 연결 그래프">
        <div class="puppet-graph-toolbar">
          <ParameterPicker
            parameters={props.parameters.filter((parameter) =>
              graph.portOptions().includes(parameter.id),
            )}
            onAdd={graph.addPort}
          />
          <EditorButton onClick={() => addCorrection(props.controls)}>보정 추가</EditorButton>
          <EditorButton onClick={addGroup}>그룹 추가</EditorButton>
          <EditorButton onClick={graph.arrange}>정렬</EditorButton>
          <EditorButton onClick={() => collapseGraphCards(props.controls)}>
            모든 카드 접기
          </EditorButton>
        </div>
        <Show when={editingConnection() ? graph.selectedMapping() : undefined}>
          {(mapping) => (
            <ConnectionForm
              mapping={mapping()}
              onConnect={graph.handleConnect}
              onClose={() => setEditingConnection(false)}
            />
          )}
        </Show>
        <div class="puppet-graph-canvas">
          <SolidFlowProvider>
            <SolidFlow
              nodes={graph.nodes}
              edges={graph.edges}
              nodeTypes={NODE_TYPES}
              edgeTypes={EDGE_TYPES}
              colorMode="dark"
              ariaLabelConfig={{
                'controls.fitView.ariaLabel': '그래프 맞춤',
                'controls.zoomIn.ariaLabel': '그래프 확대',
                'controls.zoomOut.ariaLabel': '그래프 축소',
              }}
              initialViewport={{x: 24, y: 24, zoom: 0.9}}
              fitViewOptions={{maxZoom: 0.9, minZoom: 0.1, padding: 0.15}}
              minZoom={0.1}
              isValidConnection={(connection) => graph.resolve(connection) !== undefined}
              onConnect={graph.handleConnect}
              onEdgeClick={graph.selectEdge}
              onDelete={graph.handleDelete}
              onNodeDrag={handleDrag}
              onNodeDragStop={handleDrop}
              deleteKey={['Backspace', 'Delete']}
            >
              <Background />
              <Controls class="puppet-graph-controls" orientation="horizontal" />
            </SolidFlow>
          </SolidFlowProvider>
          <div
            ref={(element) => {
              trash = element
            }}
            class="puppet-graph-trash"
            role="region"
            aria-label="카드 휴지통"
            data-active={trashActive()}
          >
            <span class="puppet-icon puppet-icon-trash" aria-hidden="true" />
          </div>
        </div>
      </section>
    </MappingGraphContext.Provider>
  )
}

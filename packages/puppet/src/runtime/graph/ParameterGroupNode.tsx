import {GroupName} from './GroupName'
import {disconnectGroupMappings} from './disconnect-group-mappings'
import {Dialog} from '@kobalte/core/dialog'
import {createSignal, Show} from 'solid-js'
import {Handle, type NodeProps, Position} from '@dschz/solid-flow'
import {EditorButton, EditorSelect, useEditorPortalMount} from '../../design-system'
import {useMappingGraph} from './context'
const DISPLAY_DIGITS = 3
export const ParameterGroupNode = (props: NodeProps) => {
  const mount = useEditorPortalMount()
  const [pendingMode, setPendingMode] = createSignal<'folder' | 'broadcast' | null>(null)
  const graph = useMappingGraph()
  const group = () =>
    graph.controls.profile()?.groups?.find((group) => `parameter:group:${group.id}` === props.id)
  const applyMode = (mode: 'folder' | 'broadcast') => {
    const profile = graph.controls.profile()
    const current = group()
    if (profile === undefined || current === undefined) {
      return
    }
    graph.controls.updateProfile({
      ...profile,
      groups: profile.groups?.map((candidate) =>
        candidate.id === current.id ? {...candidate, mode} : candidate,
      ),
      mappings: disconnectGroupMappings({group: current, mappings: profile.mappings}),
    })
    setPendingMode(null)
  }
  const changeMode = (mode: string) => {
    if (mode === 'folder' || mode === 'broadcast') {
      setPendingMode(mode)
    }
  }
  const confirmMode = () => {
    const mode = pendingMode()
    if (mode !== null) {
      applyMode(mode)
    }
  }
  const changeOpen = (open: boolean) => {
    if (!open) {
      setPendingMode(null)
    }
  }
  const toggleCollapsed = () => {
    const profile = graph.controls.profile()
    const current = group()
    if (profile !== undefined && current !== undefined) {
      graph.controls.updateProfile({
        ...profile,
        groups: profile.groups?.map((candidate) =>
          candidate.id === current.id ? {...candidate, collapsed: !candidate.collapsed} : candidate,
        ),
      })
    }
  }
  return (
    <Show when={group()}>
      {(current) => (
        <section class="puppet-group-node" aria-label={`${current().name} 그룹`}>
          <header class="puppet-group-title">
            <EditorButton
              class="nodrag nopan shrink-0"
              aria-expanded={!current().collapsed}
              aria-label={`${current().name} 그룹 ${current().collapsed ? '펼치기' : '접기'}`}
              onClick={toggleCollapsed}
            >
              <span
                class="puppet-icon"
                aria-hidden="true"
                classList={{
                  'puppet-icon-chevron-down': !current().collapsed,
                  'puppet-icon-chevron-right': current().collapsed,
                }}
              />
            </EditorButton>
            <GroupName group={current()} />
            <div class="nodrag nopan">
              <EditorSelect
                label={`${current().name} 그룹 종류`}
                options={['folder', 'broadcast']}
                optionLabel={(mode) => (mode === 'folder' ? '정리 그룹' : '일괄 입력 그룹')}
                value={current().mode}
                onChange={changeMode}
              />
            </div>
          </header>
          <Dialog open={pendingMode() !== null} onOpenChange={changeOpen}>
            <Dialog.Portal mount={mount}>
              <Dialog.Overlay class="auto-mesh-dialog-overlay" />
              <Dialog.Content class="auto-mesh-dialog-content">
                <Dialog.Title>
                  {pendingMode() === 'broadcast' ? '일괄 입력 그룹으로 변경' : '정리 그룹으로 변경'}
                </Dialog.Title>
                <Dialog.Description>
                  그룹 입력과 그룹 안 파라미터의 연결이 모두 해제됩니다.
                </Dialog.Description>
                <div class="puppet-runtime-actions">
                  <EditorButton onClick={confirmMode}>연결 해제하고 변경</EditorButton>
                  <EditorButton onClick={() => setPendingMode(null)}>취소</EditorButton>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog>
          <Show when={current().mode === 'broadcast'}>
            <div class="puppet-group-input">
              <span>입력</span>
              <Handle
                type="target"
                position={Position.Left}
                id={`group:${current().id}`}
                class="puppet-group-handle"
                aria-label={`${current().name} 그룹 입력 포트`}
              />
              <output class="puppet-group-value">
                {(graph.controls.mappedValues()[`group:${current().id}`] ?? 0).toFixed(
                  DISPLAY_DIGITS,
                )}
              </output>
            </div>
          </Show>
        </section>
      )}
    </Show>
  )
}

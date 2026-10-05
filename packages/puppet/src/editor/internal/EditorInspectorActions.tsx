import {Show} from 'solid-js'
import {EditorButton} from '../../design-system'

interface EditorInspectorActionsProps {
  readonly autoMeshAvailable?: boolean
  readonly containerUnwrapAvailable?: boolean
  readonly onAutoMesh?: () => void
  readonly onContainerUnwrap?: () => void
}

export const EditorInspectorActions = (props: EditorInspectorActionsProps) => (
  <>
    <Show when={props.autoMeshAvailable && props.onAutoMesh !== undefined}>
      <section aria-label="파트 작업" class="selection-actions puppet-selection-actions">
        <EditorButton type="button" onClick={() => props.onAutoMesh?.()}>
          자동 메시
        </EditorButton>
      </section>
    </Show>
    <Show when={props.containerUnwrapAvailable && props.onContainerUnwrap !== undefined}>
      <section aria-label="컨테이너 작업" class="selection-actions puppet-selection-actions">
        <EditorButton type="button" onClick={() => props.onContainerUnwrap?.()}>
          컨테이너 해제
        </EditorButton>
      </section>
    </Show>
  </>
)

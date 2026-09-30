import {Dialog} from '@kobalte/core/dialog'
import {For} from 'solid-js'
import {EditorButton} from '../../design-system'
import type {PuppetSpatialPrimitive} from '../../player'
import {SPATIAL_SHAPES} from './spatial-mesh-options'

interface SpatialMeshToolbarProps {
  readonly canRedo: boolean
  readonly canUndo: boolean
  readonly onAdd: (shape: PuppetSpatialPrimitive['shape']) => void
  readonly onImport: (file: File | undefined) => Promise<void>
  readonly onRedo: () => void
  readonly onUndo: () => void
}

/** Groups all mesh-creation actions at one consistent control size. */
export const SpatialMeshToolbar = (props: SpatialMeshToolbarProps) => {
  let fileInput: HTMLInputElement | undefined
  return (
    <header>
      <div class="spatial-mesh-editor-toolbar" role="group" aria-label="도형 추가">
        <For each={SPATIAL_SHAPES}>
          {(shape) => (
            <EditorButton type="button" onClick={() => props.onAdd(shape.value)}>
              <span aria-hidden="true" class={`puppet-icon ${shape.icon}`} />
              <span>{shape.label} 추가</span>
            </EditorButton>
          )}
        </For>
        <EditorButton type="button" onClick={() => fileInput?.click()}>
          <span aria-hidden="true" class="puppet-icon puppet-icon-file-import" />
          <span>메시 가져오기</span>
        </EditorButton>
        <input
          ref={(element) => {
            fileInput = element
          }}
          hidden
          type="file"
          tabindex={-1}
          accept=".glb,model/gltf-binary"
          aria-label="GLB 메시 가져오기"
          onChange={async (event) => {
            const input = event.currentTarget
            const file = input.files?.[0]
            input.value = ''
            await props.onImport(file)
          }}
        />
      </div>
      <div class="spatial-mesh-history-controls" role="group" aria-label="편집 기록">
        <EditorButton type="button" disabled={!props.canUndo} onClick={props.onUndo}>
          <span aria-hidden="true" class="puppet-icon puppet-icon-arrow-back-up" />
          <span>실행 취소</span>
        </EditorButton>
        <EditorButton type="button" disabled={!props.canRedo} onClick={props.onRedo}>
          <span aria-hidden="true" class="puppet-icon puppet-icon-arrow-forward-up" />
          <span>다시 실행</span>
        </EditorButton>
      </div>
      <Dialog.CloseButton aria-label="닫기" class="spatial-mesh-close">
        <span aria-hidden="true" class="puppet-icon puppet-icon-x" />
      </Dialog.CloseButton>
    </header>
  )
}

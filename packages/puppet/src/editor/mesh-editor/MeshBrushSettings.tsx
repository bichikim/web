import {EditorNumberField} from '../../design-system'
import {Show} from 'solid-js'
import type {MeshBrushControlsProps} from './types'

export const MeshBrushSettings = (props: MeshBrushControlsProps) => (
  <fieldset class="deform-brush-settings" aria-label="변형 브러시 설정">
    <label>
      반경
      <EditorNumberField
        label="변형 브러시 반경"
        maximumFractionDigits={2}
        value={props.editor.brushRadius()}
        minimum={1}
        onValueChange={props.editor.setBrushRadius}
      />
    </label>
    <label>
      강도
      <EditorNumberField
        label="변형 브러시 강도"
        maximumFractionDigits={2}
        value={props.editor.brushStrength()}
        minimum={1}
        maximum={100}
        unit="%"
        onValueChange={props.editor.setBrushStrength}
      />
    </label>
    <Show when={props.editor.brushMode() !== 'smooth'}>
      <label>
        경도
        <EditorNumberField
          label="변형 브러시 경도"
          maximumFractionDigits={2}
          value={props.editor.brushHardness()}
          minimum={0}
          maximum={100}
          unit="%"
          onValueChange={props.editor.setBrushHardness}
        />
      </label>
    </Show>
  </fieldset>
)

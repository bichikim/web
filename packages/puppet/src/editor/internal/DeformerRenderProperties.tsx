import {EditorColorField, EditorNumberField} from '../../design-system'
import {Show} from 'solid-js'

import {getDeformerRenderProperties} from '../../deformation'
import type {PuppetDeformerRenderProperties, PuppetDocument} from '../../player'
import {colorToHex, hexToColor} from './color-hex'
import {
  type DeformerKeyformTarget,
  getDeformerKeyformEntry,
  getSceneDeformer,
  setDeformerRenderProperties,
  setDeformerRotationScale,
} from './deformer-render-properties'
import {EditorPropertyGroup} from './EditorPropertyGroup'

const MINIMUM_ROTATION_SCALE = 0.01
const MAXIMUM_ROTATION_SCALE = 10

export interface DeformerRenderPropertiesProps {
  readonly disabled: boolean
  readonly document: PuppetDocument
  /** The selected keyform of the active parameter. */
  readonly keyform?: DeformerKeyformTarget
  readonly nodeId: string
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
}

/**
 * Opacity and colors a deformer passes to everything inside it, and a rotation deformer's
 * scale. Both are keyed in the selected keyform once the active parameter moves the deformer;
 * opacity and colors otherwise edit the rest values.
 */
export const DeformerRenderProperties = (props: DeformerRenderPropertiesProps) => {
  const deformer = () => getSceneDeformer(props.document, props.nodeId)
  const entry = () => getDeformerKeyformEntry(props.document, props.nodeId, props.keyform)
  const properties = () => {
    const node = deformer()
    return node === undefined
      ? undefined
      : {...getDeformerRenderProperties(node), ...entry()?.properties}
  }
  const commit = (document: PuppetDocument | undefined) => {
    if (document !== undefined && !props.disabled) {
      props.onDocumentChange?.(document)
    }
  }
  const apply = (changes: PuppetDeformerRenderProperties) =>
    commit(
      setDeformerRenderProperties({
        document: props.document,
        nodeId: props.nodeId,
        properties: changes,
        target: props.keyform,
      }),
    )
  const applyColor = (property: 'multiplyColor' | 'screenColor', value: string) => {
    const color = hexToColor(value)
    if (color !== undefined) {
      apply({[property]: color})
    }
  }
  const disabled = () => props.disabled || props.onDocumentChange === undefined
  return (
    <Show when={properties()}>
      {(current) => (
        <EditorPropertyGroup
          class="deformer-render-properties"
          title="디포머 렌더링"
          tooltip="불투명도와 색상은 하위 파트와 디포머에 곱해집니다"
        >
          <label>
            불투명도
            <EditorNumberField
              disabled={disabled()}
              label="디포머 불투명도"
              maximum={1}
              minimum={0}
              name={`${props.nodeId}-deformer-opacity`}
              step={0.01}
              value={current().opacity}
              onEditEnd={props.onEditEnd}
              onEditStart={props.onEditStart}
              onValueChange={(opacity) => apply({opacity})}
            />
          </label>
          <div class="editor-color-row">
            <span>곱하기 색상</span>
            <EditorColorField
              disabled={disabled()}
              label="디포머 곱하기 색상"
              value={colorToHex(current().multiplyColor)}
              onEditEnd={props.onEditEnd}
              onEditStart={props.onEditStart}
              onValueChange={(value) => applyColor('multiplyColor', value)}
            />
          </div>
          <div class="editor-color-row">
            <span>스크린 색상</span>
            <EditorColorField
              disabled={disabled()}
              label="디포머 스크린 색상"
              value={colorToHex(current().screenColor)}
              onEditEnd={props.onEditEnd}
              onEditStart={props.onEditStart}
              onValueChange={(value) => applyColor('screenColor', value)}
            />
          </div>
          <Show when={deformer()?.deformerType === 'rotation'}>
            <label>
              <span data-tooltip="활성 파라미터의 키폼에서만 편집합니다">배율</span>
              <EditorNumberField
                disabled={disabled() || props.keyform === undefined || entry() === undefined}
                label="회전 디포머 배율"
                maximum={MAXIMUM_ROTATION_SCALE}
                minimum={MINIMUM_ROTATION_SCALE}
                name={`${props.nodeId}-rotation-scale`}
                step={0.01}
                value={entry()?.rotationScale ?? 1}
                onEditEnd={props.onEditEnd}
                onEditStart={props.onEditStart}
                onValueChange={(rotationScale) => {
                  if (props.keyform !== undefined) {
                    commit(
                      setDeformerRotationScale({
                        document: props.document,
                        nodeId: props.nodeId,
                        rotationScale,
                        target: props.keyform,
                      }),
                    )
                  }
                }}
              />
            </label>
          </Show>
        </EditorPropertyGroup>
      )}
    </Show>
  )
}

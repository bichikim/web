import {Button} from '@kobalte/core/button'
import {Show} from 'solid-js'
import type {PuppetDocument, PuppetSceneDeformerNode} from '../../player'
import {editCurveTopology} from './curve-topology'

interface CurvePropertiesProps {
  readonly document: PuppetDocument
  readonly node: PuppetSceneDeformerNode
  readonly disabled?: boolean
  readonly selectedPoints?: ReadonlyArray<number>
  readonly onDocumentChange?: (document: PuppetDocument) => void
}

const CUBIC_DEGREE = 3
const MAXIMUM_SEGMENTS = 32

export const CurveProperties = (props: CurvePropertiesProps) => {
  const count = () => (props.node.controlPoints.length / 2 - 1) / CUBIC_DEGREE
  const selected = () => props.selectedPoints?.[0] ?? 0
  const segment = () => Math.min(count() - 1, Math.floor(selected() / CUBIC_DEGREE))
  const removable = () =>
    selected() > 0 && selected() < count() * CUBIC_DEGREE && selected() % CUBIC_DEGREE === 0
  const handleEdit = (operation: 'split' | 'remove') => {
    if (props.disabled) {
      return
    }
    const document = editCurveTopology({
      document: props.document,
      index: operation === 'split' ? segment() : selected() / CUBIC_DEGREE,
      nodeId: props.node.id,
      operation,
    })
    if (document !== undefined) {
      props.onDocumentChange?.(document)
    }
  }
  return (
    <Show when={props.node.curveAxis !== undefined}>
      <fieldset class="deformer-properties">
        <legend>곡선 · {count()}구간</legend>
        <div class="mask-actions">
          <Button
            class="mask-action-button"
            disabled={props.disabled || count() >= MAXIMUM_SEGMENTS}
            onClick={() => handleEdit('split')}
          >
            구간 나누기
          </Button>
          <Button
            class="mask-action-button"
            disabled={props.disabled || !removable()}
            title="선택한 내부 연결점을 삭제합니다. 곡선 모양이 달라질 수 있습니다."
            onClick={() => handleEdit('remove')}
          >
            연결점 삭제
          </Button>
        </div>
        <p class="mask-empty-state">
          곡선 위 더블클릭으로 연결점을 추가합니다. 내부 연결점을 선택하고 Backspace 또는 Delete로
          삭제합니다.
        </p>
      </fieldset>
    </Show>
  )
}

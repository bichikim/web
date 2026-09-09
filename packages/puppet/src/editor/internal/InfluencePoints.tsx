import {EditorButton, EditorNumberField} from '../../design-system'
import {Index} from 'solid-js'
import type {InfluenceRelationProps, useInfluenceSettings} from './use-influence-settings'
const WHOLE_PERCENT = 100
interface InfluencePointsProps extends InfluenceRelationProps {
  readonly settings: ReturnType<typeof useInfluenceSettings>
}
export const InfluencePoints = (props: InfluencePointsProps) => (
  <div class="influence-settings">
    <p>
      입력값 사이에서 적용량이 점진적으로 바뀝니다. 양 끝 바깥에서는 끝점의 적용량을 유지합니다.
    </p>
    <Index each={props.settings.relation().points}>
      {(point, pointIndex) => (
        <div class="influence-point">
          <label>
            입력값
            <EditorNumberField
              label={`관계 ${props.index + 1} 입력값 ${pointIndex + 1}`}
              step="any"
              value={point().value}
              minimum={props.draft.parameter(props.index)?.minimum}
              maximum={props.draft.parameter(props.index)?.maximum}
              onValueChange={(value) =>
                props.settings.editCurve(() =>
                  props.draft.changePoint(props.index, pointIndex, {value}),
                )
              }
            />
          </label>
          <label>
            적용량
            <EditorNumberField
              label={`관계 ${props.index + 1} 영향도 ${pointIndex + 1}`}
              value={point().weight * WHOLE_PERCENT}
              minimum={0}
              maximum={100}
              unit="%"
              onValueChange={(value) =>
                props.settings.editCurve(() =>
                  props.draft.changePoint(props.index, pointIndex, {
                    weight: value / WHOLE_PERCENT,
                  }),
                )
              }
            />
          </label>
          <EditorButton
            aria-label={`관계 ${props.index + 1} 점 ${pointIndex + 1} 삭제`}
            disabled={props.settings.relation().points.length <= 1}
            onClick={() =>
              props.settings.editCurve(() => props.draft.removePoint(props.index, pointIndex))
            }
          >
            점 삭제
          </EditorButton>
        </div>
      )}
    </Index>
    <EditorButton
      disabled={!props.draft.canAddPoint(props.index)}
      onClick={() => props.settings.editCurve(() => props.draft.addPoint(props.index))}
    >
      중간점 추가
    </EditorButton>
  </div>
)

import {createMemo, Show} from 'solid-js'
import {getDocumentScene, type PuppetDocument, type PuppetSkinBinding} from '../../player'
import {getSkinFrames} from '../../deformation/skinning'
import {changeSkinWeight} from './skinning'
import {useSkinSession} from './skin-session'
import {EditorButton, EditorNumberField} from '../../design-system'
import {connectSkinSelection} from './skinning'
import {SkinningDisconnect} from './SkinningDisconnect'
interface SkinningInfluenceEditorProps {
  readonly document: PuppetDocument
  readonly partId?: string
  readonly binding: PuppetSkinBinding
  readonly vertexIndex?: number
  readonly onChange: (binding: PuppetSkinBinding) => void
  readonly onEditStart?: () => void
  readonly onEditEnd?: () => void
}
const PERCENT = 100
const STRENGTH_OFFSET = 0.5
export const SkinningInfluenceEditor = (props: SkinningInfluenceEditorProps) => {
  const frames = createMemo(() => getSkinFrames(getDocumentScene(props.document).roots))
  const session = useSkinSession()
  const selectedJoint = () => session?.jointId() ?? props.binding.influences[0]?.nodeId
  const activeInfluence = () =>
    props.binding.influences.find((item) => item.nodeId === selectedJoint())
  return (
    <>
      {' '}
      <span>
        {props.vertexIndex === undefined ? '전체 영향 강도' : `정점 ${props.vertexIndex + 1}`}
      </span>
      <span>{frames().get(selectedJoint() ?? '')?.node.name ?? '관절 선택'}</span>
      <Show when={activeInfluence() === undefined}>
        <EditorButton
          onClick={() => {
            const next = connectSkinSelection({
              append: true,
              document: props.document,
              nodeIds: [props.partId ?? '', selectedJoint() ?? ''],
            })
            const node = getSkinFrames(getDocumentScene(next).roots).get(props.partId ?? '')?.node
            if (node?.kind === 'part' && node.skinning !== undefined) {
              props.onChange(node.skinning)
            }
          }}
        >
          선택 관절 연결
        </EditorButton>
      </Show>
      <Show when={activeInfluence()}>
        {(influence) => (
          <label>
            <SkinningDisconnect
              document={props.document}
              partId={props.partId}
              nodeId={influence().nodeId}
              binding={props.binding}
              name={frames().get(influence().nodeId)?.node.name}
              onChange={props.onChange}
            />

            <EditorNumberField
              label={`${frames().get(influence().nodeId)?.node.name ?? influence().nodeId} 스키닝 ${
                props.vertexIndex === undefined ? '영향 강도' : '가중치'
              }`}
              minimum={0}
              maximum={PERCENT}
              step={1}
              unit={props.vertexIndex === undefined ? undefined : '%'}
              value={
                (props.vertexIndex === undefined
                  ? (influence().strength ?? 1) - STRENGTH_OFFSET
                  : (influence().weights[props.vertexIndex] ?? 0)) * PERCENT
              }
              onValueChange={(value) =>
                props.onChange(
                  changeSkinWeight(
                    props.binding,
                    props.binding.influences.indexOf(influence()),
                    value / PERCENT,
                    props.vertexIndex,
                  ),
                )
              }
              onEditStart={props.onEditStart}
              onEditEnd={props.onEditEnd}
            />
          </label>
        )}
      </Show>
    </>
  )
}

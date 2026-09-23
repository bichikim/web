import {createMemo, For} from 'solid-js'
import {getDocumentScene, type PuppetDocument} from '../../player'
import {getSkinFrames, transformSkinPoint} from '../../deformation/skinning'
import {useSkinSession} from './skin-session'

export const SkinningJoints = (props: {readonly document: PuppetDocument}) => {
  const session = useSkinSession()
  const joints = createMemo(() =>
    [...getSkinFrames(getDocumentScene(props.document).roots).values()].flatMap((frame) => {
      const {node} = frame
      if (node.kind !== 'deformer' || node.deformerType !== 'rotation') {
        return []
      }
      const points = node.boneRestPoints ?? node.controlPoints
      return [
        {
          id: node.id,
          name: node.name,
          point: transformSkinPoint(frame.matrix, {x: points[0]!, y: points[1]!}),
        },
      ]
    }),
  )
  return (
    <For each={joints()}>
      {(joint) => (
        <circle
          class="skin-joint-pick"
          cx={joint.point.x}
          cy={joint.point.y}
          role="button"
          tabIndex={0}
          aria-label={`${joint.name} 스키닝 관절 선택`}
          aria-pressed={session?.jointId() === joint.id}
          onPointerDown={(event) => {
            event.stopPropagation()
            event.preventDefault()
            session?.setJointId(joint.id)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              event.stopPropagation()
              session?.setJointId(joint.id)
            }
          }}
        >
          <title>{joint.name}</title>
        </circle>
      )}
    </For>
  )
}

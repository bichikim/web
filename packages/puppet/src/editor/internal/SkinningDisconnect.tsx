import type {PuppetDocument, PuppetSkinBinding} from '../../player'
import {configurePartSkinning} from './skinning'
import {EditorButton} from '../../design-system'

interface SkinningDisconnectProps {
  readonly document: PuppetDocument
  readonly partId?: string
  readonly nodeId: string
  readonly name?: string
  readonly binding: PuppetSkinBinding
  readonly onChange: (binding: PuppetSkinBinding) => void
}
export const SkinningDisconnect = (props: SkinningDisconnectProps) => (
  <EditorButton
    aria-label={`${props.name ?? props.nodeId} 스키닝 연결 제거`}
    disabled={props.binding.influences.length <= 2}
    title="관절 두 개는 유지해야 합니다. 전체 해제는 스키닝 해제를 사용하세요."
    onClick={() => {
      const result = configurePartSkinning(
        props.document,
        props.partId ?? '',
        props.binding,
        props.binding.influences
          .filter((item) => item.nodeId !== props.nodeId)
          .map((item) => item.nodeId),
      )
      if (result !== undefined) {
        props.onChange(result)
      }
    }}
  >
    연결 제거
  </EditorButton>
)

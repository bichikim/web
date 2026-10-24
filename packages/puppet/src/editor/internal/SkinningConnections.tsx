import {createMemo, Show} from 'solid-js'
import {getDocumentScene, type PuppetDocument} from '../../player'
import {getSkinFrames} from '../../deformation/skinning'
import {connectSkinSelection} from './skinning'
import {EditorButton} from '../../design-system'

interface SkinningConnectionsProps {
  readonly document: PuppetDocument
  readonly nodeIds: ReadonlyArray<string>
  readonly onDocumentChange: (document: PuppetDocument) => void
}

export const SkinningConnections = (props: SkinningConnectionsProps) => {
  const selection = createMemo(() => {
    const frames = getSkinFrames(getDocumentScene(props.document).roots)
    const nodes = props.nodeIds.flatMap((id) => {
      const node = frames.get(id)?.node
      return node === undefined ? [] : [node]
    })
    return {
      joints: nodes.filter((node) => node.kind === 'deformer' && node.deformerType === 'rotation'),
      parts: nodes.filter((node) => node.kind === 'part'),
    }
  })
  const connect = (append: boolean) =>
    props.onDocumentChange(
      connectSkinSelection({
        append,
        document: props.document,
        nodeIds: props.nodeIds,
      }),
    )
  return (
    <Show when={selection().parts.length > 0 && selection().joints.length > 0}>
      <fieldset class="deformer-properties">
        <legend>선택 항목 스키닝 연결</legend>
        <span>
          파츠 {selection().parts.length}개 · 관절 {selection().joints.length}개
        </span>
        <span>
          {selection()
            .joints.map((node) => node.name)
            .join(' · ')}
        </span>
        <EditorButton disabled={selection().joints.length < 2} onClick={() => connect(false)}>
          선택 관절로 연결
        </EditorButton>
        <EditorButton
          disabled={selection().parts.some((node) => node.skinning === undefined)}
          onClick={() => connect(true)}
        >
          선택 관절 추가
        </EditorButton>
        <span>연결 시 자동 가중치를 다시 계산합니다. 새 연결은 관절 2개 이상을 선택하세요.</span>
      </fieldset>
    </Show>
  )
}

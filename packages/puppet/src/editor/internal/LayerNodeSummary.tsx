import {isSceneContainerNode, type PuppetSceneNode} from '../../player'

interface LayerNodeSummaryProps {
  readonly node: PuppetSceneNode
  readonly vertexCount: number
}

export const getLayerSelectionLabel = (node: PuppetSceneNode) =>
  `${node.name}${node.kind === 'deformer' && node.deformerType === 'spatial' ? ' 3D 디포머' : ''} 레이어 선택`

export const LayerNodeSummary = (props: LayerNodeSummaryProps) => (
  <small>
    {props.node.kind === 'deformer' && props.node.deformerType === 'spatial' && (
      <>
        <span class="layer-kind-badge">3D</span>{' '}
      </>
    )}
    {isSceneContainerNode(props.node)
      ? `${props.node.children.length} items`
      : `${props.vertexCount} vertices`}
  </small>
)

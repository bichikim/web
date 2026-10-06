import type {SpatialPreviewTool} from './SpatialMeshPreview'

export const SPATIAL_SHAPES = [
  {icon: 'puppet-icon-cube', label: '박스', value: 'box'},
  {icon: 'puppet-icon-prism', label: '삼각기둥', value: 'prism'},
  {icon: 'puppet-icon-sphere', label: '구체', value: 'sphere'},
  {icon: 'puppet-icon-cylinder', label: '원기둥', value: 'cylinder'},
] as const

export const SPATIAL_OPERATIONS = [
  {
    description: '선택한 객체를 더합니다',
    icon: 'puppet-icon-circle-plus',
    label: '더하기',
    shortLabel: '더하기',
    value: 'add',
  },
  {
    description: '첫 객체에서 나머지를 뺍니다',
    icon: 'puppet-icon-circle-minus',
    label: '빼기',
    shortLabel: '빼기',
    value: 'subtract',
  },
  {
    description: '겹치는 부분만 남깁니다',
    icon: 'puppet-icon-layers-intersect',
    label: '겹치기',
    shortLabel: '겹치기',
    value: 'intersect',
  },
  {
    description: '경계가 둥글게 이어집니다',
    icon: 'puppet-icon-blend-mode',
    label: '부드럽게 더하기',
    shortLabel: '부드럽게',
    value: 'smooth-add',
  },
] as const

export const SPATIAL_TOOLS: ReadonlyArray<{label: string; value: SpatialPreviewTool}> = [
  {label: '시점', value: 'orbit'},
  {label: '이동', value: 'move'},
  {label: '회전', value: 'rotate'},
  {label: '크기', value: 'scale'},
]

export const SPATIAL_TOOL_ICONS: Record<SpatialPreviewTool, string> = {
  move: 'puppet-icon-arrows-move',
  orbit: 'puppet-icon-hand-move',
  rotate: 'puppet-icon-rotation',
  scale: 'puppet-icon-arrows-diagonal',
}

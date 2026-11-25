export interface CompositionPart {
  assetId?: string
  clipTo?: string
  controlledBy?: string
  follows?: string
  group?: string
  id: string
  label: string
  multiply?: boolean
  opacity: number
  panelGroup?: string
  rotation: number
  scaleX: number
  scaleY: number
  visible: boolean
  x: number
  y: number
}

export interface CompositionPartControl {
  readonly opacity: number
  readonly transform: string
  readonly visible: boolean
}

export type NumericField = 'x' | 'y' | 'scaleX' | 'scaleY' | 'rotation' | 'opacity'

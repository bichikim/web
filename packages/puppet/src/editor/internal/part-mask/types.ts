import type {PuppetPart} from '../../../player'

export interface MaskTargetOption {
  readonly disabled: boolean
  readonly reason?: string
  readonly label: string
  readonly part: PuppetPart
}

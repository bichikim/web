import {type TourStep} from '@winter-love/solid-use/tour'

export interface PTourStep extends TourStep {
  readonly description?: string
  readonly title: string
  readonly video?: {
    readonly label: string
    readonly source: string
  }
}

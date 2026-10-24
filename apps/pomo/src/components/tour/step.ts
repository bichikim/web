import {type TourStep} from '@winter-love/solid-use/tour'

export interface PTourStep extends TourStep {
  readonly description?: string
  readonly title: string
  readonly audio?: {
    readonly source: string
  }
  readonly video?: {
    readonly label: string
    readonly source: string
  }
}

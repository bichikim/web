export interface InteractionSettings {
  readonly activation: 'passThrough' | 'always'
}

export const DEFAULT_INTERACTION: InteractionSettings = {
  activation: 'passThrough',
}

import type {LipSyncShape} from '@winter-love/wallpaper/settings/lipsync'

/** Relative pose contributions, with a total no greater than one. */
export type LipSyncWeights = Readonly<Partial<Record<LipSyncShape, number>>>
export type LipSyncOutput = (
  shape: LipSyncShape | null,
  level: number,
  weights?: LipSyncWeights,
) => void

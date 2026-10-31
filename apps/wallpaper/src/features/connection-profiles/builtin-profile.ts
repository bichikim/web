import {
  type ConnectionProfile,
  connectionProfileSchema,
} from '@winter-love/wallpaper/settings/connections'
import ash from './ash.json'

export const builtinConnectionProfile = (assetId: string): ConnectionProfile | undefined =>
  assetId === ash.assetId ? connectionProfileSchema.parse(ash) : undefined

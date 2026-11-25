import type {WallpaperContent} from '@winter-love/wallpaper/settings/model'

export interface ThemeExportSelection {
  /** Background draft to include. Omit it to export without a background. */
  readonly background?: WallpaperContent
  /** IDs of individual widgets to include from the selected screen. */
  readonly widgetIds: readonly string[]
  /** Name shown in the file and in the import preview. */
  readonly name: string
}

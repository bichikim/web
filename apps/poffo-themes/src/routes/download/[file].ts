import type {APIEvent} from '@solidjs/start/server'
import {writeThemeArchive} from '@winter-love/wallpaper/theme-archive'
import {themeManifest, themes} from '../../catalog'

export const GET = (event: APIEvent): Response => {
  const theme = themes.find((item) => `${item.slug}.poffotheme` === event.params.file)
  if (theme === undefined) {
    return new Response(null, {status: 404})
  }
  return new Response(writeThemeArchive({assets: {}, manifest: themeManifest(theme)}), {
    headers: {
      'Content-Disposition': `attachment; filename="${theme.slug}.poffotheme"`,
      'Content-Type': 'application/zip',
    },
  })
}

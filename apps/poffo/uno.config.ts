import {headerShortcuts} from './uno/shortcuts/header'
import {defineConfig} from 'unocss'
import puppet from '@winter-love/puppet/uno'
import {runtimeShortcuts, viewerShortcuts} from './uno/shortcuts/viewer'
import {converterShortcuts} from './uno/shortcuts/converter'
import {colorThemeShortcuts} from './uno/shortcuts/color-theme'

const shortcuts = {
  ...headerShortcuts,
  ...runtimeShortcuts,
  ...viewerShortcuts,
  ...converterShortcuts,
  ...colorThemeShortcuts,
}

export default defineConfig({
  ...puppet,
  preflights: [
    ...(puppet.preflights ?? []),
    {
      getCSS: () =>
        '.puppet-editor .toolbar-menu-trigger[data-tooltip-active] {' +
        'anchor-name: --toolbar-menu, var(--editor-tooltip-anchor); }',
    },
  ],
  safelist: [...(puppet.safelist ?? []), ...Object.keys(shortcuts)],
  shortcuts: {...puppet.shortcuts, ...shortcuts},
})

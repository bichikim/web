import {controlShortcuts} from './src/design-system/shortcuts'
import {icons as tablerIcons} from '@iconify-json/tabler'
import {defineConfig, presetIcons, presetWind3} from 'unocss'
import {iconShortcuts} from './src/design-system/icons'
import {rules} from './uno/rules'
import {layoutShortcuts} from './uno/shortcuts/layout'
import {layersShortcuts} from './uno/shortcuts/layers'
import {propertiesShortcuts} from './uno/shortcuts/properties'
import {canvasShortcuts} from './uno/shortcuts/canvas'
import {parametersShortcuts} from './uno/shortcuts/parameters'
import {dialogsShortcuts} from './uno/shortcuts/dialogs'

const shortcuts = {
  'puppet-demo': [
    'w-full h-full m-0 [&_body]:w-full [&_body]:h-full [&_body]:m-0 [&_body]:overflow-hidden',
    '[&_#root]:w-full [&_#root]:h-full [&_puppet-editor]:w-full [&_puppet-editor]:h-full',
  ],
  ...iconShortcuts,
  ...controlShortcuts,
  ...layoutShortcuts,
  ...layersShortcuts,
  ...propertiesShortcuts,
  ...canvasShortcuts,
  ...parametersShortcuts,
  ...dialogsShortcuts,
}

export default defineConfig({
  preflights: [
    {
      getCSS: () =>
        '[data-tooltip-active] { anchor-name: var(--editor-tooltip-anchor); }' +
        '.puppet-editor .toolbar-menu-trigger[data-tooltip-active] {' +
        'anchor-name: --toolbar-menu, var(--editor-tooltip-anchor); }',
    },
  ],
  presets: [
    presetWind3({preflight: false}),
    presetIcons({collections: {tabler: () => tablerIcons}, warn: true}),
  ],
  rules,
  // Child components share one stylesheet inside the editor Shadow DOM.
  safelist: Object.keys(shortcuts),
  shortcuts,
  theme: {
    animation: {
      counts: {'layer-name': 'infinite', 'mask-march': 'infinite'},
      durations: {
        'influence-close': '180ms',
        'influence-open': '220ms',
        'layer-name': '7s',
        'temporary-alert': '450ms',
        'mask-march': '0.8s',
      },
      keyframes: {
        'influence-close': '{from{height:var(--kb-collapsible-content-height)}to{height:0}}',
        'influence-open': '{from{height:0}to{height:var(--kb-collapsible-content-height)}}',
        'layer-name': '{from{transform:translateX(0)}to{transform:translateX(-50%)}}',
        'temporary-alert':
          '{0%,100%{transform:translateX(0)}25%,75%{transform:translateX(-3px)}50%{transform:translateX(3px)}}',
        'mask-march': '{from{stroke-dashoffset:0}to{stroke-dashoffset:-12}}',
      },
      timingFns: {'layer-name': 'linear', 'mask-march': 'linear'},
    },
  },
})

import {icons as tablerIcons} from '@iconify-json/tabler'
import {defineConfig, presetIcons, presetWind3} from 'unocss'
import {iconShortcuts} from './uno/shortcuts/icons'
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
  ...layoutShortcuts,
  ...layersShortcuts,
  ...propertiesShortcuts,
  ...canvasShortcuts,
  ...parametersShortcuts,
  ...dialogsShortcuts,
}

export default defineConfig({
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
      counts: {'mask-march': 'infinite'},
      durations: {'mask-march': '0.8s'},
      keyframes: {'mask-march': '{from{stroke-dashoffset:0}to{stroke-dashoffset:-12}}'},
      timingFns: {'mask-march': 'linear'},
    },
  },
})

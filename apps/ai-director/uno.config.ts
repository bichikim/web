import {defineConfig, presetWind3} from 'unocss'

export default defineConfig({
  preflights: [{getCSS: () => 'body { margin: 0; } * { box-sizing: border-box; }'}],
  presets: [presetWind3()],
  shortcuts: {
    'action-base': [
      'cursor-pointer rounded-lg border px-4 py-3 text-sm',
      'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-300',
      'disabled:cursor-not-allowed disabled:opacity-40',
    ].join(' '),
    'action-primary':
      'action-base border-teal-400 bg-teal-400 font-semibold text-slate-950 hover:bg-teal-300',
    'action-secondary':
      'action-base border-slate-700 bg-slate-800 font-medium text-slate-100 hover:bg-slate-700',
    'method-option': [
      'flex cursor-pointer items-start gap-3 rounded-lg border border-slate-700 p-3',
      'has-[:checked]:border-teal-400 has-[:checked]:bg-teal-400/5',
    ].join(' '),
  },
})

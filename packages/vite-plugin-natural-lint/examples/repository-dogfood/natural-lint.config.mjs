import filenameOptions from '../filename-rules/natural-lint.config.mjs'

const [filenameRule] = filenameOptions.rules

const EXPECTED_FAILURES = new Set([
  '../../../../apps/pomo/src/features/focus-room-dialogue/automatic-dialogue-settings-contract.ts',
])

export default {
  ...filenameOptions,
  cacheDir: '../../node_modules/.cache/natural-lint/examples/repository-dogfood',
  include: [
    '../../../../apps/coong/src/components/midi-player/use-midi-player-state.ts',
    '../../../../apps/coong/src/components/select-menu-2/use-anchor-bounds-auto-update.ts',
    '../../../../apps/coong/src/components/select-menu/select-menu-anchor-rect.ts',
    '../../../../apps/coong/src/server/functions/auth/fetch-update-user-metadata.ts',
    '../../../../apps/coong/src/use/instruments/splendid-grand-piano-extended.ts',
    '../../../../apps/pomo-audio-gateway/src/has-string-list-item.ts',
    '../../../../apps/pomo/src/components/music-player-view/use-swipe-track-gesture.ts',
    '../../../../apps/pomo/src/features/admin-music/create-draft-reference-lifecycle.ts',
    '../../../../apps/pomo/src/features/focus-room-dialogue/automatic-dialogue-settings-contract.ts',
    '../../../../apps/pomo/src/server/weather/get-weather-feed-state.ts',
  ],
  rules: [
    {
      ...filenameRule,
      expected: ({relativePath}) => (EXPECTED_FAILURES.has(relativePath) ? 'fail' : 'pass'),
    },
  ],
}

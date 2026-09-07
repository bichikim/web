# Unit-test ownership refactoring

## Goal

Give every executable Pomo source file one dedicated unit-test target. A test file must not own behavior from multiple production files.

## Test ownership contract

- Place tests in the target directory’s `__tests__` directory.
- Name the default test `{targetFileName}.spec.ts` or `{targetFileName}.spec.tsx`.
- Name a necessary split `{targetFileName}.{scope}.spec.ts` while retaining one production target.
- Imports used only as mocked dependencies, fixtures, or helpers do not become additional targets.
- Verify with Wallaby first, then run Pomo lint, typecheck, format, and diff checks.

## Execution order

1. `server/**` — isolate schema, persistence, storage, HTTP, authentication, and weather boundaries.
2. `middleware/**` — separate header policy coverage from middleware composition.
3. `routes/**` — split aggregate route tests into one route target per file.
4. `features/**` — separate barrel, hook, worker, storage, and animation ownership.
5. `components/**` — split aggregate component tests and add leaf-component ownership.

## Current inventory

- Executable source targets: 781
- Unit-test files: 580
- Targets with a dedicated test: 494
- Remaining missing dedicated targets: 287

| Area            | Initial gap | Completed | Remaining |
| --------------- | ----------: | --------: | --------: |
| `server/**`     |          15 |        15 |         0 |
| `middleware/**` |           1 |         0 |         1 |
| `routes/**`     |          11 |         0 |        11 |
| `features/**`   |         142 |         0 |       142 |
| `components/**` |         133 |         0 |       133 |

## server/\*\* (15)

- [x] `apps/pomo/src/server/admin-auth/access.ts`
- [x] `apps/pomo/src/server/database/schema/feed-channels.ts`
- [x] `apps/pomo/src/server/database/schema/historical-generation-runs.ts`
- [x] `apps/pomo/src/server/database/schema/historical-moments.ts`
- [x] `apps/pomo/src/server/database/schema/index.ts`
- [x] `apps/pomo/src/server/database/schema/users.ts`
- [x] `apps/pomo/src/server/database/schema/weather.ts`
- [x] `apps/pomo/src/server/history-generation/is-gpt-56-model.ts`
- [x] `apps/pomo/src/server/history-generation/submission-persistence.ts`
- [x] `apps/pomo/src/server/http/headers.ts`
- [x] `apps/pomo/src/server/music/track-upload/preview.ts`
- [x] `apps/pomo/src/server/music/track-upload/storage.ts`
- [x] `apps/pomo/src/server/music/track-upload.ts`
- [x] `apps/pomo/src/server/weather/locations.ts`
- [x] `apps/pomo/src/server/weather/repository.ts`

## middleware/\*\* (1)

- [ ] `apps/pomo/src/middleware/security-header-policy.ts`

## routes/\*\* (11)

- [ ] `apps/pomo/src/routes/account.tsx`
- [ ] `apps/pomo/src/routes/admin/index.tsx`
- [ ] `apps/pomo/src/routes/admin/login.tsx`
- [ ] `apps/pomo/src/routes/api/auth/[...path].ts`
- [ ] `apps/pomo/src/routes/api/weather/feeds/[city].ts`
- [ ] `apps/pomo/src/routes/app-in-toss/privacy.tsx`
- [ ] `apps/pomo/src/routes/app-in-toss/terms.tsx`
- [ ] `apps/pomo/src/routes/desktop/player.tsx`
- [ ] `apps/pomo/src/routes/desktop/pomodoro.tsx`
- [ ] `apps/pomo/src/routes/desktop/settings.tsx`
- [ ] `apps/pomo/src/routes/sitemap.xml.ts`

## features/\*\* (142)

- [ ] `apps/pomo/src/features/admin-auth/index.ts`
- [ ] `apps/pomo/src/features/admin-auth/use-admin-dashboard.ts`
- [ ] `apps/pomo/src/features/admin-auth/use-admin-login.ts`
- [ ] `apps/pomo/src/features/admin-music/album-draft.ts`
- [ ] `apps/pomo/src/features/admin-music/catalog.ts`
- [ ] `apps/pomo/src/features/admin-music/index.ts`
- [ ] `apps/pomo/src/features/admin-music/use-admin-music.ts`
- [ ] `apps/pomo/src/features/album-translation/index.ts`
- [ ] `apps/pomo/src/features/album-translation/messages.ts`
- [ ] `apps/pomo/src/features/album-translation/prompt.ts`
- [ ] `apps/pomo/src/features/application-recovery/index.ts`
- [ ] `apps/pomo/src/features/character-renderer/index.ts`
- [ ] `apps/pomo/src/features/chat/index.ts`
- [ ] `apps/pomo/src/features/chat/messages.ts`
- [ ] `apps/pomo/src/features/chat-voice/index.ts`
- [ ] `apps/pomo/src/features/client-error-reporter/index.ts`
- [ ] `apps/pomo/src/features/deployment-recovery/index.ts`
- [ ] `apps/pomo/src/features/desktop-mode/index.ts`
- [ ] `apps/pomo/src/features/dialogue-writer/index.ts`
- [ ] `apps/pomo/src/features/dialogue-writer/messages.ts`
- [ ] `apps/pomo/src/features/feed-publisher/contract.ts`
- [ ] `apps/pomo/src/features/feed-publisher/escape-xml.ts`
- [ ] `apps/pomo/src/features/feed-publisher/index.ts`
- [ ] `apps/pomo/src/features/feed-publisher/render-helpers.ts`
- [ ] `apps/pomo/src/features/focus-room-animation/breathing-motion.ts`
- [ ] `apps/pomo/src/features/focus-room-animation/day-reading-focused-layer-scene.ts`
- [ ] `apps/pomo/src/features/focus-room-animation/day-sky-layer.ts`
- [ ] `apps/pomo/src/features/focus-room-animation/day-writing-layer-scene.ts`
- [ ] `apps/pomo/src/features/focus-room-animation/eye-motion.ts`
- [ ] `apps/pomo/src/features/focus-room-animation/generated-layer-scenes.ts`
- [ ] `apps/pomo/src/features/focus-room-animation/hair-motion.ts`
- [ ] `apps/pomo/src/features/focus-room-animation/index.ts`
- [ ] `apps/pomo/src/features/focus-room-animation/layer-mask-filter.ts`
- [ ] `apps/pomo/src/features/focus-room-animation/layer-runtime-state.ts`
- [ ] `apps/pomo/src/features/focus-room-animation/layer-scene-definition.ts`
- [ ] `apps/pomo/src/features/focus-room-animation/layer-scene.ts`
- [ ] `apps/pomo/src/features/focus-room-animation/masked-pixel-push-filter.ts`
- [ ] `apps/pomo/src/features/focus-room-animation/motion-reset.ts`
- [ ] `apps/pomo/src/features/focus-room-animation/mouth-layers.ts`
- [ ] `apps/pomo/src/features/focus-room-animation/night-reading-faint-star-layers.ts`
- [ ] `apps/pomo/src/features/focus-room-animation/night-reading-layer-position.ts`
- [ ] `apps/pomo/src/features/focus-room-animation/night-reading-star-layers.ts`
- [ ] `apps/pomo/src/features/focus-room-animation/night-user-mouth-sources.ts`
- [ ] `apps/pomo/src/features/focus-room-animation/opacity-pulse.ts`
- [ ] `apps/pomo/src/features/focus-room-animation/pixel-push-filter.ts`
- [ ] `apps/pomo/src/features/focus-room-animation/prepared-scene.ts`
- [ ] `apps/pomo/src/features/focus-room-animation/push-filter-factory.ts`
- [ ] `apps/pomo/src/features/focus-room-animation/scene-catalog-channels.ts`
- [ ] `apps/pomo/src/features/focus-room-animation/scene-definition-validation.ts`
- [ ] `apps/pomo/src/features/focus-room-animation/scene-layer-catalog.ts`
- [ ] `apps/pomo/src/features/focus-room-animation/scene-layout.ts`
- [ ] `apps/pomo/src/features/focus-room-animation/scene-mask-sources.ts`
- [ ] `apps/pomo/src/features/focus-room-animation/scene-renderer.ts`
- [ ] `apps/pomo/src/features/focus-room-animation/scene-state.ts`
- [ ] `apps/pomo/src/features/focus-room-animation/scene-style.ts`
- [ ] `apps/pomo/src/features/focus-room-animation/visibility-cycle.ts`
- [ ] `apps/pomo/src/features/focus-room-audio/focus-room-playlist/model.ts`
- [ ] `apps/pomo/src/features/focus-room-audio/focus-room-playlist/published-catalog.ts`
- [ ] `apps/pomo/src/features/focus-room-audio/index.ts`
- [ ] `apps/pomo/src/features/focus-room-dialogue/automatic-dialogue-settings-contract.ts`
- [ ] `apps/pomo/src/features/focus-room-dialogue/database.ts`
- [ ] `apps/pomo/src/features/focus-room-dialogue/dialogue-editor-audio-state.ts`
- [ ] `apps/pomo/src/features/focus-room-dialogue/dialogue-editor-contract.ts`
- [ ] `apps/pomo/src/features/focus-room-dialogue/dialogue-record.ts`
- [ ] `apps/pomo/src/features/focus-room-dialogue/entry-playback-controller/queue.ts`
- [ ] `apps/pomo/src/features/focus-room-dialogue/entry-playback-controller.ts`
- [ ] `apps/pomo/src/features/focus-room-dialogue/event-context.ts`
- [ ] `apps/pomo/src/features/focus-room-dialogue/index.ts`
- [ ] `apps/pomo/src/features/focus-room-dialogue/use-focus-room-dialogue-editor/model-session.ts`
- [ ] `apps/pomo/src/features/focus-room-dialogue/use-focus-room-dialogue-editor.ts`
- [ ] `apps/pomo/src/features/focus-room-dialogue/use-p-event-controller/entry-playback.ts`
- [ ] `apps/pomo/src/features/focus-room-dialogue/use-p-event-controller.ts`
- [ ] `apps/pomo/src/features/focus-room-entry/index.ts`
- [ ] `apps/pomo/src/features/focus-room-feed/feed-controller.ts`
- [ ] `apps/pomo/src/features/focus-room-feed/feed-dialogue-schema.ts`
- [ ] `apps/pomo/src/features/focus-room-feed/feed-playback.ts`
- [ ] `apps/pomo/src/features/focus-room-feed/feed-state.ts`
- [ ] `apps/pomo/src/features/focus-room-feed/generation-completion.ts`
- [ ] `apps/pomo/src/features/focus-room-feed/generation-settings-runtime.ts`
- [ ] `apps/pomo/src/features/focus-room-feed/index.ts`
- [ ] `apps/pomo/src/features/focus-room-feed/missing-dialogue-recovery.ts`
- [ ] `apps/pomo/src/features/focus-room-feed/sync-controller.ts`
- [ ] `apps/pomo/src/features/focus-room-feed/use-feed-refresh-events.ts`
- [ ] `apps/pomo/src/features/focus-room-feed/use-focus-room-feeds.ts`
- [ ] `apps/pomo/src/features/focus-room-scene-preferences/index.ts`
- [ ] `apps/pomo/src/features/focus-room-scene-preferences/model.ts`
- [ ] `apps/pomo/src/features/fullscreen/index.ts`
- [ ] `apps/pomo/src/features/history-generation/index.ts`
- [ ] `apps/pomo/src/features/history-generation/source-policy.ts`
- [ ] `apps/pomo/src/features/korean-text-postprocessor/logic.ts`
- [ ] `apps/pomo/src/features/language-learning/index.ts`
- [ ] `apps/pomo/src/features/language-learning/prompt.ts`
- [ ] `apps/pomo/src/features/language-learning/rollback.ts`
- [ ] `apps/pomo/src/features/language-learning/schema.ts`
- [ ] `apps/pomo/src/features/language-learning/sentence.ts`
- [ ] `apps/pomo/src/features/language-learning/storage.ts`
- [ ] `apps/pomo/src/features/language-learning/tags.ts`
- [ ] `apps/pomo/src/features/language-learning/use-sentences.ts`
- [ ] `apps/pomo/src/features/language-learning/use-words.ts`
- [ ] `apps/pomo/src/features/language-learning/word-schema.ts`
- [ ] `apps/pomo/src/features/language-learning/word-selection.ts`
- [ ] `apps/pomo/src/features/language-learning/word-storage.ts`
- [ ] `apps/pomo/src/features/model-download/index.ts`
- [ ] `apps/pomo/src/features/model-storage/index.ts`
- [ ] `apps/pomo/src/features/model-storage/resumable-fetch/storage.ts`
- [ ] `apps/pomo/src/features/model-storage/resumable-fetch.ts`
- [ ] `apps/pomo/src/features/model-storage/size.ts`
- [ ] `apps/pomo/src/features/pomodoro-timer/index.ts`
- [ ] `apps/pomo/src/features/screen-saver/index.ts`
- [ ] `apps/pomo/src/features/screen-wake-lock/index.ts`
- [ ] `apps/pomo/src/features/search-discovery/canonical.ts`
- [ ] `apps/pomo/src/features/service-operator/index.ts`
- [ ] `apps/pomo/src/features/service-terms/index.ts`
- [ ] `apps/pomo/src/features/service-terms/policy-paths.ts`
- [ ] `apps/pomo/src/features/speech-to-text/index.ts`
- [ ] `apps/pomo/src/features/speech-to-text/messages.ts`
- [ ] `apps/pomo/src/features/speech-to-text/recognizer.ts`
- [ ] `apps/pomo/src/features/speech-to-text/recorder.ts`
- [ ] `apps/pomo/src/features/speech-to-text/use-speech-to-text.ts`
- [ ] `apps/pomo/src/features/supertonic/error-message.ts`
- [ ] `apps/pomo/src/features/supertonic/index.ts`
- [ ] `apps/pomo/src/features/supertonic/messages.ts`
- [ ] `apps/pomo/src/features/supertonic/opus-messages.ts`
- [ ] `apps/pomo/src/features/supertonic/worker/dispatch.ts`
- [ ] `apps/pomo/src/features/text-generation/answer.ts`
- [ ] `apps/pomo/src/features/text-generation/environment.ts`
- [ ] `apps/pomo/src/features/text-generation/index.ts`
- [ ] `apps/pomo/src/features/text-generation/lazy-client.ts`
- [ ] `apps/pomo/src/features/text-generation/messages.ts`
- [ ] `apps/pomo/src/features/text-generation/qwen-model.ts`
- [ ] `apps/pomo/src/features/text-generation/runtime.ts`
- [ ] `apps/pomo/src/features/text-generation/worker-transport.ts`
- [ ] `apps/pomo/src/features/text-mood/analysis.ts`
- [ ] `apps/pomo/src/features/text-mood/classifier-info.ts`
- [ ] `apps/pomo/src/features/text-mood/index.ts`
- [ ] `apps/pomo/src/features/text-mood/messages.ts`
- [ ] `apps/pomo/src/features/text-mood/model.ts`
- [ ] `apps/pomo/src/features/user-auth/index.ts`
- [ ] `apps/pomo/src/features/user-auth/use-toss-account.ts`
- [ ] `apps/pomo/src/features/user-auth/use-web-account.ts`
- [ ] `apps/pomo/src/features/weather/index.ts`
- [ ] `apps/pomo/src/features/weather/locations.ts`

## components/\*\* (133)

- [ ] `apps/pomo/src/components/AdminDashboard.tsx`
- [ ] `apps/pomo/src/components/AdminLogin.tsx`
- [ ] `apps/pomo/src/components/PDialogueSettings.tsx`
- [ ] `apps/pomo/src/components/PLoadingStatus.tsx`
- [ ] `apps/pomo/src/components/PModalTabList.tsx`
- [ ] `apps/pomo/src/components/PPanel.tsx`
- [ ] `apps/pomo/src/components/PPlayerUtilityButton.tsx`
- [ ] `apps/pomo/src/components/admin-auth/styles.ts`
- [ ] `apps/pomo/src/components/admin-music/AlbumWorkspace.tsx`
- [ ] `apps/pomo/src/components/admin-music/PendingTrackList.tsx`
- [ ] `apps/pomo/src/components/admin-music/button-classes.ts`
- [ ] `apps/pomo/src/components/album-library/Footer.tsx`
- [ ] `apps/pomo/src/components/album-library/LoadingStatus.tsx`
- [ ] `apps/pomo/src/components/album-library/Summary.tsx`
- [ ] `apps/pomo/src/components/album-library/use-album-library.ts`
- [ ] `apps/pomo/src/components/character-studio/Controls.tsx`
- [ ] `apps/pomo/src/components/character-studio/ViewportCanvas.tsx`
- [ ] `apps/pomo/src/components/chat-room/shared.ts`
- [ ] `apps/pomo/src/components/credits-settings/List.tsx`
- [ ] `apps/pomo/src/components/desktop-surface/Frame.tsx`
- [ ] `apps/pomo/src/components/desktop-surface/Player.tsx`
- [ ] `apps/pomo/src/components/desktop-surface/Pomodoro.tsx`
- [ ] `apps/pomo/src/components/desktop-surface/Settings.tsx`
- [ ] `apps/pomo/src/components/dev/CharacterPage.tsx`
- [ ] `apps/pomo/src/components/dev/ChatPage.tsx`
- [ ] `apps/pomo/src/components/dev/DialoguePage.tsx`
- [ ] `apps/pomo/src/components/dev/HomePage.tsx`
- [ ] `apps/pomo/src/components/dev/LayerReviewPage.tsx`
- [ ] `apps/pomo/src/components/dev/SpeechToTextPage.tsx`
- [ ] `apps/pomo/src/components/dev/TermsPage.tsx`
- [ ] `apps/pomo/src/components/dev/TextMoodPage.tsx`
- [ ] `apps/pomo/src/components/dev/VoicePage.tsx`
- [ ] `apps/pomo/src/components/dev/chat/Workspace.tsx`
- [ ] `apps/pomo/src/components/dev/dialogue/Workspace.tsx`
- [ ] `apps/pomo/src/components/dev/home/StorageCard.tsx`
- [ ] `apps/pomo/src/components/dev/home/TextMoodCard.tsx`
- [ ] `apps/pomo/src/components/dev/speech-to-text/Workspace.tsx`
- [ ] `apps/pomo/src/components/dev/text-mood/Workspace.tsx`
- [ ] `apps/pomo/src/components/dialogue-page/EditorContent.tsx`
- [ ] `apps/pomo/src/components/dialogue-player/BlockedBubble.tsx`
- [ ] `apps/pomo/src/components/dialogue-player/shared.ts`
- [ ] `apps/pomo/src/components/dialogue-settings/EventSettingRow.tsx`
- [ ] `apps/pomo/src/components/dialogue-settings/Library.tsx`
- [ ] `apps/pomo/src/components/dialogue-settings/Panel.tsx`
- [ ] `apps/pomo/src/components/dialogue-settings/event-definitions.ts`
- [ ] `apps/pomo/src/components/dialogue-writer/AnswerHeader.tsx`
- [ ] `apps/pomo/src/components/dialogue-writer/AnswerOutput.tsx`
- [ ] `apps/pomo/src/components/feed-settings/Panel.tsx`
- [ ] `apps/pomo/src/components/feed-settings/RecommendedItem.tsx`
- [ ] `apps/pomo/src/components/feed-settings/shared.ts`
- [ ] `apps/pomo/src/components/feed-status/Frame.tsx`
- [ ] `apps/pomo/src/components/feed-status/Surface.tsx`
- [ ] `apps/pomo/src/components/feed-status/shared.ts`
- [ ] `apps/pomo/src/components/korean-text-renderer/RefinementIndicator.tsx`
- [ ] `apps/pomo/src/components/language-learning/EditorContent.tsx`
- [ ] `apps/pomo/src/components/language-learning/EditorView.tsx`
- [ ] `apps/pomo/src/components/language-learning/use-candidate-review.ts`
- [ ] `apps/pomo/src/components/language-learning/use-editor-state.ts`
- [ ] `apps/pomo/src/components/language-learning/use-model-download.ts`
- [ ] `apps/pomo/src/components/language-learning/use-sentence-generation.ts`
- [ ] `apps/pomo/src/components/language-learning/use-voice-generation.ts`
- [ ] `apps/pomo/src/components/layer-review/EyeModePicker.tsx`
- [ ] `apps/pomo/src/components/layer-review/LayerToggle.tsx`
- [ ] `apps/pomo/src/components/layer-review/ScenePicker.tsx`
- [ ] `apps/pomo/src/components/layer-review/Viewport.tsx`
- [ ] `apps/pomo/src/components/layer-review/VisemePicker.tsx`
- [ ] `apps/pomo/src/components/layer-review/shared.ts`
- [ ] `apps/pomo/src/components/memory-assist/TabList.tsx`
- [ ] `apps/pomo/src/components/memory-assist/icon.ts`
- [ ] `apps/pomo/src/components/music-player/Panel.tsx`
- [ ] `apps/pomo/src/components/music-player/model.ts`
- [ ] `apps/pomo/src/components/music-player/use-music-player-controller.ts`
- [ ] `apps/pomo/src/components/music-player-view/ExpandedControls.tsx`
- [ ] `apps/pomo/src/components/music-player-view/ExpandedProgress.tsx`
- [ ] `apps/pomo/src/components/music-player-view/Icon.tsx`
- [ ] `apps/pomo/src/components/music-player-view/PlaybackModes.tsx`
- [ ] `apps/pomo/src/components/music-player-view/SummaryPlayButton.tsx`
- [ ] `apps/pomo/src/components/music-player-view/TrackList.tsx`
- [ ] `apps/pomo/src/components/music-player-view/shared.ts`
- [ ] `apps/pomo/src/components/not-found/Content.tsx`
- [ ] `apps/pomo/src/components/p-select/shared.ts`
- [ ] `apps/pomo/src/components/p-studio/MemoryAssistPanel.tsx`
- [ ] `apps/pomo/src/components/p-studio/Scene.tsx`
- [ ] `apps/pomo/src/components/p-studio/SettingsPanel.tsx`
- [ ] `apps/pomo/src/components/p-studio/shared.ts`
- [ ] `apps/pomo/src/components/pomodoro/QuickControls.tsx`
- [ ] `apps/pomo/src/components/pomodoro/SessionProgress.tsx`
- [ ] `apps/pomo/src/components/pomodoro/TimerRing.tsx`
- [ ] `apps/pomo/src/components/pomodoro/shared.ts`
- [ ] `apps/pomo/src/components/pomodoro-duration-editor/Field.tsx`
- [ ] `apps/pomo/src/components/pomodoro-duration-editor/shared.ts`
- [ ] `apps/pomo/src/components/privacy-policy/ControllerAndDataSections.tsx`
- [ ] `apps/pomo/src/components/privacy-policy/LocalAndRetentionSections.tsx`
- [ ] `apps/pomo/src/components/privacy-policy/PolicyIntro.tsx`
- [ ] `apps/pomo/src/components/privacy-policy/PolicyNavigation.tsx`
- [ ] `apps/pomo/src/components/privacy-policy/RightsAndProtectionSections.tsx`
- [ ] `apps/pomo/src/components/privacy-policy/SharingAndProcessingSections.tsx`
- [ ] `apps/pomo/src/components/privacy-policy/shared.ts`
- [ ] `apps/pomo/src/components/recovery-boundary/Attempt.tsx`
- [ ] `apps/pomo/src/components/refund-policy/LegalPolicySection.tsx`
- [ ] `apps/pomo/src/components/refund-policy/PolicyArticle.tsx`
- [ ] `apps/pomo/src/components/refund-policy/PolicyIntro.tsx`
- [ ] `apps/pomo/src/components/refund-policy/PolicyNavigation.tsx`
- [ ] `apps/pomo/src/components/refund-policy/PurchasePolicySections.tsx`
- [ ] `apps/pomo/src/components/refund-policy/RefundProcessSections.tsx`
- [ ] `apps/pomo/src/components/refund-policy/shared.ts`
- [ ] `apps/pomo/src/components/scribble/CircleFrame.tsx`
- [ ] `apps/pomo/src/components/scribble/Frame.tsx`
- [ ] `apps/pomo/src/components/scribble/Panel.tsx`
- [ ] `apps/pomo/src/components/service-terms/AccountAndAiSections.tsx`
- [ ] `apps/pomo/src/components/service-terms/CoreTermsSections.tsx`
- [ ] `apps/pomo/src/components/service-terms/OperationTermsSections.tsx`
- [ ] `apps/pomo/src/components/service-terms/PlatformTermsSection.tsx`
- [ ] `apps/pomo/src/components/service-terms/PolicyLink.tsx`
- [ ] `apps/pomo/src/components/service-terms/TermsIntro.tsx`
- [ ] `apps/pomo/src/components/service-terms/TermsNavigation.tsx`
- [ ] `apps/pomo/src/components/service-terms/shared.ts`
- [ ] `apps/pomo/src/components/settings/ActionLink.tsx`
- [ ] `apps/pomo/src/components/settings/EmptyState.tsx`
- [ ] `apps/pomo/src/components/speech-to-text-lab/MicrophoneIcon.tsx`
- [ ] `apps/pomo/src/components/speech-to-text-lab/style.ts`
- [ ] `apps/pomo/src/components/text-mood-lab/Evaluation.tsx`
- [ ] `apps/pomo/src/components/text-mood-lab/InsufficientResult.tsx`
- [ ] `apps/pomo/src/components/third-party-notices/EntryCard.tsx`
- [ ] `apps/pomo/src/components/third-party-notices/GroupSection.tsx`
- [ ] `apps/pomo/src/components/third-party-notices/shared.ts`
- [ ] `apps/pomo/src/components/user-auth/styles.ts`
- [ ] `apps/pomo/src/components/voice-generator/AudioChunks.tsx`
- [ ] `apps/pomo/src/components/voice-generator/AudioResults.tsx`
- [ ] `apps/pomo/src/components/voice-generator/Header.tsx`
- [ ] `apps/pomo/src/components/voice-generator/ModelPicker.tsx`
- [ ] `apps/pomo/src/components/voice-test-scripts.ts`
- [ ] `apps/pomo/src/components/weather-status/Surface.tsx`

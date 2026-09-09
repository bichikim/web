# Bug hunt 2026-09-09 — round 2

Second pass on `origin/dev`, deliberately avoiding areas covered in round 1 (#1070–#1076) and previously skipped open issues.

Product code unchanged; findings verified with code-path tracing and short-lived diagnostic tests (not committed).

## Areas covered

| Area | Result |
|------|--------|
| Auth / session / OAuth (Pomo AiT, Coong verify-email) | 2 issues filed |
| Routing / deep links (dialogue editor, Coong preset) | 2 issues filed |
| Admin surfaces (album artwork display) | 1 issue filed |
| Notifications / feed recovery / memory reminders | 2 issues filed |
| Chat streaming (non-voice), voice, calendar ID, display prefs, MIDI player, puppet editor, ETag feeds, desktop rollback | Skipped (prior issues) |

## Skipped (unchanged from round 1)

- #1070–#1076, #1068, #1067, #1061, #1060, #1031, #1029, #977, #920, #917, #884, #810, #763, #975, #51
- Dependabot PRs and existing draft work

## Filed issues

| # | Severity | Title |
|---|----------|-------|
| [#1085](https://github.com/bichikim/web/issues/1085) | P1 | 앱 재시작 시 pending Toss 세션이 PATCH 활성화 없이 삭제됨 |
| [#1086](https://github.com/bichikim/web/issues/1086) | P2 | 이메일 인증 성공 후 같은 URL을 새로고침하면 실패 화면이 표시됨 |
| [#1087](https://github.com/bichikim/web/issues/1087) | P2 | 대화 편집기가 dialogueId 딥링크 변경을 반영하지 않음 |
| [#1088](https://github.com/bichikim/web/issues/1088) | P3 | 관리자 앨범 커버 URL 변경 후에도 실패 fallback이 유지됨 |
| [#1089](https://github.com/bichikim/web/issues/1089) | P2 | Coong preset 딥링크가 저장된 플레이리스트를 영구 덮어씀 |
| [#1090](https://github.com/bichikim/web/issues/1090) | P2 | 피드 복구 다시 시도 실패 시 사용자에게 안내가 없음 |
| [#1091](https://github.com/bichikim/web/issues/1091) | P2 | 메모·캘린더 알림 재생이 건너뛰어지면 사용자에게 알리지 않음 |

## Verification notes

- **#1085**: pending token + GET 401 → `tossSessionQuery()` false, storage cleared, no PATCH.
- **#1086**: verify-email remount after success → second `verifyOtp` → failure UI.
- **#1087**: `dialogueId` signal change → `getDialogue` once, text unchanged.
- **#1088**: image `onError` then new URL → no `<img>` rendered.
- **#1089–#1091**: static code-path review of `(music-layout).tsx`, `PFeedStatus.tsx`, `use-reminders.ts`.

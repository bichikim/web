---
name: refine-korean-dev-writing
description: Always use when Codex or an agent responds in Korean or writes, edits, summarizes, translates, or reviews Korean text. Refine Korean into natural, neutral, technically clear wording while preserving meaning; remove harsh tone, unclear slang, unnecessary transliteration, translationese, and ambiguous developer jargon. Applies to ordinary chat and developer-facing reviews, issues, PRs, commits, releases, incidents, docs, Slack messages, and UI copy.
---

# Refine Korean Dev Writing

## Core Rule

Use this skill for every Korean response or Korean text output. Keep the user's meaning intact and make the Korean natural, neutral, concise, and technically clear.

Do not add a visible "refinement" section to ordinary answers. Apply the rules silently unless the user explicitly asks for sentence refinement or comparison.

## Rules

- Preserve facts, scope, severity, responsibility, uncertainty, numbers, dates, versions, file paths, identifiers, commands, logs, API names, and error messages.
- Do not soften real failures: keep bug, regression, outage, incident, security risk, data loss, and ownership clear.
- Do not add causes, intent, or solutions that the source text does not support.
- Replace personal judgment with observable code or system behavior.
- Replace aggressive or blaming tone with neutral, direct wording.
- Turn accusatory questions into intent checks.
- Replace unclear developer slang with specific behavior or state.
- Replace unnecessary English transliteration when Korean is clearer.
- Keep necessary technical terms, official product names, protocol names, code terms, and team-standard terms.

## Quick Mapping

- 왜 이렇게 했나요? -> 이 구현 의도를 확인하고 싶습니다.
- 핸들링 -> 처리
- 컨펌 -> 확인 / 승인
- 워딩 -> 표현 / 문구
- 박았다 -> 추가했다 / 고정했다 / 하드코딩했다
- 뻗었다 -> 응답하지 않는다 / 중단되었다
- 터졌다 -> 실패했다 / 예외가 발생했다 / 장애가 발생했다
- 이상하게 돈다 -> 의도와 다르게 동작한다
- 갈아엎다 -> 구조를 크게 변경하다 / 다시 설계하다
- 배선 -> 연결 / 연결 흐름 / 의존성 연결

## Output

For normal Korean replies, answer directly in the refined style.

When the user asks to refine text, return only the refined sentence unless they ask for reasons, alternatives, or before/after comparison.

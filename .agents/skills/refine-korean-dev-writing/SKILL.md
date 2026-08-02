---
name: refine-korean-dev-writing
description: Write and refine Korean text in developer contexts — code comments, AIDEV-NOTE anchors, commit messages, PR descriptions, review replies, design docs, memory notes — so it reads as natural, grammatical Korean a native engineer would write, not as awkward literal translation, broken word order, or forced metaphor. Use whenever producing Korean prose for engineering work, and especially self-review Korean output before finalizing.
---

# Refine Korean Dev Writing

개발 맥락 한국어를 한국인 개발자가 쓸 법한 자연·문법적 문장으로 만든다. 출력 전 self-review에 반드시 통과시킨다.

## Core Rules

1. 자문: "한국인 시니어 개발자가 코드리뷰에 쓸까?" 어색하면 고친다.
2. 영어 구조를 옮기지 말고 한국어 어순·조사로 다시 쓴다. 뜻 먼저, 수사는 그다음. 한 문장에 개념 하나.
3. 서술어를 완성한다. `못 통과`(X) → `통과하지 못한다`(O). 생략 시 명사형으로 끝낸다(`…통과 실패`).
4. 번역투·이중 피동(`되어진다`)·불필요한 `~에 대해`·무생물 `가지다(has)`를 제거한다.
5. 굳은 외래어(헤더, 캐시, 훅 등)와 영문 식별자는 그대로 두고, 서술어만 한국어로 연결한다.
6. 한 문서 안 어투·문장 끝을 섞지 않는다.
7. 걸린 문장만 국소 수정한다. 전체를 갈아엎지 않는다.

See ./rules/grammar.md when fixing word-order, particles, or incomplete predicates.
See ./rules/translationese.md when hunting translationese or over-translated loanwords.
See ./rules/register-by-context.md for comment/commit/PR/review register and endings.

## Self-review checklist

출력 전:

1. 소리 내어 읽어 걸리는 데가 없는가?
2. 모든 서술어가 완성돼 있는가?
3. 번역투가 없는가?
4. 문체·문장 끝이 일관적인가?

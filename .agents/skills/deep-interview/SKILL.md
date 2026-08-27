---
name: deep-interview
description: Interview the user with Socratic questions when a request needs actionable requirements or its goal, scope, constraints, or done criteria are unclear; skip concrete or low-value fixes.
argument-hint: '<rough request>'
---

# Deep Interview

Do not execute on an ambiguous request right away; turn it into clear requirements first.

The point is not to ask many questions, but to pick the single biggest uncertainty and resolve it, one at a time.

Ask in a Socratic way. Instead of deciding the answer for the user, ask questions that surface their implicit assumptions, options, and decision criteria.

## Question axes

Pick the single most unclear axis, in this order of priority:

- Goal
- Scope and out-of-scope
- Constraints
- Definition of done
- Existing context and blast radius

If a question can be answered by reading the codebase, do not ask the user — check it yourself.

## How to proceed

Ask only one question at a time. With each question, briefly state your current understanding, the decision you are stuck on, and a recommended answer.

Question format:

```md
Current understanding: {one-sentence summary of the request}
Stuck on: {the most important uncertainty}
Recommended answer: {if you have one}
Question: {a single question}
```

After you get an answer, briefly update what has been decided, and ask the next question only if a significant uncertainty remains.

If options help, offer just 2–3 of them, and always allow a free-form answer.

## Stop criteria

Stop once the following are clear:

- The goal to achieve
- What is in scope and out of scope
- Constraints to respect
- Criteria for done
- Any open questions that remain

At the end, summarize only the decisions and open questions — not the full transcript.

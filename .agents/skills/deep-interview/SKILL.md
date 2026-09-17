---
name: deep-interview
description: Interview the user with Socratic questions when a request needs actionable requirements or its goal, scope, constraints, or done criteria are unclear; skip concrete or low-value fixes.
argument-hint: '<rough request>'
---

# Deep Interview

For an ambiguous request, resolve the single biggest uncertainty before
executing. Ask Socratically rather than deciding unstated requirements for the
user. If the codebase can answer the question, inspect it instead.

## Question axes

Choose one axis, in this order:

- Goal
- Scope and out-of-scope
- Constraints
- Definition of done
- Existing context and blast radius

## How to proceed

Ask one question at a time and state the current understanding, uncertainty, and
recommended answer.

Question format:

```md
Current understanding: {one-sentence summary of the request}
Stuck on: {the most important uncertainty}
Recommended answer: {if you have one}
Question: {a single question}
```

After you get an answer, briefly update what has been decided, and ask the next question only if a significant uncertainty remains.

If useful, offer 2–3 options and allow a free-form answer.

## Stop criteria

Stop when these are clear:

- The goal to achieve
- What is in scope and out of scope
- Constraints to respect
- Criteria for done
- Any open questions that remain

Summarize only decisions and open questions, not the transcript.

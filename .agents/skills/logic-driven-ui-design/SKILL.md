---
name: logic-driven-ui-design
description: Design, implement, refine, or review frontend interfaces for hierarchy, interaction semantics, readability, and accessibility.
---

# Logic-Driven UI Design

## Process

1. Identify the audience, primary action, content priority, and existing design-system constraints.
2. Inspect the current design before changing it. Preserve established tokens unless they cause a usability or accessibility problem.
3. Correct issues in this order:
   - grouping and reading order;
   - consistency and interaction semantics;
   - visual hierarchy;
   - unnecessary styling;
   - colour and contrast;
   - typography.
4. Validate at relevant viewports with realistic content.

For reviews, report findings without modifying files. For implementation requests, change and verify the interface.

## Rules

- Group with proximity and alignment before adding containers. Keep spacing within a group smaller than spacing between groups.
- Make elements with the same behaviour look alike and elements with different behaviour look different. Do not style static content like a control.
- Keep icon and component treatments consistent. Label ambiguous icons.
- Make the reading order and primary action clear under a squint or blur test.
- Remove borders, backgrounds, colours, shadows, and animation that convey no grouping, hierarchy, state, or interaction.
- Use colour for interaction, status, feedback, or deliberate brand emphasis. Never use colour as the only indicator.
- Measure contrast: require `4.5:1` for normal text, `3:1` for qualifying large text, and `3:1` for meaningful non-text UI details.
- Default to one readable sans-serif family with a generous x-height, regular body text, and bold or semibold headings unless the design system specifies otherwise.
- Prefer sentence case, left-align multi-line body text in left-to-right languages, and use body line-height of at least `1.5`.
- Prefer a very dark neutral over pure black on white when it preserves required contrast.

## Review Output

Order findings by user impact: accessibility or interaction ambiguity, hierarchy, consistency, then typography and decoration. For each finding, state the observed issue, user impact, and concrete correction with measurable evidence where possible.

---
name: community-discovery
description: Find and score named online communities for a target audience, with verified direct links and engagement evidence.
license: MIT
compatibility: 'Requires internet access for web search and community directory lookups.'
metadata:
  author: superamped
  version: '1.0'
  website: 'https://superamped.com'
---

# Community Discovery

Find specific online groups where the audience participates. For a comparison of acquisition channel types or budget allocation, use [channel-discovery](../channel-discovery/SKILL.md).

1. Identify the audience’s role, industry, stage, and problem. Use available product context and any minimum group size. Clarify an audience that is too broad to assess.
2. Search Reddit, Slack/Discord, Facebook, LinkedIn, and independent forums. Use the [research and scoring guide](references/research-and-scoring.md) for platform search and score anchors. Aim for at least 100 results in a broad survey, with 50 acceptable for a niche audience, unless the request specifies a narrower scope. If fewer than 20 results surface in a broad survey, try adjacent audience terms and report coverage gaps.
3. Verify each community and its direct URL, deduplicate across sources, and record its platform, audience, activity or moderation evidence, and member count. Mark unverifiable counts as unverified. Include highly relevant small communities and flag a thin high-signal presence when all high-signal groups are under 500 members.
4. Score relevance and noise from 1 to 5. Use Low if relevance is at most 2 or noise is at least 4. Otherwise use High if relevance is at least 4 and noise is at most 2. Use Medium for the remaining cases.
5. Report communities by signal tier with direct links, fit and activity evidence, and member counts. Within a tier, sort by verified membership and put unverified counts last. Summarize platform coverage and practical next steps.

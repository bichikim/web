import {mkdtemp, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'
import {validateSkillContent, validateSkillDirectory} from '../validate-skill-core.js'

const TEMP_PREFIX = 'skill-validator-core-'

const tempDirectories: string[] = []

describe('validateSkillContent', () => {
  it('should accept valid skill frontmatter', () => {
    expect(() =>
      validateSkillContent(`---
name: valid-skill
description: Keep this skill small and useful.
---

# Valid Skill
`),
    ).not.toThrow()
  })

  it('should accept project-specific optional frontmatter keys', () => {
    expect(() =>
      validateSkillContent(`---
name: valid-skill
description: Keep this skill small and useful.
argument-hint: '<skill>'
compatibility:
  codex: true
disable-model-invocation: true
metadata:
  owner: docs
---
`),
    ).not.toThrow()
  })

  it('should reject content without YAML frontmatter', () => {
    expect(() => validateSkillContent('# Skill')).toThrow('No YAML frontmatter found')
  })

  it('should reject incomplete frontmatter', () => {
    expect(() =>
      validateSkillContent(`---
name: valid-skill
description: Keep this skill small and useful.
`),
    ).toThrow('Invalid frontmatter format')
  })

  it('should reject unknown frontmatter keys', () => {
    expect(() =>
      validateSkillContent(`---
name: valid-skill
description: Keep this skill small and useful.
unknown: value
---
`),
    ).toThrow('Unexpected key(s) in SKILL.md frontmatter: unknown.')
  })

  it('should reject missing name', () => {
    expect(() =>
      validateSkillContent(`---
description: Keep this skill small and useful.
---
`),
    ).toThrow("Missing 'name' in frontmatter")
  })

  it('should reject missing description', () => {
    expect(() =>
      validateSkillContent(`---
name: valid-skill
---
`),
    ).toThrow("Missing 'description' in frontmatter")
  })

  it('should reject invalid skill names', () => {
    expect(() =>
      validateSkillContent(`---
name: Invalid Skill
description: Keep this skill small and useful.
---
`),
    ).toThrow("Name 'Invalid Skill' should be hyphen-case")
  })

  it('should reject names with consecutive hyphens', () => {
    expect(() =>
      validateSkillContent(`---
name: invalid--skill
description: Keep this skill small and useful.
---
`),
    ).toThrow("Name 'invalid--skill' cannot start/end with hyphen or contain consecutive hyphens")
  })

  it('should reject long names', () => {
    const longName = 'a'.repeat(65)

    expect(() =>
      validateSkillContent(`---
name: ${longName}
description: Keep this skill small and useful.
---
`),
    ).toThrow('Name is too long (65 characters). Maximum is 64 characters.')
  })

  it('should reject descriptions with angle brackets', () => {
    expect(() =>
      validateSkillContent(`---
name: valid-skill
description: Use <placeholder> text.
---
`),
    ).toThrow('Description cannot contain angle brackets (< or >)')
  })

  it('should reject long descriptions', () => {
    const longDescription = 'a'.repeat(1025)

    expect(() =>
      validateSkillContent(`---
name: valid-skill
description: ${longDescription}
---
`),
    ).toThrow('Description is too long (1025 characters). Maximum is 1024 characters.')
  })

  it('should reject inline YAML collections', () => {
    expect(() =>
      validateSkillContent(`---
name: valid-skill
description: [invalid]
---
`),
    ).toThrow('Inline YAML collections are not supported by this validator')
  })

  it('should reject invalid frontmatter lines', () => {
    expect(() =>
      validateSkillContent(`---
name: valid-skill
description
---
`),
    ).toThrow('Invalid frontmatter line: description')
  })

  it('should parse block descriptions', () => {
    expect(() =>
      validateSkillContent(`---
name: valid-skill
description: >
  Keep this skill small
  and useful.
---
`),
    ).not.toThrow()
  })
})

describe('validateSkillDirectory', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirectories.splice(0).map((directory) => rm(directory, {force: true, recursive: true})),
    )
  })

  it('should read and validate SKILL.md from a skill directory', async () => {
    const directory = await createSkill(`---
name: valid-skill
description: Keep this skill small and useful.
---
`)

    expect(() => validateSkillDirectory(directory)).not.toThrow()
  })

  it('should reject a missing SKILL.md file', async () => {
    const directory = await createTempDirectory()

    expect(() => validateSkillDirectory(directory)).toThrow('SKILL.md not found')
  })
})

async function createSkill(content: string) {
  const directory = await createTempDirectory()

  await writeFile(join(directory, 'SKILL.md'), content)

  return directory
}

async function createTempDirectory() {
  const directory = await mkdtemp(join(tmpdir(), TEMP_PREFIX))

  tempDirectories.push(directory)

  return directory
}

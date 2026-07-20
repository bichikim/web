#!/usr/bin/env node

import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'

const MAX_NAME_LENGTH = 64
const MAX_DESCRIPTION_LENGTH = 1024
const FRONTMATTER_START = '---\n'
const FRONTMATTER_END = '\n---'
const ALLOWED_KEYS = new Set([
  'name',
  'description',
  'license',
  'allowed-tools',
  'metadata',
  'argument-hint',
  'compatibility',
  'disable-model-invocation',
])
const FRONTMATTER_LINE_PATTERN = /^(?<key>[A-Za-z0-9_-]+):(?:\s*(?<value>.*))?$/u
const INDENTED_LINE_PATTERN = /^\s+/u
const FRONTMATTER_CHILD_LINE_PATTERN = /^(?:\s+|$)/u
const TWO_SPACE_INDENT_PATTERN = /^\s{2}/u
const SKILL_NAME_PATTERN = /^[a-z0-9-]+$/u

const [, , skillDirectory] = process.argv

if (!skillDirectory) {
  fail('Usage: node scripts/validate-skill.js <skill_directory>')
}

const skillPath = resolve(skillDirectory)
const skillMdPath = resolve(skillPath, 'SKILL.md')

let content = ''

try {
  content = readFileSync(skillMdPath, 'utf8')
} catch {
  fail('SKILL.md not found')
}

if (!content.startsWith(FRONTMATTER_START)) {
  fail('No YAML frontmatter found')
}

const frontmatterEndIndex = content.indexOf(FRONTMATTER_END, FRONTMATTER_START.length)

if (frontmatterEndIndex === -1) {
  fail('Invalid frontmatter format')
}

const frontmatterText = content.slice(FRONTMATTER_START.length, frontmatterEndIndex)
const frontmatter = parseFrontmatter(frontmatterText)
const unexpectedKeys = Object.keys(frontmatter).filter((key) => !ALLOWED_KEYS.has(key))

if (unexpectedKeys.length > 0) {
  const allowedProperties = [...ALLOWED_KEYS].sort().join(', ')

  fail(
    `Unexpected key(s) in SKILL.md frontmatter: ${unexpectedKeys.join(', ')}. ` +
      `Allowed properties are: ${allowedProperties}`,
  )
}

if (!Object.hasOwn(frontmatter, 'name')) {
  fail("Missing 'name' in frontmatter")
}

if (!Object.hasOwn(frontmatter, 'description')) {
  fail("Missing 'description' in frontmatter")
}

validateName(frontmatter.name)
validateDescription(frontmatter.description)

console.log('Skill is valid!')

function parseFrontmatter(text) {
  const result = {}
  const lines = text.split('\n')

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]

    if (line.trim() !== '' && !line.trimStart().startsWith('#')) {
      const match = FRONTMATTER_LINE_PATTERN.exec(line)

      if (!match?.groups) {
        fail(`Invalid frontmatter line: ${line}`)
      }

      const {key, value = ''} = match.groups
      const rawValue = value

      if (
        rawValue.trim() === '' &&
        index + 1 < lines.length &&
        INDENTED_LINE_PATTERN.test(lines[index + 1])
      ) {
        while (index + 1 < lines.length && FRONTMATTER_CHILD_LINE_PATTERN.test(lines[index + 1])) {
          index += 1
        }

        result[key] = {}
      } else if (rawValue === '|' || rawValue === '>') {
        const blockLines = []

        while (index + 1 < lines.length && FRONTMATTER_CHILD_LINE_PATTERN.test(lines[index + 1])) {
          index += 1
          blockLines.push(lines[index].replace(TWO_SPACE_INDENT_PATTERN, ''))
        }

        result[key] = blockLines.join(rawValue === '>' ? ' ' : '\n').trim()
      } else {
        result[key] = normalizeScalar(rawValue)
      }
    }
  }

  return result
}

function normalizeScalar(value) {
  const trimmedValue = value.trim()

  if (
    (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
    (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))
  ) {
    return trimmedValue.slice(1, -1)
  }

  if (trimmedValue === '') {
    return ''
  }

  if (trimmedValue.startsWith('[') || trimmedValue.startsWith('{')) {
    fail('Inline YAML collections are not supported by this validator')
  }

  return trimmedValue
}

function validateName(value) {
  if (typeof value !== 'string') {
    fail(`Name must be a string, got ${typeof value}`)
  }

  const name = value.trim()

  if (!SKILL_NAME_PATTERN.test(name)) {
    fail(`Name '${name}' should be hyphen-case (lowercase letters, digits, and hyphens only)`)
  }

  if (name.startsWith('-') || name.endsWith('-') || name.includes('--')) {
    fail(`Name '${name}' cannot start/end with hyphen or contain consecutive hyphens`)
  }

  if (name.length > MAX_NAME_LENGTH) {
    fail(`Name is too long (${name.length} characters). Maximum is ${MAX_NAME_LENGTH} characters.`)
  }
}

function validateDescription(value) {
  if (typeof value !== 'string') {
    fail(`Description must be a string, got ${typeof value}`)
  }

  const description = value.trim()

  if (description.includes('<') || description.includes('>')) {
    fail('Description cannot contain angle brackets (< or >)')
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    fail(
      `Description is too long (${description.length} characters). Maximum is ${MAX_DESCRIPTION_LENGTH} characters.`,
    )
  }
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

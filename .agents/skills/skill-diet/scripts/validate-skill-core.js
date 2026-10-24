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

export function validateSkillDirectory(skillDirectory) {
  const skillPath = resolve(skillDirectory)
  const skillMdPath = resolve(skillPath, 'SKILL.md')

  try {
    validateSkillContent(readFileSync(skillMdPath, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error('SKILL.md not found')
    }

    throw error
  }
}

export function validateSkillContent(content) {
  if (!content.startsWith(FRONTMATTER_START)) {
    throw new Error('No YAML frontmatter found')
  }

  const frontmatterEndIndex = content.indexOf(FRONTMATTER_END, FRONTMATTER_START.length)

  if (frontmatterEndIndex === -1) {
    throw new Error('Invalid frontmatter format')
  }

  const frontmatterText = content.slice(FRONTMATTER_START.length, frontmatterEndIndex)
  const frontmatter = parseFrontmatter(frontmatterText)
  const unexpectedKeys = Object.keys(frontmatter).filter((key) => !ALLOWED_KEYS.has(key))

  if (unexpectedKeys.length > 0) {
    const allowedProperties = [...ALLOWED_KEYS].sort().join(', ')

    throw new Error(
      `Unexpected key(s) in SKILL.md frontmatter: ${unexpectedKeys.join(', ')}. ` +
        `Allowed properties are: ${allowedProperties}`,
    )
  }

  if (!Object.hasOwn(frontmatter, 'name')) {
    throw new Error("Missing 'name' in frontmatter")
  }

  if (!Object.hasOwn(frontmatter, 'description')) {
    throw new Error("Missing 'description' in frontmatter")
  }

  validateName(frontmatter.name)
  validateDescription(frontmatter.description)
}

function parseFrontmatter(text) {
  const result = {}
  const lines = text.split('\n')

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]

    if (shouldParseLine(line)) {
      const match = FRONTMATTER_LINE_PATTERN.exec(line)

      if (!match?.groups) {
        throw new Error(`Invalid frontmatter line: ${line}`)
      }

      index = parseFrontmatterLine({index, lines, match, result})
    }
  }

  return result
}

function shouldParseLine(line) {
  return line.trim() !== '' && !line.trimStart().startsWith('#')
}

function parseFrontmatterLine({index, lines, match, result}) {
  const {key, value = ''} = match.groups
  const rawValue = value

  if (
    rawValue.trim() === '' &&
    index + 1 < lines.length &&
    INDENTED_LINE_PATTERN.test(lines[index + 1])
  ) {
    return parseChildLines({index, key, lines, result})
  }

  if (rawValue === '|' || rawValue === '>') {
    return parseBlockValue({index, key, lines, rawValue, result})
  }

  result[key] = normalizeScalar(rawValue)

  return index
}

function parseChildLines({index, key, lines, result}) {
  let nextIndex = index

  while (
    nextIndex + 1 < lines.length &&
    FRONTMATTER_CHILD_LINE_PATTERN.test(lines[nextIndex + 1])
  ) {
    nextIndex += 1
  }

  result[key] = {}

  return nextIndex
}

function parseBlockValue({index, key, lines, result, rawValue}) {
  const blockLines = []
  let nextIndex = index

  while (
    nextIndex + 1 < lines.length &&
    FRONTMATTER_CHILD_LINE_PATTERN.test(lines[nextIndex + 1])
  ) {
    nextIndex += 1
    blockLines.push(lines[nextIndex].replace(TWO_SPACE_INDENT_PATTERN, ''))
  }

  result[key] = blockLines.join(rawValue === '>' ? ' ' : '\n').trim()

  return nextIndex
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
    throw new Error('Inline YAML collections are not supported by this validator')
  }

  return trimmedValue
}

function validateName(value) {
  if (typeof value !== 'string') {
    throw new Error(`Name must be a string, got ${typeof value}`)
  }

  const name = value.trim()

  if (!SKILL_NAME_PATTERN.test(name)) {
    throw new Error(
      `Name '${name}' should be hyphen-case (lowercase letters, digits, and hyphens only)`,
    )
  }

  if (name.startsWith('-') || name.endsWith('-') || name.includes('--')) {
    throw new Error(`Name '${name}' cannot start/end with hyphen or contain consecutive hyphens`)
  }

  if (name.length > MAX_NAME_LENGTH) {
    throw new Error(
      `Name is too long (${name.length} characters). Maximum is ${MAX_NAME_LENGTH} characters.`,
    )
  }
}

function validateDescription(value) {
  if (typeof value !== 'string') {
    throw new Error(`Description must be a string, got ${typeof value}`)
  }

  const description = value.trim()

  if (description.includes('<') || description.includes('>')) {
    throw new Error('Description cannot contain angle brackets (< or >)')
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error(
      `Description is too long (${description.length} characters). Maximum is ${MAX_DESCRIPTION_LENGTH} characters.`,
    )
  }
}

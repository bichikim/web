import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {mkdtemp, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'

const SCRIPT_PATH = join(process.cwd(), '.agents/skills/skill-diet/scripts/validate-skill.js')
const TEMP_PREFIX = 'skill-validator-'
const SUCCESS_EXIT_CODE = 0
const FAILURE_EXIT_CODE = 1

const tempDirectories: string[] = []

interface CommandResult {
  readonly code: number | null
  readonly stderr: string
  readonly stdout: string
}

describe('validate-skill', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirectories.splice(0).map((directory) => rm(directory, {force: true, recursive: true})),
    )
  })

  it('should accept a valid skill frontmatter', async () => {
    const skillDirectory = await createSkill(`---
name: valid-skill
description: Keep this skill small and useful.
---

# Valid Skill
`)

    const result = await runValidator(skillDirectory)

    expect(result).toEqual({
      code: SUCCESS_EXIT_CODE,
      stderr: '',
      stdout: 'Skill is valid!\n',
    })
  })

  it('should print usage when the skill directory is missing', async () => {
    const result = await runValidator()

    expect(result).toEqual({
      code: FAILURE_EXIT_CODE,
      stderr: 'Usage: node scripts/validate-skill.js <skill_directory>\n',
      stdout: '',
    })
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

async function runValidator(skillDirectory?: string): Promise<CommandResult> {
  const args = skillDirectory ? [SCRIPT_PATH, skillDirectory] : [SCRIPT_PATH]
  // AI_NOTE - Avoid stdio tuple overload (ChildProcessByStdio); its EventEmitter methods are missing under some @types/node resolutions.
  const child = spawn(process.execPath, args)
  let stdout = ''
  let stderr = ''

  child.stdin.end()
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')

  child.stdout.on('data', (chunk: string) => {
    stdout += chunk
  })

  child.stderr.on('data', (chunk: string) => {
    stderr += chunk
  })

  const [code] = (await once(child, 'close')) as [number | null]

  return {
    code,
    stderr,
    stdout,
  }
}

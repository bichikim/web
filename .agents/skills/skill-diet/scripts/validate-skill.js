#!/usr/bin/env node

import {validateSkillDirectory} from './validate-skill-core.js'

const [, , skillDirectory] = process.argv

if (!skillDirectory) {
  fail('Usage: node scripts/validate-skill.js <skill_directory>')
}

try {
  validateSkillDirectory(skillDirectory)
  console.log('Skill is valid!')
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

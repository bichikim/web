#!/usr/bin/env node
import {createJiti} from 'jiti'

const jiti = createJiti(import.meta.url)
const {runKnowledgeCli} = await jiti.import('../src/cli/main.ts')
process.exitCode = await runKnowledgeCli(process.argv.slice(2))

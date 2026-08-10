import 'dotenv/config'
import {fileURLToPath} from 'node:url'
import {dirname, join} from 'node:path'
import {mkdir} from 'node:fs/promises'
import {$ as _$} from 'execa'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

const projectId = process.env.SUPABASE_PROJECT_ID
const accessToken = process.env.SUPABASE_ACCESS_TOKEN

const supabaseDir = join(projectRoot, '.supabase')
const outputPath = join(supabaseDir, 'supabase.ts')

// oxlint-disable-next-line id-length
const $ = _$({cwd: projectRoot, stderr: 'inherit', stdout: {file: outputPath}})

try {
  if (projectId && accessToken) {
    await mkdir(supabaseDir, {recursive: true})
    await $`pnpm dlx supabase gen types typescript --project-id ${projectId} --schema public`
    console.info(`✅ Types generated successfully at ${outputPath}`)
  }
} catch (error) {
  // eslint-disable-next-line no-console
  console.error(`❌ Error generating types: ${(error as Error)?.message}`)
  // skip error
  // eslint-disable-next-line n/no-process-exit, unicorn/no-process-exit
  process.exit(0)
}

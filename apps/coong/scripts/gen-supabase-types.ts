import 'dotenv/config'
import {fileURLToPath} from 'url'
import {dirname, join} from 'path'
import {mkdir} from 'fs/promises'
import {$ as _$} from 'execa'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

const projectId = process.env.SUPABASE_PROJECT_ID

if (!projectId) {
  throw new Error('SUPABASE_PROJECT_ID is not set in .env file')
}

const supabaseDir = join(projectRoot, '.supabase')
const outputPath = join(supabaseDir, 'supabase.ts')

const $ = _$({cwd: projectRoot, stderr: 'inherit', stdout: {file: outputPath}})

try {
  await mkdir(supabaseDir, {recursive: true})
  await $`pnpm dlx supabase gen types typescript --project-id ${projectId} --schema public`
  console.log(`✅ Types generated successfully at ${outputPath}`)
} catch (error) {
  throw new Error(`Error generating types: ${(error as Error)?.message}`)
}

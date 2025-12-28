import 'dotenv/config'
import {execSync} from 'child_process'
import {fileURLToPath} from 'url'
import {dirname, join} from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

const projectId = process.env.SUPABASE_PROJECT_ID

if (!projectId) {
  throw new Error('SUPABASE_PROJECT_ID is not set in .env file')
}

const outputPath = join(projectRoot, '.supabase/supabase.ts')

try {
  execSync(`pnpm dlx supabase gen types typescript --project-id ${projectId} --schema public > ${outputPath}`, {
    cwd: projectRoot,
    stdio: 'inherit',
  })
  console.log(`✅ Types generated successfully at ${outputPath}`)
} catch (error) {
  throw new Error(`Error generating types: ${error.message}`)
}

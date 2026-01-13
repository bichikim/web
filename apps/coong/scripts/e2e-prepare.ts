import {$ as _$} from 'execa'
import process from 'node:process'

const $ = _$({stderr: 'inherit', stdio: 'inherit'})

async function main() {
  // start supabase if not running
  await $`pnpm dlx supabase start`
  // reset supabase database
  await $`pnpm dlx supabase db reset`
  // // migrate e2e database
  await $`cross-env DOTENV=.env.e2e drizzle-kit migrate`
  // // start e2e server
  await $`vinxi dev --port 22222 -- --mode e2e`
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

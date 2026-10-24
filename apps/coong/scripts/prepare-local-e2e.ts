import {$ as _$} from 'execa'
import process from 'node:process'

// oxlint-disable-next-line id-length
const $ = _$({stdio: 'inherit'})

async function main() {
  await $`pnpm dlx supabase stop`
  // start supabase if not running
  await $`pnpm dlx supabase start`
  // reset supabase database
  await $`pnpm dlx supabase db reset`
  // // migrate e2e database
  await $`cross-env DOTENV=.env.e2e drizzle-kit migrate`
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

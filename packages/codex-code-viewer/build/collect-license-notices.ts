import {readdir, readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {z} from 'zod'

const manifestSchema = z.object({name: z.string(), version: z.string()})

/** Collects license and notice texts for packages referenced by bundled modules. */
export const collectLicenseNotices = async (
  root: string,
  modules: readonly string[],
  fallbacks: Readonly<Record<string, string>> = {},
) => {
  const directories = modules.flatMap((module) => {
    const path = resolve(root, module)
    const marker = '/node_modules/'
    const offset = path.lastIndexOf(marker)
    if (offset === -1) {
      return []
    }
    const prefix = path.slice(0, offset + marker.length)
    const parts = path.slice(prefix.length).split('/')
    const name = parts.slice(0, parts[0]?.startsWith('@') ? 2 : 1).join('/')
    return [`${prefix}${name}`]
  })
  const notices = await Promise.all(
    [...new Set(directories)].sort().map(async (directory) => {
      const manifest = manifestSchema.parse(
        JSON.parse(await readFile(`${directory}/package.json`, 'utf8')),
      )
      const files = (await readdir(directory))
        .filter((file) => /^(?:licen[cs]e|copying|notice|thirdpartynotice)/iu.test(file))
        .sort()
      const fallback = fallbacks[`${manifest.name}@${manifest.version}`]
      if (files.length === 0 && fallback === undefined) {
        throw new Error(`Missing license text for ${manifest.name}@${manifest.version}`)
      }
      const texts = await Promise.all(
        files.map(async (file) => `${file}\n\n${await readFile(`${directory}/${file}`, 'utf8')}`),
      )
      return `## ${manifest.name}@${manifest.version}\n\n${files.length === 0 ? fallback : texts.join('\n\n')}`
    }),
  )
  return `# Bundled third-party licenses\n\n${notices.join('\n\n')}\n`
}

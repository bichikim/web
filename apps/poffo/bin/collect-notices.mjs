import {access, readFile, writeFile} from 'node:fs/promises'
import {dirname, isAbsolute, join} from 'node:path'

export const collectNotices = async (modules, destination) => {
  const packages = new Map()
  for (const module of modules.filter(isAbsolute)) {
    let directory = dirname(module.split('?')[0])
    let found = false
    while (directory !== dirname(directory) && !found) {
      // Each module belongs to its nearest package; collect one notice per package root.
      // eslint-disable-next-line no-await-in-loop
      found = await access(join(directory, 'package.json')).then(
        () => true,
        () => false,
      )
      if (found) {
        packages.set(directory, true)
      } else {
        directory = dirname(directory)
      }
    }
  }
  const notices = await Promise.all(
    [...packages.keys()].map(async (directory) => {
      const metadata = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))
      const candidates = [
        'LICENSE',
        'LICENSE.md',
        'LICENSE.txt',
        'license',
        'license.txt',
        'COPYING',
        'NOTICE',
      ]
      const texts = await Promise.all(
        candidates.map((name) => readFile(join(directory, name), 'utf8').catch(() => '')),
      )
      const header = `${metadata.name}@${metadata.version} (${metadata.license ?? 'license in source'})`
      return `${header}\n${texts.filter(Boolean).join('\n')}\n`
    }),
  )
  await writeFile(destination, notices.sort().join('\n---\n\n'))
}

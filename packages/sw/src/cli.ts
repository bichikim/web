import {Option, program} from 'commander'
import {getInstallFiles} from './get-install-files'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import fs from 'node:fs'

const assetOption = new Option(
  '-a, --assets <path>',
  'Path to collecting asset directory',
)
const assetsRootOption = new Option('-r, --assets-root <path>', 'Path to assets root')
const cwdOptions = new Option('-c, --cwd <path>', 'Path to project root')
const libraryRoot = path.dirname(fileURLToPath(new URL(import.meta.url)))

interface Options {
  assets: string
  assetsRoot: string
  cwd: string
}

program.name('service worker generator').description('Generate service worker')
program
  .command('build')
  .addOption(assetOption)
  .addOption(assetsRootOption)
  .addOption(cwdOptions)
  .argument('<string>')
  .action(async (arg: string, options: Options) => {
    const {assets, assetsRoot, cwd = process.cwd()} = options
    const swFile = await fs.readFileSync(path.join(libraryRoot, 'index.mjs'), 'utf8')
    const installFiles = await getInstallFiles({cwd, files: assets, root: assetsRoot})
    await fs.promises.writeFile(
      path.join(cwd, arg),
      swFile.replace('__inject__code__', `'${JSON.stringify(installFiles)}'`),
    )
  })
program.parse()

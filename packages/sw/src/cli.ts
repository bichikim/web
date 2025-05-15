import {Option, program} from 'commander'
import {type GenerateSWOptions} from './index'

const assetOption = new Option('-a, --assets <path>', 'Path to collecting asset directory')
const assetsRootOption = new Option('-r, --assets-root <path>', 'Path to assets root')
const cwdOptions = new Option('-c, --cwd <path>', 'Path to project root')

const action = async (arg: string, options: GenerateSWOptions) => {
  const {generateSW} = await import('./index')

  generateSW(arg, options)
}

program.name('service worker generator').description('Generate service worker')

program
  .command('build')
  .addOption(assetOption)
  .addOption(assetsRootOption)
  .addOption(cwdOptions)
  .argument('<string>')
  .action(action)
program.parse()

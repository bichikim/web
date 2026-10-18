export type InstallTarget = 'codex' | 'claude' | 'all'
interface HelpCommand {
  readonly command: 'help'
}
interface InstallCommand {
  readonly command: 'install'
  readonly target: InstallTarget | 'choose'
}
export type InstallerCommand = HelpCommand | InstallCommand

/** Parses installer arguments, retaining the noninteractive Codex default. */
export const parseInstallCommand = (
  args: readonly string[],
  interactive: boolean,
): InstallerCommand => {
  if (
    (args.length === 1 && ['--help', '-h'].includes(args[0]!)) ||
    (args.length === 2 && args[0] === 'install' && args[1] === '--help')
  ) {
    return {command: 'help'}
  }
  if (args.length === 0 || (args.length === 1 && args[0] === 'install')) {
    return {command: 'install', target: interactive ? 'choose' : 'codex'}
  }
  const targetArguments = 3
  if (args.length === targetArguments && args[0] === 'install' && args[1] === '--target') {
    switch (args[2]) {
      case 'codex':
      case 'claude':
      case 'all':
        return {command: 'install', target: args[2]}
    }
  }
  throw new Error('지원하지 않는 명령입니다. install [--target codex|claude|all]을 사용하세요.')
}

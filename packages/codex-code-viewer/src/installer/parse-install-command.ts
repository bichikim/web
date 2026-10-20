export type InstallTarget = 'codex' | 'claude' | 'all'
interface HelpCommand {
  readonly command: 'help'
}
interface InstallCommand {
  readonly command: 'install'
  readonly target: InstallTarget | 'choose'
  /** 지정하면 누락된 Codex CLI의 전역 npm 설치에 동의합니다. 생략하면 자동 설치하지 않습니다. */
  readonly installCodex?: boolean
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
  const installCodex = args.includes('--install-codex')
  if (
    installCodex &&
    args.filter((argument) => argument === '--install-codex').length === 1 &&
    args[0] === 'install'
  ) {
    const command = parseInstallCommand(
      args.filter((argument) => argument !== '--install-codex'),
      interactive,
    )
    if (command.command === 'install') {
      return {...command, installCodex: true}
    }
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
  throw new Error(
    '지원하지 않는 명령입니다. install [--target codex|claude|all] [--install-codex]를 사용하세요.',
  )
}

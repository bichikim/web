import {readFile} from 'node:fs/promises'
import {homedir} from 'node:os'
import {join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {z} from 'zod'
import {parseInstallCommand} from './parse-install-command'
import {chooseInstallTarget} from './choose-install-target'
import {installTargets} from './install-targets'

const onStderr = (output: string) => {
  process.stderr.write(output)
}
try {
  const interactive = process.stdin.isTTY === true && process.stdout.isTTY === true
  const command = parseInstallCommand(process.argv.slice(2), interactive)
  if (command.command === 'help') {
    console.log(
      [
        'Usage: npx @winter-love/codex-code-viewer@latest install [--target codex|claude|all] [--install-codex]',
        'In a terminal, choose Codex, Claude Desktop (Code mode), or both.',
        'Non-interactive execution defaults to Codex. Claude currently supports macOS Apple Silicon.',
        'If Codex CLI is missing, a terminal prompt asks to install it. --install-codex opts in.',
        'CODEX_BINARY / CODEX_HOME: Codex CLI executable and configuration directory',
        'CLAUDE_BINARY / CLAUDE_CONFIG_DIR: Claude CLI executable and configuration directory',
        'CODE_VIEWER_RUNTIME_ARCHIVE: offline Claude runtime ZIP with the matching version and SHA-256',
      ].join('\n'),
    )
  } else {
    const target = command.target === 'choose' ? await chooseInstallTarget() : command.target
    const manifest = z
      .object({version: z.string()})
      .parse(JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')))
    const progress = {
      cleaning: '[4/4] Cleaning up previous versions…',
      installing: '[3/4] Downloading and installing Code Viewer…',
      preparing: '[1/4] Preparing installation…',
      registering: '[2/4] Registering marketplace…',
      restoring: 'Restoring installation settings…',
    }
    console.error(`Starting Code Viewer ${manifest.version} installation.`)
    const results = await installTargets({
      claude: {
        binary: process.env.CLAUDE_BINARY ?? 'claude',
        home: resolve(process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude')),
        onProgress: (stage) => console.error(stage),
        onStderr,
        packageRoot: fileURLToPath(new URL('../', import.meta.url)),
        runtimeArchive: process.env.CODE_VIEWER_RUNTIME_ARCHIVE,
        version: manifest.version,
      },
      codex: {
        codex: process.env.CODEX_BINARY ?? 'codex',
        home: resolve(process.env.CODEX_HOME || join(homedir(), '.codex')),
        onProgress: (stage) => console.error(progress[stage]),
        onStderr,
        version: manifest.version,
      },
      installCodex: command.installCodex,
      interactive,
      target,
    })
    for (const result of results) {
      switch (result.target) {
        case 'codex':
          console.log(
            `Code Viewer ${manifest.version} installed. Quit Codex completely and reopen it.`,
          )
          break
        case 'claude':
          console.log(
            [
              `Claude Code Viewer ${manifest.version} installed. MCP is registered with the plugin.`,
              'For attachments and Browser expansion, allow the app below in macOS settings:',
              'System Settings → Privacy & Security → Accessibility',
              result.application,
              'If permission errors persist, remove the Code Viewer Attachment entry and add the app above again.',
              'Start a local Code session in Claude Desktop. Use the Code Viewer button or a file link in a response.',
              'If the button is missing, update Desktop (Claude Code 2.1.286+). Existing sessions were not reloaded.',
            ].join('\n'),
          )
          break
      }
    }
  }
} catch (error) {
  console.error(
    `Code Viewer installation failed: ${error instanceof Error ? error.message : String(error)}`,
  )
  process.exitCode = 1
}

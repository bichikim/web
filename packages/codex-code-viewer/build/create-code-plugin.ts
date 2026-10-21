import {writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {strToU8, zipSync} from 'fflate'
import {createCodeHooks} from './create-code-hooks'
import template from '../claude/code/plugin.json' with {type: 'json'}
import {collectRuntime, readArchiveDirectory, readArchiveEntry} from './collect-runtime'

interface CodePluginOptions {
  readonly output: string
  readonly version: string
  readonly platform: string
  readonly architecture: string
  readonly hooksDirectory: string
  readonly nodeExecutable: string
  readonly nodeLicense: string
  readonly composerApplication?: string
}

/** Packages a project-scoped Claude Code plugin with its Node runtime and open command. */
export const createCodePlugin = async (options: CodePluginOptions): Promise<string> => {
  const binary = options.platform === 'win32' ? 'node.exe' : 'node'
  const manifest = {
    ...template,
    mcpServers: {
      viewer: {
        ...template.mcpServers.viewer,
        command: `\${CLAUDE_PLUGIN_ROOT}/runtime/${binary}`,
        env: {
          ...template.mcpServers.viewer.env,
          CODE_VIEWER_CLIPBOARD: options.platform === 'darwin' ? 'true' : 'false',
        },
      },
    },
    version: options.version,
  }
  const archive = zipSync({
    '.claude-plugin': {'plugin.json': strToU8(JSON.stringify(manifest, null, 2))},
    dist: await collectRuntime({
      ...options,
      entrypoints: ['browser.js', 'browser.html', 'reveal.js'],
    }),
    hooks: await createCodeHooks(options.hooksDirectory),
    'package.json': strToU8(
      JSON.stringify({
        name: template.name,
        private: true,
        type: 'module',
        version: options.version,
      }),
    ),
    runtime: {
      ...(options.composerApplication === undefined
        ? {}
        : {'Code Viewer Attachment.app': await readArchiveDirectory(options.composerApplication)}),
      [binary]: await readArchiveEntry(options.nodeExecutable),
      LICENSE: await readArchiveEntry(options.nodeLicense),
    },
  })
  const path = join(
    options.output,
    `code-viewer-${options.version}-claude-code-${options.platform}-${options.architecture}.zip`,
  )
  await writeFile(path, archive)
  return path
}

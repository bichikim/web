import {icons as tablerIcons} from '@iconify-json/tabler'
import {build} from 'esbuild'
import {readFile} from 'node:fs/promises'
import {basename, join} from 'node:path'
import {createGenerator} from 'unocss'
import viewerConfig from '../uno.config'
import {selectRootStyles} from './select-root-styles'

/** Bundles shared headless operations inside the plugin's permitted module boundary. */
export const createCodeHooks = async (directory: string): Promise<Record<string, Uint8Array>> => {
  const generator = await createGenerator({...viewerConfig, safelist: []})
  const {css: preflights} = await generator.generate('', {safelist: false})
  const {css: rules} = await generator.generate(
    [
      'font-mono font-sans fill-hover fill-accent fill-none fill-divider stroke-muted',
      'stroke-divider fill-action fill-action-text fill-tree-background stroke-accent opacity-30',
      'fill-foreground fill-muted fill-selection fill-code-selection fill-canvas',
      'fill-keyword fill-string fill-number fill-comment [font-size:13px]',
    ].join(' '),
    {preflights: false, safelist: false},
  )
  const css = selectRootStyles({preflights, rules})
  const {css: treeRules} = await generator.generate(
    'font-sans fill-hover fill-foreground fill-accent fill-string fill-muted fill-none stroke-muted [font-size:13px]',
    {preflights: false, safelist: false},
  )
  const treeStyles = selectRootStyles({preflights, rules: treeRules})
  const {css: hoverRules} = await generator.generate('fill-hover', {
    preflights: false,
    safelist: false,
  })
  const hoverStyles = selectRootStyles({preflights, rules: hoverRules})
  const result = await build({
    bundle: true,
    entryPoints: ['register.js', 'register-pane.js'].map((name) => join(directory, name)),
    format: 'esm',
    outdir: 'hooks',
    platform: 'neutral',
    plugins: [
      {
        name: 'viewer-graphics-styles',
        setup(bundle) {
          bundle.onResolve(
            // eslint-disable-next-line eslint-js/require-unicode-regexp -- esbuild uses Go regexp syntax.
            {filter: /^viewer-(?:graphics-styles|tree-styles|tree-icons|hover-styles)$/},
            ({path}) => ({
              namespace: 'viewer-graphics',
              path,
            }),
          )
          // eslint-disable-next-line eslint-js/require-unicode-regexp -- esbuild uses Go regexp syntax.
          bundle.onLoad({filter: /.*/, namespace: 'viewer-graphics'}, ({path}) => {
            const value =
              path === 'viewer-graphics-styles'
                ? css
                : path === 'viewer-tree-styles'
                  ? treeStyles
                  : path === 'viewer-hover-styles'
                    ? hoverStyles
                    : Object.fromEntries(
                        [
                          'file',
                          'chevron-down',
                          'chevron-right',
                          'folder',
                          'file-plus',
                          'folder-plus',
                          'refresh',
                          'reload',
                          'pencil',
                          'check',
                          'dots',
                          'plus',
                          'minus',
                          'target',
                          'settings',
                          'search',
                          'arrow-left',
                          'arrow-right',
                        ].map((name) => [
                          name,
                          tablerIcons.icons[name].body
                            .replaceAll('stroke-width="2"', 'stroke-width="1.6"')
                            .replaceAll('stroke="currentColor"', ''),
                        ]),
                      )
            return {contents: `export default ${JSON.stringify(value)}`, loader: 'js'}
          })
        },
      },
    ],
    target: 'es2022',
    write: false,
  })
  const clients = await build({
    bundle: true,
    entryPoints: [
      'tree-client.js',
      'editor-client.js',
      'splitter-client.js',
      'file-row-client.js',
      'sidebar-resize-client.js',
      'source-input-client.js',
      'popover-client.js',
      'control-client.js',
      'horizontal-client.js',
      'image-client.js',
    ].map((name) => join(directory, name)),
    format: 'esm',
    outdir: 'hooks',
    platform: 'neutral',
    target: 'es2022',
    write: false,
  })
  return {
    ...Object.fromEntries(clients.outputFiles.map((file) => [basename(file.path), file.contents])),
    'hooks.json': await readFile(join(directory, 'hooks.json')),
    ...Object.fromEntries(result.outputFiles.map((file) => [basename(file.path), file.contents])),
  }
}

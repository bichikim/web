import {createLspService} from './create-lsp-service'
import {rubyReferenceHandler} from './ruby/reference-handler'
import {createPreload} from './ruby/create-preload'

export const createRubyService = (directory: string): ReturnType<typeof createLspService> => {
  const executable = process.env.SOLARGRAPH_BINARY
  const preload = executable ? createPreload() : undefined
  try {
    const service = createLspService({
      arguments: executable
        ? ['stdio']
        : [
            '-r',
            'rubygems',
            '-e',
            `${rubyReferenceHandler}\nload Gem.bin_path('solargraph', 'solargraph')`,
            '--',
            'stdio',
          ],
      command: executable || process.env.RUBY_BINARY || 'ruby',
      directory,
      ...(preload === undefined ? {} : {environment: preload.environment, onStop: preload.dispose}),
      failed: 'ruby-analysis-failed',
      initialization: {
        completion: false,
        definitions: true,
        diagnostics: false,
        formatting: false,
        hover: false,
        symbols: false,
      },
      language: 'ruby',
      positionEncoding: 'utf-32',
      processGroup: true,
      unavailable: 'ruby-analyzer-unavailable',
    })
    return {
      ...service,
      dispose: () => {
        service.dispose()
        preload?.dispose()
      },
    }
  } catch (cause) {
    preload?.dispose()
    throw cause
  }
}

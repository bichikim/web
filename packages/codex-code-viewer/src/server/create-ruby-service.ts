import {createLspService} from './create-lsp-service'

export const createRubyService = (directory: string): ReturnType<typeof createLspService> => {
  const executable = process.env.SOLARGRAPH_BINARY
  return createLspService({
    arguments: executable
      ? ['stdio']
      : ['-r', 'rubygems', '-e', "load Gem.bin_path('solargraph', 'solargraph')", '--', 'stdio'],
    command: executable || process.env.RUBY_BINARY || 'ruby',
    directory,
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
}

import {mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {delimiter, join} from 'node:path'
import {rubyReferenceHandler} from './reference-handler'

const loader = String.raw`
module CodeViewerSolargraphLoader
  def require(feature)
    result = super
    CodeViewerSolargraphLoader.install
    result
  end

  def self.install
    return if @checking || @released || @installed
    @checking = true
    begin
      return unless defined?(Solargraph::LanguageServer::Message::TextDocument::References)
      @installed = true
      load File.expand_path('reference-handler.rb', __dir__)
      release
    ensure
      @checking = false
    end
  end

  def self.release
    return if @released
    @released = true
    options = ENV.fetch('RUBYOPT', '').split
    ENV['RUBYOPT'] = options.reject { |value| value == '-rcode-viewer-solargraph-loader' }.join(' ')
    paths = ENV.fetch('RUBYLIB', '').split(File::PATH_SEPARATOR)
    ENV['RUBYLIB'] = paths.reject { |value| value == __dir__ }.join(File::PATH_SEPARATOR)
    require 'fileutils'
    FileUtils.rm_rf(__dir__)
  end
end
Kernel.prepend(CodeViewerSolargraphLoader)
at_exit { CodeViewerSolargraphLoader.release }
CodeViewerSolargraphLoader.install
`
/** Preloads the reference extension when the configured executable loads its own Solargraph gem. */
export const createPreload = () => {
  const directory = mkdtempSync(join(tmpdir(), 'code-viewer-ruby-'))
  const dispose = () => rmSync(directory, {force: true, recursive: true})
  try {
    writeFileSync(join(directory, 'code-viewer-solargraph-loader.rb'), loader, {mode: 0o600})
    writeFileSync(join(directory, 'reference-handler.rb'), rubyReferenceHandler, {mode: 0o600})
    return {
      dispose,
      environment: {
        ...process.env,
        RUBYLIB: [directory, process.env.RUBYLIB]
          .filter((value) => value !== undefined && value !== '')
          .join(delimiter),
        RUBYOPT: [process.env.RUBYOPT, '-rcode-viewer-solargraph-loader']
          .filter((value) => value !== undefined && value !== '')
          .join(' '),
      },
    }
  } catch (cause) {
    dispose()
    throw cause
  }
}

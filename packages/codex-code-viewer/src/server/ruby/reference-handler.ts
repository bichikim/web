import {rubyConstantReferences} from './constant-references'
import {rubyReferenceCandidates} from './reference-candidates'
/** Adds file-wise semantic references and alias expansion to the workspace's Solargraph server. */
export const rubyReferenceHandler = String.raw`
require 'solargraph'
require 'set'

${rubyConstantReferences}
${rubyReferenceCandidates}

module CodeViewerReferences
  def process
    uri = params['textDocument']['uri']
    position = params['position']
    pins = host.definitions_at(uri, position['line'], position['character'])
    library = host.library_for(uri)
    api = library.send(:api_map)
    point = Solargraph::Position.new(position['line'], position['character'])
    pins = declaration_pins(library, api, uri, point) if pins.empty?
    return super if pins.empty? || pins.any? { |pin| pin.path.nil? || pin.path.empty? }
    constants = CodeViewerConstantReferences.new(library, api.pins)
    selected = Solargraph::Location.new(uri_to_file(uri), Solargraph::Range.new(point, point))
    known = Set.new(constants.targets(pins, selected))
    aliases = api.pins.grep(Solargraph::Pin::MethodAlias)
    loop do
      count = known.length
      aliases.each do |pin|
        next if known.include?(pin.path)
        next unless known.any? { |path| path.end_with?("##{pin.original}", ".#{pin.original}") }
        originals = api.get_method_stack(pin.namespace, pin.original, scope: pin.scope)
        known.add(pin.path) if originals.any? { |original| known.include?(original.path) }
      end
      break if known.length == count
    end
    alias_names = aliases.select { |pin| known.include?(pin.path) }.map(&:name)
    names = (pins.map(&:name) + alias_names + constants.names(known)).uniq
    locations = []
    unless known.include?('Class#new')
      sources = (library.workspace.sources + [library.current].compact).uniq(&:filename)
      sources.each do |source|
        break if host.cancel?(id)
        found = CodeViewerReferenceCandidates.locations(source, names).select do |location|
          ending = location.range.ending
          definitions = constants.definitions_at(location.filename, ending)
          constants.targets(definitions, location).any? { |target| known.include?(target) }
        end
        locations.concat(found)
        publish_references(found)
      end
    end
    return if host.cancel?(id)
    native = if native_required?(pins, known)
      host.references_from(uri, position['line'], position['character']).select do |location|
        ending = location.range.ending
        definitions = constants.definitions_at(location.filename, ending)
        constants.targets(definitions, location).any? { |target| known.include?(target) }
      end
    else
      []
    end
    locations.concat(native)
    set_result locations.uniq.map { |location| reference_location(location) }
  end

  private

  def native_required?(pins, known)
    return true if known.include?('Class#new')
    pins.any? do |pin|
      pin.name == 'new' || ![Solargraph::Pin::Namespace, Solargraph::Pin::Constant,
        Solargraph::Pin::Method, Solargraph::Pin::MethodAlias].any? { |type| pin.is_a?(type) }
    end
  end

  def declaration_pins(library, api, uri, point)
    filename = uri_to_file(uri)
    current = library.current
    source = current&.filename == filename ? current :
      library.workspace.sources.find { |item| item.filename == filename }
    return [] if source.nil?
    node = source.node_at(point.line, point.character)
    return [] unless [:def, :defs].include?(node&.type) && node.loc.respond_to?(:name)
    range = Solargraph::Range.from_expr(node.loc.name)
    return [] unless range.contain?(point)
    name = node.children[node.type == :def ? 0 : 1].to_s
    api.pins.grep(Solargraph::Pin::Method).select do |pin|
      pin.name == name && pin.location&.filename == filename && pin.location.range.contain?(point)
    end
  end

  def reference_location(location)
    {uri: file_to_uri(location.filename), range: location.range.to_hash}
  end

  def publish_references(locations)
    token = params['partialResultToken']
    return if token.nil? || locations.empty? || host.cancel?(id)
    value = locations.map { |location| reference_location(location) }
    host.send_notification('$/progress', {token: token, value: value})
  end
end

Solargraph::LanguageServer::Message::TextDocument::References.prepend(CodeViewerReferences)
`

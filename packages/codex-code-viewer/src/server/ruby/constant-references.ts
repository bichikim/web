import {rubyConstantFlow} from './constant-flow'
import {rubyStaticValues} from './static-values'

/** Resolves static constant assignments, conditional branches and resolvable require order without executing project code. */
export const rubyConstantReferences = String.raw`
${rubyStaticValues}
${rubyConstantFlow}

class CodeViewerConstantReferences
  include CodeViewerStaticValues
  include CodeViewerConstantFlow
  Event = Struct.new(:pin, :node, :range)

  def initialize(library, pins)
    @library = library
    @events = pins.grep(Solargraph::Pin::Constant).flat_map do |pin|
      pin.assignments.filter_map do |node|
        range = Solargraph::Range.from_node(node)
        Event.new(pin, node, range) unless range.nil?
      end
    end
    @paths = Set.new(@events.map { |event| event.pin.path })
    sources = (library.workspace.sources + [library.current].compact).uniq(&:filename)
    @sources = sources.to_h { |source| [source.filename, source] }
    @files = @events.group_by { |event| event.pin.location.filename }
    @nodes = @events.to_h do |event|
      [ [event.pin.location.filename, *coordinates(event.pin.location.range.start)], event ]
    end
    @states = {}
    @definitions = {}
  end

  def definitions_at(filename, position)
    key = [filename, *coordinates(position)]
    @definitions[key] ||= @library.definitions_at(filename, position.line, position.character)
  end

  def targets(pins, location)
    methods = method_targets(location)
    return methods unless methods.nil?
    state = state_at(location) if pins.any? { |pin| @paths.include?(pin.path) }
    pins.flat_map { |pin| @paths.include?(pin.path) ? (state[pin.path] || []) : [pin.path] }.compact.uniq
  end

  def names(known)
    return [] if known.all? { |path| path.match?(/[.#]/) }
    aliases = @events.each_with_object(Hash.new { |hash, key| hash[key] = [] }) do |event, graph|
      candidate_paths(event.node, event.pin.location.filename).each { |path| graph[path] << event.pin.path }
    end
    paths = known.dup
    frontier = paths.to_a
    until frontier.empty?
      frontier = frontier.flat_map { |path| aliases.fetch(path, []) }.uniq.reject { |path| paths.include?(path) }
      paths.merge(frontier)
    end
    @events.select { |event| paths.include?(event.pin.path) }.map { |event| event.pin.name }.uniq
  end

  def candidate_paths(node, filename)
    return [] unless node.respond_to?(:type)
    case node.type
    when :const, :CONST, :COLON2, :COLON3 then paths_for(node, filename)
    when :if then node.children.drop(1).flat_map { |branch| candidate_paths(branch, filename) }
    when :begin, :kwbegin then candidate_paths(node.children.last, filename)
    else []
    end
  end

  private

  def method_targets(location)
    source = @sources[location.filename]
    return nil if source.nil?
    node = source.node_at(location.range.start.line, location.range.start.character)
    return nil unless node&.type == :send && node.loc.selector
    receiver, name = node.children
    selector = Solargraph::Range.from_expr(node.loc.selector)
    setter = name.to_s.end_with?('=') && node.loc.operator && selector.start == location.range.start &&
      Solargraph::Range.from_expr(node.loc.operator).ending == location.range.ending
    return nil unless selector == location.range || setter
    constructed = receiver&.type == :send && receiver.children[1] == :new
    constant = constructed ? receiver.children.first : receiver
    return nil unless constant&.type == :const
    range = Solargraph::Range.from_node(constant)
    ending = range.ending
    definitions = definitions_at(location.filename, ending)
    namespaces = targets(definitions, Solargraph::Location.new(location.filename, range))
    api = @library.send(:api_map)
    if constructed && namespaces.any? do |namespace|
      api.get_method_stack(namespace, 'new', scope: :class).any? do |pin|
        !['Class#new', 'BasicObject.new'].include?(pin.path)
      end
    end
      return nil
    end
    scope = constructed ? :instance : :class
    namespaces.flat_map { |namespace| api.get_method_stack(namespace, name.to_s, scope: scope).map(&:path) }.uniq
  end

  def coordinates(position)
    [position.line, position.character]
  end

  def before?(left, right)
    (coordinates(left) <=> coordinates(right)) == -1
  end

  def state_at(location)
    binding = (@files[location.filename] || []).find do |event|
      range = event.pin.location.range
      !before?(location.range.start, range.start) &&
        !before?(range.ending, location.range.ending) &&
        !before?(event.range.start, location.range.ending)
    end
    limit = binding.nil? ? location.range.start : binding.range.ending
    key = [location.filename, *coordinates(limit)]
    @states[key] ||= begin
      flow = Flow.new({}, {}, {}, Set.new([location.filename]))
      walk(@sources[location.filename]&.node, location.filename, flow, limit).constants
    end
  end

  def assignment_targets(event, flow)
    node_targets(event.node, event.pin.location.filename, flow)
  end

  def node_targets(node, filename, flow)
    return [] unless node.respond_to?(:type)
    if node.type == :if
      condition, positive, negative = node.children
      return truth(condition, filename, flow).flat_map do |choice|
        node_targets(choice ? positive : negative, filename, flow)
      end.uniq
    end
    return node_targets(node.children.last, filename, flow) if [:begin, :kwbegin].include?(node.type)
    return [] unless [:const, :CONST, :COLON2, :COLON3].include?(node.type)
    paths_for(node, filename).flat_map { |path| @paths.include?(path) ? flow.constants.fetch(path, []) : [path] }.uniq
  end
end
`

/** Computes literal Ruby values and branch possibilities without evaluating project code. */
export const rubyStaticValues = String.raw`
module CodeViewerStaticValues
  UNKNOWN = Object.new.freeze

  def values(node, filename, flow)
    return [nil] if node.nil?
    return [UNKNOWN] unless node.respond_to?(:type)
    case node.type
    when :str, :int, :float, :sym
      [node.children.first]
    when :true then [true]
    when :false then [false]
    when :nil then [nil]
    when :lvar then flow.locals.fetch(node.children.first, [UNKNOWN])
    when :lvasgn then values(node.children.last, filename, flow)
    when :const
      paths_for(node, filename).flat_map { |path| flow.strings.fetch(path, [UNKNOWN]) }.uniq.then do |found|
        found.empty? ? [UNKNOWN] : found
      end
    when :begin, :kwbegin
      values(node.children.last, filename, flow)
    when :if
      condition, positive, negative = node.children
      truth(condition, filename, flow).flat_map { |choice| values(choice ? positive : negative, filename, flow) }.uniq
    when :and, :or
      left, right = node.children
      values(left, filename, flow).flat_map do |value|
        choices = value.equal?(UNKNOWN) ? [true, false] : [value != false && !value.nil?]
        choices.flat_map { |choice| choice == (node.type == :and) ? values(right, filename, flow) : [value] }
      end.uniq
    when :dstr
      combinations(node.children.map { |child| values(child, filename, flow) }).map do |parts|
        parts.include?(UNKNOWN) ? UNKNOWN : parts.map(&:to_s).join
      end.uniq
    when :send
      send_values(node, filename, flow)
    else
      [UNKNOWN]
    end
  end

  def combinations(groups)
    groups.reduce([[]]) { |result, group| result.product(group).map { |prefix, value| [*prefix, value] } }
  end

  def truth(node, filename, flow)
    values(node, filename, flow).flat_map do |value|
      value.equal?(UNKNOWN) ? [true, false] : [value != false && !value.nil?]
    end.uniq
  end

  def send_values(node, filename, flow)
    receiver, method, *arguments = node.children
    return [File.dirname(filename)] if receiver.nil? && method == :__dir__ && arguments.empty?
    if [:freeze, :to_s].include?(method) && arguments.empty?
      return values(receiver, filename, flow).map do |value|
        value.equal?(UNKNOWN) ? UNKNOWN : (method == :freeze ? value : value.to_s)
      end.uniq
    end
    if method == :! && arguments.empty?
      return truth(receiver, filename, flow).map { |value| !value }
    end
    if [:==, :!=].include?(method) && arguments.length == 1
      return values(receiver, filename, flow).product(values(arguments.first, filename, flow)).map do |left, right|
        left.equal?(UNKNOWN) || right.equal?(UNKNOWN) ? UNKNOWN : (method == :== ? left == right : left != right)
      end.uniq
    end
    if method == :+ && arguments.length == 1
      return values(receiver, filename, flow).product(values(arguments.first, filename, flow)).map do |left, right|
        left.is_a?(String) && right.is_a?(String) ? left + right : UNKNOWN
      end.uniq
    end
    file = receiver&.type == :const && paths_for(receiver, filename) == ['File']
    return [UNKNOWN] unless file && [:join, :expand_path, :dirname].include?(method)
    groups = arguments.map { |argument| values(argument, filename, flow) }
    combinations(groups).map do |parts|
      if parts.all? { |part| part.is_a?(String) } && !parts.empty?
        case method
        when :join then File.join(*parts)
        when :dirname then parts.length == 1 ? File.dirname(parts.first) : UNKNOWN
        when :expand_path
          parts.length == 2 || (parts.length == 1 && parts.first.start_with?('/')) ? File.expand_path(*parts) : UNKNOWN
        end
      else
        UNKNOWN
      end
    end.uniq
  end

  def paths_for(node, filename)
    range = Solargraph::Range.from_node(node)
    return [] if range.nil?
    ending = range.ending
    definitions_at(filename, ending).map(&:path).compact.uniq
  end
end
`

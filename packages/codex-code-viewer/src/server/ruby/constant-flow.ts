/** Tracks possible alias states through branches and statically resolvable workspace requires. */
export const rubyConstantFlow = String.raw`
module CodeViewerConstantFlow
  Flow = Struct.new(:constants, :locals, :strings, :loaded, :branches)

  def copy_flow(flow)
    Flow.new(flow.constants.dup, flow.locals.dup, flow.strings.dup, flow.loaded.dup,
      flow.branches&.map { |branch| copy_flow(branch) })
  end

  def merge_flows(flows)
    groups = flows.flat_map { |flow| flow.branches || [flow] }.group_by(&:loaded).values
    branches = groups.map { |group| combine_flows(group) }
    return branches.first if branches.length == 1
    combined = combine_flows(branches)
    combined.branches = branches
    combined
  end

  def combine_flows(flows)
    return flows.first if flows.length == 1
    merge = lambda do |field, missing|
      maps = flows.map { |flow| flow.public_send(field) }
      maps.flat_map(&:keys).uniq.to_h do |key|
        [key, maps.flat_map { |map| map.fetch(key, missing) }.uniq]
      end
    end
    Flow.new(merge.call(:constants, []), merge.call(:locals, [CodeViewerStaticValues::UNKNOWN]),
      merge.call(:strings, [CodeViewerStaticValues::UNKNOWN]), flows.map(&:loaded).reduce(&:intersection))
  end

  def contains?(node, limit)
    return false if limit.nil? || !node.respond_to?(:type)
    range = Solargraph::Range.from_node(node)
    range && !before?(limit, range.start) && !before?(range.ending, limit)
  end

  def walk(node, filename, flow, limit = nil)
    return flow unless node.respond_to?(:type)
    range = Solargraph::Range.from_node(node)
    return flow if limit && range && !before?(range.start, limit)
    if flow.branches
      return merge_flows(flow.branches.map { |branch| walk(node, filename, copy_flow(branch), limit) })
    end
    case node.type
    when :def, :defs
      flow
    when :if
      condition, positive, negative = node.children
      flow = walk(condition, filename, flow, limit)
      inside = [positive, negative].find { |branch| contains?(branch, limit) }
      return walk(inside, filename, flow, limit) if inside
      merge_flows(truth(condition, filename, flow).map do |choice|
        walk(choice ? positive : negative, filename, copy_flow(flow), limit)
      end)
    when :while, :until
      condition, body = node.children
      flow = walk(condition, filename, flow, limit)
      return walk(body, filename, flow, limit) if contains?(body, limit)
      merge_flows(truth(condition, filename, flow).map do |choice|
        choice == (node.type == :while) ? walk(body, filename, copy_flow(flow), limit) : copy_flow(flow)
      end)
    when :case
      walk_case(node, filename, flow, limit)
    when :and, :or
      left, right = node.children
      flow = walk(left, filename, flow, limit)
      return walk(right, filename, flow, limit) if contains?(right, limit)
      merge_flows(truth(left, filename, flow).map do |choice|
        choice == (node.type == :and) ? walk(right, filename, copy_flow(flow), limit) : copy_flow(flow)
      end)
    when :class, :module, :sclass
      locals = flow.locals
      flow.locals = {}
      flow = walk_children(node, filename, flow, limit)
      restore_locals(flow, locals)
      flow
    when :casgn
      event = @nodes[[filename, *coordinates(range.start)]]
      return walk_children(node, filename, flow, limit) if event.nil?
      flow = walk(event.node, filename, flow, limit)
      targets = assignment_targets(event, flow)
      flow.constants[event.pin.path] = targets
      flow.strings[event.pin.path] = values(event.node, filename, flow)
      flow
    when :lvasgn
      name, value = node.children
      flow = walk(value, filename, flow, limit)
      flow.locals[name] = values(value, filename, flow)
      flow
    when :send
      receiver, method, argument = node.children
      if receiver.nil? && [:require, :require_relative].include?(method)
        load_paths(values(argument, filename, flow), method, filename, flow)
      else
        walk_children(node, filename, flow, limit)
      end
    else
      walk_children(node, filename, flow, limit)
    end
  end

  def walk_children(node, filename, flow, limit)
    node.children.reduce(flow) { |current, child| walk(child, filename, current, limit) }
  end

  def walk_case(node, filename, flow, limit)
    subject, *clauses = node.children
    flow = walk(subject, filename, flow, limit)
    alternatives = []
    possible = true
    clauses.each do |clause|
      if clause&.type == :when
        *patterns, body = clause.children
        return walk(body, filename, flow, limit) if contains?(body, limit)
        matches = if subject.nil?
          combinations(patterns.map { |pattern| truth(pattern, filename, flow) }).map(&:any?).uniq
        else
          values(subject, filename, flow).flat_map do |left|
            comparisons = patterns.map do |pattern|
              values(pattern, filename, flow).flat_map do |right|
                unknown = [left, right].any? { |value| value.equal?(CodeViewerStaticValues::UNKNOWN) }
                unknown ? [true, false] : [left == right]
              end.uniq
            end
            combinations(comparisons).map(&:any?)
          end.uniq
        end
        alternatives << walk(body, filename, copy_flow(flow), limit) if possible && matches.include?(true)
        possible &&= matches.include?(false)
      else
        return walk(clause, filename, flow, limit) if contains?(clause, limit)
        alternatives << walk(clause, filename, copy_flow(flow), limit) if possible
        possible = false
      end
    end
    alternatives << flow if possible
    merge_flows(alternatives)
  end

  def restore_locals(flow, locals)
    flow.locals = locals.dup
    flow.branches&.each { |branch| restore_locals(branch, locals) }
  end

  def load_paths(names, method, filename, flow)
    roots = method == :require_relative ? [File.dirname(filename)] :
      [@library.workspace.directory, File.join(@library.workspace.directory, 'lib')]
    targets = names.map do |name|
      next nil unless name.is_a?(String)
      roots.flat_map { |root| [File.expand_path(name, root), File.expand_path("#{name}.rb", root)] }
        .find { |path| @sources.key?(path) }
    end.uniq
    merge_flows(targets.map do |target|
      current = copy_flow(flow)
      if target && !current.loaded.include?(target)
        current.loaded.add(target)
        locals = current.locals
        current.locals = {}
        current = walk(@sources[target].node, target, current)
        restore_locals(current, locals)
      end
      current
    end)
  end
end
`

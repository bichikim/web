/** Filters query names by parsed symbols before using Solargraph's native location extraction. */
export const rubyReferenceCandidates = String.raw`
module CodeViewerReferenceCandidates
  def self.names(node)
    return nil unless defined?(::Parser::AST::Node) && node.is_a?(::Parser::AST::Node)
    present = Set.new
    pending = [node]
    until pending.empty?
      current = pending.pop
      current.children.each do |child|
        if child.is_a?(::Parser::AST::Node)
          pending.push(child)
        elsif child.is_a?(Symbol)
          present.add(child.to_s)
        end
      end
    end
    present
  end

  def self.locations(source, names)
    present = self.names(source.node)
    candidates = present.nil? ? names : names.select { |name| present.include?(name) }
    candidates.flat_map { |name| source.references(name) }.uniq
  end
end
`

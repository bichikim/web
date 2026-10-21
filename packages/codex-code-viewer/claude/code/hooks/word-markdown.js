const escapeText = (text) => text.replace(/[\\`*_[\]<>]/gu, '\\$&')
const descendants = (node, tag) =>
  node.kind === 'text'
    ? []
    : node.tag === tag
      ? [node]
      : node.children.flatMap((child) => descendants(child, tag))
const tableMarkdown = (node) => {
  const rows = descendants(node, 'tr').map((row) =>
    row.children
      .filter((child) => child.kind === 'element' && ['td', 'th'].includes(child.tag))
      .map((cell) =>
        wordMarkdown(cell.children).trim().replaceAll('\n', ' ').replaceAll('|', '\\|'),
      ),
  )
  return rows.length === 0
    ? ''
    : `\n${[rows[0], rows[0].map(() => '---'), ...rows.slice(1)]
        .map((row) => `| ${row.join(' | ')} |`)
        .join('\n')}\n\n`
}
const nodeMarkdown = (node) => {
  if (node.kind === 'text') {
    return escapeText(node.text)
  }
  if (node.tag === 'table') {
    return tableMarkdown(node)
  }
  const content = wordMarkdown(node.children)
  if (/^h[1-6]$/u.test(node.tag)) {
    return `${'#'.repeat(Number(node.tag.slice(1)))} ${content}\n\n`
  }
  switch (node.tag) {
    case 'strong':
      return `**${content}**`
    case 'em':
      return `*${content}*`
    case 'a':
      return node.href === undefined ? content : `[${content}](${node.href.replaceAll(')', '%29')})`
    case 'img':
      return ''
    case 'br':
      return '  \n'
    case 'hr':
      return '\n---\n'
    case 'li':
      return `- ${content.trim()}\n`
    case 'p':
    case 'blockquote':
      return `${content}\n\n`
    default:
      return content
  }
}
/** Presents sanitized Word nodes as native Markdown without fetching document resources. */
export function wordMarkdown(nodes) {
  return nodes.map(nodeMarkdown).join('')
}
export const wordImages = (nodes) => nodes.flatMap((node) => descendants(node, 'img'))

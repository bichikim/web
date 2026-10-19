import {fromMarkdown} from 'mdast-util-from-markdown'
import type {RootContent} from 'mdast'
import {parseFileInput} from '../../../src/viewer/parse-file-input'
import type {CodeLocation} from '../../../src/shared/contracts'
import {TEXT_FILE_NAMES} from '../../../src/shared/file-formats'
import {isProjectFile} from './is-project-file'

interface FileLink {
  readonly href: string
  readonly location: CodeLocation
}
interface FileLinks {
  readonly text: string
  readonly links: readonly FileLink[]
}

/** Resolves project file links while leaving remote, out-of-project and code examples untouched. */
export const readFileLinks = (text: string, workspace: string): FileLinks => {
  const links: FileLink[] = []
  const replacements: {start: number; end: number; text: string}[] = []
  const root = fromMarkdown(text)
  const definitions = new Map(
    root.children.flatMap((node) =>
      node.type === 'definition' ? [[node.identifier, node.url] as const] : [],
    ),
  )
  const visit = (node: RootContent): void => {
    const href =
      node.type === 'link'
        ? node.url
        : node.type === 'linkReference'
          ? definitions.get(node.identifier)
          : undefined
    const location = href === undefined ? undefined : readLocation(href, workspace)
    if (location !== undefined && (node.type === 'link' || node.type === 'linkReference')) {
      const address = fileAddress(location.path)
      address.hash = `L${location.line}C${location.column}`
      const target = address.href
      const start = node.position?.start.offset
      const end = node.position?.end.offset
      const first = node.children[0]?.position?.start.offset
      const last = node.children.at(-1)?.position?.end.offset
      if (start !== undefined && end !== undefined && first !== undefined && last !== undefined) {
        replacements.push({end, start, text: `[${text.slice(first, last)}](${target})`})
        links.push({href: target, location})
      }
    } else if ('children' in node) {
      node.children.forEach(visit)
    }
  }
  root.children.forEach(visit)
  return {
    links,
    text: replacements
      .toReversed()
      .reduce(
        (value, entry) => value.slice(0, entry.start) + entry.text + value.slice(entry.end),
        text,
      ),
  }
}

const fileTarget = (href: string): string => {
  const filename = /^(?<filename>[^/?#:]+):\d+(?::\d+)?(?:-\d+(?::\d+)?)?$/u.exec(href)?.groups
    ?.filename
  return filename !== undefined && (filename.includes('.') || TEXT_FILE_NAMES.includes(filename))
    ? `./${href}`
    : href
}

const readLocation = (href: string, workspace: string): CodeLocation | undefined => {
  try {
    const target = fileTarget(href)
    if (workspace === '' || target.startsWith('//') || /^(?!file:)[a-z][\w+.-]*:/iu.test(target)) {
      return undefined
    }
    const address = new URL(target, `file://${workspace.replace(/\/$/u, '')}/`)
    if (address.protocol !== 'file:' || address.hostname !== '' || address.search !== '') {
      return undefined
    }
    const hash = /^#L(?<line>\d+)(?:C(?<column>\d+))?(?:-L?\d+(?:C\d+)?)?$/u.exec(address.hash)
    if (address.hash !== '' && hash === null) {
      return undefined
    }
    const parsed = parseFileInput(decodeURIComponent(address.pathname))
    if (parsed.kind !== 'path') {
      return undefined
    }
    if (!isProjectFile(parsed.location.path, workspace)) {
      return undefined
    }
    return {
      ...parsed.location,
      ...(hash === null
        ? {}
        : {column: Number(hash.groups?.column ?? 1), line: Number(hash.groups?.line)}),
    }
  } catch {
    return undefined
  }
}

const fileAddress = (path: string): URL =>
  new URL(`file://${path.split('/').map(encodeURIComponent).join('/')}`)

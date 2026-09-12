import {posix} from 'node:path'
import type {Nodes, RootContent} from 'mdast'
import {fromMarkdown} from 'mdast-util-from-markdown'
import {frontmatterFromMarkdown} from 'mdast-util-frontmatter'
import {toString} from 'mdast-util-to-string'
import {frontmatter} from 'micromark-extension-frontmatter'
import {parse} from 'yaml'
import {z} from 'zod'

import {
  KNOWLEDGE_RELATION_TYPES,
  KNOWLEDGE_STATUSES,
  KNOWLEDGE_UNIT_TYPES,
  type KnowledgeRelationType,
  type KnowledgeStatus,
  type KnowledgeUnitType,
} from '../domain/content-hash'

export interface KnowledgeReference {
  readonly kind: 'logical' | 'path'
  readonly target: string
  readonly type: KnowledgeRelationType
}

export interface ParsedKnowledgeUnit {
  readonly endLine: number
  readonly references: ReadonlyArray<KnowledgeReference>
  readonly startLine: number
  readonly status: KnowledgeStatus
  readonly tags: ReadonlyArray<string>
  readonly text: string
  readonly title: string
  readonly type: KnowledgeUnitType
  readonly unitId: string
}

export interface ParsedKnowledgeDocument {
  readonly docId: string
  readonly explicitId: boolean
  readonly language?: string
  readonly path: string
  readonly units: ReadonlyArray<ParsedKnowledgeUnit>
}

export interface ParseKnowledgeDocumentOptions {
  readonly format: 'markdown' | 'text'
  readonly path: string
  readonly source: string
}

export interface InvalidKnowledgeDocumentError {
  readonly code: 'duplicate-unit-id' | 'invalid-document-path' | 'invalid-frontmatter'
  readonly detail: string
  readonly path: string
}

export interface ParseKnowledgeDocumentFailure {
  readonly error: InvalidKnowledgeDocumentError
  readonly ok: false
}

export interface ParseKnowledgeDocumentSuccess {
  readonly ok: true
  readonly value: ParsedKnowledgeDocument
}

export type ParseKnowledgeDocumentResult =
  | ParseKnowledgeDocumentFailure
  | ParseKnowledgeDocumentSuccess

const metadataSchema = z
  .object({
    id: z
      .string()
      .trim()
      .min(1)
      .regex(/^[^#\s]+$/u)
      .optional(),
    language: z.string().trim().min(1).optional(),
    relations: z
      .array(
        z
          .object({
            target: z.string().trim().min(1),
            type: z.enum(KNOWLEDGE_RELATION_TYPES),
          })
          .strict(),
      )
      .default([]),
    status: z.enum(KNOWLEDGE_STATUSES).default('active'),
    tags: z.array(z.string().trim().min(1)).default([]),
    title: z.string().trim().min(1).optional(),
    type: z.enum(KNOWLEDGE_UNIT_TYPES).default('document'),
  })
  .strict()

const frontmatterSchema = z.object({knowledge: metadataSchema.optional()})
const EXPLICIT_ID = /\s+\{#(?<id>[^\s{}#]+)\}\s*$/u
const EXTERNAL_LINK = /^(?:[a-z][a-z\d+.-]*:|\/\/)/iu

const failure = (
  path: string,
  code: InvalidKnowledgeDocumentError['code'],
  detail: string,
): ParseKnowledgeDocumentFailure => ({error: {code, detail, path}, ok: false})

const canonicalPath = (path: string): boolean =>
  path !== '' &&
  path !== '.' &&
  !path.startsWith('../') &&
  !posix.isAbsolute(path) &&
  !/[\\\p{Cc}]/u.test(path) &&
  !/^[a-z]:/iu.test(path) &&
  posix.normalize(path) === path

const flatten = (node: Nodes): ReadonlyArray<Nodes> =>
  'children' in node ? [node, ...node.children.flatMap(flatten)] : [node]

const referencesFrom = (
  nodes: ReadonlyArray<RootContent>,
  definitions: ReadonlyMap<string, string>,
  source: string,
): ReadonlyArray<KnowledgeReference> =>
  nodes.flatMap(flatten).flatMap((node): KnowledgeReference[] => {
    if (node.type === 'link' || node.type === 'linkReference') {
      const target = node.type === 'link' ? node.url : definitions.get(node.identifier)
      return target === undefined || EXTERNAL_LINK.test(target)
        ? []
        : [{kind: 'path' as const, target, type: 'links-to' as const}]
    }
    if (node.type === 'text') {
      const {position} = node
      if (position?.start.offset === undefined || position.end.offset === undefined) {
        throw new Error('Markdown parser omitted text positions')
      }
      const raw = source.slice(position.start.offset, position.end.offset)
      const pairs = 2
      return [...raw.matchAll(/(?<escapes>\\*)\[\[(?<target>[^[\]\n]+)\]\]/gu)]
        .filter((match) => match[1].length % pairs === 0)
        .map((match) => ({
          kind: 'logical' as const,
          target: match[2].trim(),
          type: 'links-to' as const,
        }))
    }
    return []
  })

interface DocumentSection {
  readonly explicitId?: string
  readonly nodes: ReadonlyArray<RootContent>
  readonly title: string
}

const sectionsFrom = (
  nodes: ReadonlyArray<RootContent>,
  title: string,
): ReadonlyArray<DocumentSection> => {
  const sections: DocumentSection[] = []
  let current: RootContent[] = []
  let currentTitle = title
  let explicitId: string | undefined
  for (const node of nodes) {
    if (node.type === 'heading') {
      if (current.length > 0) {
        sections.push({explicitId, nodes: current, title: currentTitle})
      }
      current = []
      const heading = toString(node)
      explicitId = EXPLICIT_ID.exec(heading)?.groups?.id
      currentTitle = heading.replace(EXPLICIT_ID, '').trim()
    }
    current.push(node)
  }
  if (current.length > 0) {
    sections.push({explicitId, nodes: current, title: currentTitle})
  }
  return sections
}

const fallbackId = (section: DocumentSection): string => {
  if (section.nodes[0].type !== 'heading') {
    return 'preamble'
  }
  return (
    section.title
      .normalize('NFC')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s_-]/gu, '')
      .trim()
      .replace(/\s+/gu, '-') || 'section'
  )
}

/** Parses repository-relative source into non-overlapping units and unresolved references. */
export const parseKnowledgeDocument = (
  options: ParseKnowledgeDocumentOptions,
): ParseKnowledgeDocumentResult => {
  if (!canonicalPath(options.path)) {
    return failure(
      options.path,
      'invalid-document-path',
      'Expected a canonical repository-relative path',
    )
  }

  if (options.format === 'text') {
    return {
      ok: true,
      value: {
        docId: options.path,
        explicitId: false,
        path: options.path,
        units:
          options.source.trim() === ''
            ? []
            : [
                {
                  endLine: options.source.split(/\r\n?|\n/u).length,
                  references: [],
                  startLine: 1,
                  status: 'active',
                  tags: [],
                  text: options.source,
                  title: options.path,
                  type: 'document',
                  unitId: 'document',
                },
              ],
      },
    }
  }

  const tree = fromMarkdown(options.source, {
    extensions: [frontmatter(['yaml'])],
    mdastExtensions: [frontmatterFromMarkdown(['yaml'])],
  })
  const [header] = tree.children
  let metadata: z.infer<typeof metadataSchema>
  try {
    const raw: unknown = header?.type === 'yaml' ? parse(header.value) : {}
    const parsed = frontmatterSchema.parse(raw ?? {})
    metadata = parsed.knowledge ?? metadataSchema.parse({})
  } catch (error) {
    return failure(
      options.path,
      'invalid-frontmatter',
      error instanceof Error ? error.message : String(error),
    )
  }

  const definitions = new Map<string, string>()
  for (const node of flatten(tree)) {
    if (node.type === 'definition' && !definitions.has(node.identifier)) {
      definitions.set(node.identifier, node.url)
    }
  }
  const body = tree.children.filter((node) => node.type !== 'yaml' && node.type !== 'definition')
  const sections = sectionsFrom(body, metadata.title ?? options.path)
  const allocated = new Set<string>()
  for (const section of sections) {
    if (section.explicitId !== undefined) {
      if (allocated.has(section.explicitId)) {
        return failure(options.path, 'duplicate-unit-id', section.explicitId)
      }
      allocated.add(section.explicitId)
    }
  }
  const units = sections.map((section): ParsedKnowledgeUnit => {
    const base = fallbackId(section)
    let unitId = section.explicitId ?? base
    if (section.explicitId === undefined) {
      let suffix = 1
      while (allocated.has(unitId)) {
        suffix += 1
        unitId = `${base}-${suffix}`
      }
      allocated.add(unitId)
    }
    const first = section.nodes[0].position
    const last = section.nodes[section.nodes.length - 1].position
    if (first?.start.offset === undefined || last?.end.offset === undefined) {
      throw new Error('Markdown parser omitted source positions')
    }
    return {
      endLine: last.end.line,
      references: [
        ...metadata.relations.map(
          (relation): KnowledgeReference => ({...relation, kind: 'logical'}),
        ),
        ...referencesFrom(section.nodes, definitions, options.source),
      ],
      startLine: first.start.line,
      status: metadata.status,
      tags: metadata.tags,
      text: options.source.slice(first.start.offset, last.end.offset),
      title: section.title,
      type: metadata.type,
      unitId,
    }
  })
  return {
    ok: true,
    value: {
      docId: metadata.id ?? options.path,
      explicitId: metadata.id !== undefined,
      language: metadata.language,
      path: options.path,
      units,
    },
  }
}

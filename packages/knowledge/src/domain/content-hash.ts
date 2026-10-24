import {createHash} from 'node:crypto'

export const KNOWLEDGE_RELATION_TYPES = [
  'depends-on',
  'implements',
  'links-to',
  'related',
  'supersedes',
] as const
export const KNOWLEDGE_STATUSES = ['active', 'conflicting', 'deprecated', 'superseded'] as const
export const KNOWLEDGE_UNIT_TYPES = [
  'architecture',
  'decision',
  'document',
  'example',
  'gotcha',
  'rule',
] as const

export type KnowledgeRelationType = (typeof KNOWLEDGE_RELATION_TYPES)[number]
export type KnowledgeStatus = (typeof KNOWLEDGE_STATUSES)[number]
export type KnowledgeUnitType = (typeof KNOWLEDGE_UNIT_TYPES)[number]

export interface KnowledgeHashRelation {
  readonly targetDocId: string
  readonly targetUnitId?: string
  readonly type: KnowledgeRelationType
}

export interface CreateKnowledgeContentHashOptions {
  readonly relations: ReadonlyArray<KnowledgeHashRelation>
  readonly status: KnowledgeStatus
  readonly tags: ReadonlyArray<string>
  readonly text: string
  readonly title: string
  readonly type: KnowledgeUnitType
}

const normalizeText = (value: string): string =>
  value
    .normalize('NFC')
    .replace(/\r\n?/gu, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trimEnd()

const relationKey = (relation: KnowledgeHashRelation): string =>
  JSON.stringify([
    relation.type,
    normalizeText(relation.targetDocId),
    relation.targetUnitId === undefined ? null : normalizeText(relation.targetUnitId),
  ])

export const createKnowledgeContentHash = (options: CreateKnowledgeContentHashOptions): string => {
  const tags = options.tags.map(normalizeText).toSorted()
  const relations = options.relations.map(relationKey).toSorted()
  const content = JSON.stringify([
    options.type,
    options.status,
    normalizeText(options.title),
    normalizeText(options.text),
    tags,
    relations,
  ])

  return `sha256:${createHash('sha256').update(content, 'utf8').digest('hex')}`
}

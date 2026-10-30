import type {WidgetBackground} from '../widget-preview/backgrounds'

const TIMING = {
  codex: 5.1,
  details: 3.85,
  download: 6.35,
  intro: 0.12,
  wallpaper: 1.35,
  widgets: 2.6,
}
const GEOMETRY = {
  center: 0.5,
  mobileWidth: 640,
}
const KINDS = ['overview', 'wallpaper', 'widgets', 'details', 'codex', 'download'] as const
export const STORY_CUTS = [
  TIMING.intro,
  TIMING.wallpaper,
  TIMING.widgets,
  TIMING.details,
  TIMING.codex,
  TIMING.download,
]
export const STORY_LENGTH = 7.45

export interface StoryCharacter {
  /** Offset from the viewport center in CSS pixels. */
  readonly x: number
  /** Offset from the viewport center in CSS pixels. */
  readonly y: number
  /** Rendered size, independent of the user's saved widget size. */
  readonly scale: number
  /** Model animation used by the product demonstration. */
  readonly motionId: string
  /** Null explicitly clears the user's expression during the demonstration. */
  readonly expressionId: string | null
  /** Reduced-motion presentations render a still pose. */
  readonly playing?: boolean
}

interface StoryViewport {
  /** Scroll distance measured in stage heights. */
  readonly distance: number
  /** Stage width in CSS pixels. */
  readonly width: number
  /** Stage height in CSS pixels. */
  readonly height: number
  /** Replace moving transitions with discrete scene changes. */
  readonly reducedMotion?: boolean
}

const clamp = (value: number) => Math.max(0, Math.min(1, value))

/** Resolve a settled product chapter; scroll selects chapters rather than scrubbing their animation. */
export const resolveStoryFrame = (viewport: StoryViewport) => {
  const distance = Number.isFinite(viewport.distance) ? Math.max(0, viewport.distance) : 0
  const chapter = Math.max(
    0,
    STORY_CUTS.findLastIndex((cut) => distance >= cut),
  )
  const kind = KINDS[chapter]!
  const mobile = viewport.width < GEOMETRY.mobileWidth
  const placements = mobile
    ? [
        {scale: 2.1, x: 0.78, y: 0.86},
        {scale: 2.1, x: 0.78, y: 0.86},
        {scale: 2.1, x: 0.78, y: 0.86},
        {scale: 2.1, x: 0.78, y: 0.86},
        {scale: 2.1, x: 0.78, y: 0.86},
        {scale: 2.1, x: 0.78, y: 0.86},
      ]
    : [
        {scale: 1.05, x: 0.76, y: 0.59},
        {scale: 1.04, x: 0.77, y: 0.6},
        {scale: 1.05, x: 0.76, y: 0.6},
        {scale: 1.1, x: 0.77, y: 0.57},
        {scale: 1.08, x: 0.77, y: 0.6},
        {scale: 0.96, x: 0.78, y: 0.6},
      ]
  const placement = placements[chapter]!
  const character: StoryCharacter = {
    expressionId: kind === 'widgets' ? '커피 들기' : kind === 'details' ? '작아지기' : null,
    motionId: kind === 'wallpaper' ? 'Walk:0' : 'Idle:0',
    playing: !viewport.reducedMotion,
    scale: placement.scale,
    x: (placement.x - GEOMETRY.center) * viewport.width,
    y: (placement.y - GEOMETRY.center) * viewport.height,
  }
  const active = distance >= STORY_CUTS[0]!
  return {
    active,
    background: (kind === 'wallpaper' ? 'street-front' : 'profile') as WidgetBackground,
    chapter,
    character,
    entrance: Number(active),
    kind,
    progress: active ? (chapter + 1) / KINDS.length : 0,
    transitioning: false,
    visible: active,
  }
}

export type StoryFrame = ReturnType<typeof resolveStoryFrame>

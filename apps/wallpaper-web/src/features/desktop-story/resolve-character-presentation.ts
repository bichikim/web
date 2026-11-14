import type {StoryCharacter, StoryFrame} from './frame'

interface ResolveCharacterPresentationOptions {
  /** Current chapter, its entrance progress and transition state. */
  readonly frame: StoryFrame
  /** User-selected character pose and placement, preserved outside visible chapters. */
  readonly preview: StoryCharacter
}

/** Blend the user's placement into a chapter; inactive chapters leave presentation uncontrolled. */
export const resolveCharacterPresentation = (
  options: ResolveCharacterPresentationOptions,
): StoryCharacter | undefined => {
  const {frame, preview} = options
  if (!frame.active) {
    return undefined
  }
  const EASE_SLOPE = 3
  const entrance = frame.entrance * frame.entrance * (EASE_SLOPE - 2 * frame.entrance)
  return {
    ...frame.character,
    expressionId: frame.visible ? frame.character.expressionId : preview.expressionId,
    motionId: frame.visible ? frame.character.motionId : preview.motionId,
    playing: !frame.transitioning && (frame.visible ? frame.character.playing : preview.playing),
    scale: preview.scale * (1 - entrance) + frame.character.scale * entrance,
    x: preview.x * (1 - entrance) + frame.character.x * entrance,
    y: preview.y * (1 - entrance) + frame.character.y * entrance,
  }
}

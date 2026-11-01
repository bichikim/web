import type {PuppetExpression} from '../document'
import {createExpressionPlayback} from '../playback/expression-playback'

/** Owns independently fading expression channels without changing the player's selected expression. */
export const createExpressionLayers = (
  initial: readonly PuppetExpression[],
  onChange: () => void,
) => {
  let expressions = initial
  const channels = new Map<string, ReturnType<typeof createExpressionPlayback>>()
  return {
    advance: (seconds: number) => {
      for (const [id, channel] of channels) {
        channel.advance(seconds)
        if (channel.layers().length === 0) {
          channels.delete(id)
        }
      }
    },
    isAnimating: () => [...channels.values()].some((channel) => channel.isAnimating()),
    layers: () => [...channels.values()].map((channel) => channel.layers()),
    set: (id: string, expressionId?: string) => {
      const channel = channels.get(id) ?? createExpressionPlayback(expressions)
      if (!channel.set(expressionId)) {
        return false
      }
      if (channel.layers().length === 0) {
        channels.delete(id)
      } else {
        channels.set(id, channel)
      }
      onChange()
      return true
    },
    update: (next: readonly PuppetExpression[]) => {
      expressions = next
      for (const channel of channels.values()) {
        channel.update(next)
      }
    },
  }
}

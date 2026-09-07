export const ART_STYLES = {
  abstract: 'Abstract art, expressive shapes, nonliteral forms, bold color relationships.',
  coloredPencil: 'Colored pencil illustration, hand-drawn strokes, warm colors, textured paper.',
  comic:
    'Comic illustration, clean ink outlines, flat colors, expressive shapes, no text or speech bubbles.',
  none: '',
  oil: 'Oil painting, rich pigments, visible brushstrokes, layered paint texture.',
  pencil: 'Graphite pencil sketch, delicate linework, cross-hatching, monochrome paper texture.',
  photo: 'Photographic style, natural lighting, realistic materials and fine detail.',
  pixel: 'Pixel art, crisp pixel grid, limited color palette, simple shapes.',
  watercolor: 'Watercolor painting, translucent washes, soft edges, textured paper.',
} as const

export type ArtStyle = keyof typeof ART_STYLES

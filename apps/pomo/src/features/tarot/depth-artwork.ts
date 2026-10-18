const assets = import.meta.glob<string>('./assets/depth/*.webp', {
  eager: true,
  import: 'default',
  query: '?url',
})

export const TAROT_DEPTH_ARTWORK: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(assets).map(([path, source]) => [
    path.slice('./assets/depth/depth-'.length, -'.webp'.length),
    source,
  ]),
)

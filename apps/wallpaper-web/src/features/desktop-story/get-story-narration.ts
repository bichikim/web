import chapters from '../../data/story/chapters.json'

export const getStoryNarration = (chapter: number): string | null => {
  const content = chapters[chapter]
  return content?.description ?? null
}

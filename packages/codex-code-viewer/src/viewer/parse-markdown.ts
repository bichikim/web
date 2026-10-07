import {fromMarkdown} from 'mdast-util-from-markdown'
import {gfmFromMarkdown} from 'mdast-util-gfm'
import {mdxFromMarkdown} from 'mdast-util-mdx'
import {gfm} from 'micromark-extension-gfm'
import {mdxjs} from 'micromark-extension-mdxjs'

export const parseMarkdown = (source: string, path: string) => {
  const mdx = path.toLowerCase().endsWith('.mdx')
  try {
    return fromMarkdown(source, {
      extensions: mdx ? [gfm(), mdxjs()] : [gfm()],
      mdastExtensions: mdx ? [gfmFromMarkdown(), mdxFromMarkdown()] : [gfmFromMarkdown()],
    })
  } catch {
    return fromMarkdown(source, {extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()]})
  }
}

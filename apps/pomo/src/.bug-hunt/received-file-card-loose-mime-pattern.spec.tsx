/** @vitest-environment jsdom */
import {render} from '@solidjs/testing-library'
import {describe, expect, it} from 'vitest'
import {ReceivedFileCard} from '../components/tools/ReceivedFileCard'
import type {ReceivedFile} from '../features/file-transfer/received-files'

const file = (name: string, mimeType = 'text/plain'): ReceivedFile => ({
  id: 'id',
  mimeType,
  name,
  removed: null,
  saved: false,
  size: 12,
  url: 'blob:1',
})

describe('ReceivedFileCard file kind detection', () => {
  it('should not classify unrelated text files as zip archives from substring matches', () => {
    const {container} = render(() => <ReceivedFileCard file={file('unzip-notes.txt')} />)
    expect(container.querySelector('.i-tabler-file-zip')).toBeNull()
    expect(container.textContent).toContain('TXT')
  })

  it('should not classify unrelated text files as PDF from substring matches', () => {
    const {container} = render(() => <ReceivedFileCard file={file('mypdf-notes.txt')} />)
    expect(container.querySelector('.i-tabler-file-type-pdf')).toBeNull()
    expect(container.textContent).toContain('TXT')
  })
})

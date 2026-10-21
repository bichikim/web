/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, describe, expect, it} from 'vitest'
import type {ReceivedFile} from 'src/features/file-transfer/received-files'
import {ReceivedFileCard} from '../ReceivedFileCard'

afterEach(cleanup)

const file = (name: string, mimeType: string): ReceivedFile => ({
  id: 'file',
  mimeType,
  name,
  removed: null,
  saved: false,
  size: 12,
  url: null,
})

const icon = (name: string) =>
  screen.getByRole('article', {name}).querySelector('span[aria-hidden="true"]')

describe('ReceivedFileCard', () => {
  it.each([
    ['unzip-notes.txt', 'text/plain', 'i-tabler-file-text'],
    ['mypdf-notes.txt', 'text/plain', 'i-tabler-file-text'],
    ['compressed-notes.txt', 'text/plain', 'i-tabler-file-text'],
    ['spreadsheet-notes.txt', 'text/plain', 'i-tabler-file-text'],
    ['presentation-notes.txt', 'text/plain', 'i-tabler-file-text'],
    ['document-notes.bin', 'application/octet-stream', 'i-tabler-file'],
  ])('should ignore category words inside the filename: %s', (name, mimeType, expected) => {
    render(() => <ReceivedFileCard file={file(name, mimeType)} />)

    // 장식 아이콘의 class 자체가 파일 종류 출력 계약입니다.
    expect(icon(name)).toHaveClass(expected)
    expect(screen.getByRole('article', {name})).toHaveTextContent(
      name.split('.').at(-1)!.toUpperCase(),
    )
  })

  it.each([
    ['photo.JPG', 'i-tabler-file-type-jpg'],
    ['song.mp3', 'i-tabler-file-music'],
    ['movie.webm', 'i-tabler-movie'],
    ['report.PDF', 'i-tabler-file-type-pdf'],
    ['archive.7z', 'i-tabler-file-zip'],
    ['data.xlsx', 'i-tabler-table'],
    ['slides.pptx', 'i-tabler-presentation'],
    ['notes.md', 'i-tabler-file-text'],
  ])('should retain extension detection without a specific MIME type: %s', (name, expected) => {
    render(() => <ReceivedFileCard file={file(name, 'application/octet-stream')} />)

    expect(icon(name)).toHaveClass(expected)
  })

  it.each([
    ['image/png', 'i-tabler-file-type-jpg'],
    ['audio/mpeg', 'i-tabler-file-music'],
    ['video/mp4', 'i-tabler-movie'],
    ['application/pdf', 'i-tabler-file-type-pdf'],
    ['application/zip', 'i-tabler-file-zip'],
    ['application/x-zip-compressed', 'i-tabler-file-zip'],
    ['application/vnd.ms-excel', 'i-tabler-table'],
    [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'i-tabler-presentation',
    ],
    [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'i-tabler-file-text',
    ],
  ])('should retain MIME detection without a filename extension: %s', (mimeType, expected) => {
    render(() => <ReceivedFileCard file={file('download', mimeType)} />)

    expect(icon('download')).toHaveClass(expected)
  })

  it('should update the icon when the received file changes', () => {
    const [received, setReceived] = createSignal(file('unzip-notes.txt', 'text/plain'))
    render(() => <ReceivedFileCard file={received()} />)
    expect(icon('unzip-notes.txt')).toHaveClass('i-tabler-file-text')

    setReceived(file('report.pdf', 'application/pdf'))

    expect(icon('report.pdf')).toHaveClass('i-tabler-file-type-pdf')
  })
})

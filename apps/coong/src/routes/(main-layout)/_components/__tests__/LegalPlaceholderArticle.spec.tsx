/**
 * @vitest-environment jsdom
 */
import {render, screen} from '@solidjs/testing-library'
import {describe, expect, it} from 'vitest'
import {LegalPlaceholderArticle} from '../LegalPlaceholderArticle'

describe('LegalPlaceholderArticle', () => {
  it('should identify placeholder legal content with its supplied summary', () => {
    render(() => <LegalPlaceholderArticle title="Terms" summary="Draft terms summary" />)

    expect(screen.getByRole('status')).toHaveTextContent('Temporary placeholder page')
    expect(screen.getByRole('heading', {name: 'Terms'})).toBeInTheDocument()
    expect(screen.getByText('Draft terms summary')).toBeInTheDocument()
  })
})

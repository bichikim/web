import path from 'node:path'
import {describe, expect, it} from 'vitest'
import {createFileContext, splitFileNameWords} from '../file-context'

describe('splitFileNameWords', () => {
  it.each([
    ['user-profile-form.tsx', ['user', 'profile', 'form']],
    ['userProfileForm.tsx', ['user', 'profile', 'form']],
    ['UserProfileForm.tsx', ['user', 'profile', 'form']],
    ['user_profile_form.tsx', ['user', 'profile', 'form']],
    ['XMLHttpRequest.ts', ['xml', 'http', 'request']],
  ])('should normalize %s into semantic filename words', (fileName, expected) => {
    expect(splitFileNameWords(fileName)).toEqual(expected)
  })
})

describe('createFileContext', () => {
  it('should expose the parsed source file and a stable outline', () => {
    const root = path.resolve('/project')
    const context = createFileContext({
      filePath: path.join(root, 'src/user-profile.ts'),
      root,
      sourceText: [
        "import {createSignal} from 'solid-js'",
        "import type {User} from './types'",
        'const internalValue = 1',
        'export interface ProfileOptions { user: User }',
        'export function UserProfile() { return createSignal(internalValue) }',
      ].join('\n'),
    })

    expect(context.fileName.words).toEqual(['user', 'profile'])
    expect(context.outline).toEqual({
      declarations: ['internalValue', 'ProfileOptions', 'UserProfile'],
      exports: ['ProfileOptions', 'UserProfile'],
      imports: ['./types', 'solid-js'],
    })
    expect(context.relativePath).toBe('src/user-profile.ts')
    expect(context.sourceFile.statements.length).toBe(5)
  })
})

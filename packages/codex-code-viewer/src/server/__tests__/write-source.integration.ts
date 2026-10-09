import {createHash} from 'node:crypto'
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {writeSource} from '../write-source'
import {readDocument} from '../read-document'

const revision = (source: string): string => createHash('sha256').update(source).digest('hex')
describe('writeSource', () => {
  let root: string
  const initial = '\uFEFFexport const answer = 1\r\n'
  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'viewer-write-')))
    mkdirSync(join(root, '.git'))
    writeFileSync(join(root, 'main.ts'), initial, {mode: 0o640})
  })
  afterEach(() => rmSync(root, {force: true, recursive: true}))
  it.each([
    ['main.py', 'value = 1\r\n', 'value = 42\r\n'],
    ['main.pyi', 'def value() -> int: ...\n', 'def value() -> str: ...\n'],
    ['main.rb', 'value = 1\n', 'value = 42\n'],
    ['tasks.rake', 'task :old\n', 'task :new\n'],
    [
      'example.gemspec',
      'Gem::Specification.new do |s|\nend\n',
      'Gem::Specification.new do |s|\n  s.name = "viewer"\nend\n',
    ],
    ['Gemfile', 'gem "rake"\n', 'gem "rake", "13.0"\n'],
    ['Rakefile', 'task :old\n', 'task :new\n'],
    ['main.rs', 'fn main() {}\n', 'fn main() { println!("hello"); }\n'],
    ['config.json', '{"old":1}\r\n', '{"new":42}\r\n'],
    ['config.jsonc', '// comment\n{"old":1}', '// changed\n{"new":42}'],
    ['config.json5', '{old:1}', '{new:42}'],
    ['config.toml', 'name = "old"\r\n', 'name = "new"\r\n'],
    ['config.yaml', 'name: old\n', 'name: new\n'],
    ['config.yml', 'name: old\n', 'name: new\n'],
    ['index.html', '<h1>Old</h1>\n', '<h1>새 문서</h1>\n'],
    ['index.htm', '<p>Old</p>', '<p>New</p>'],
    ['styles.css', '.card {color:red}', '.card {color:blue}'],
    ['styles.scss', '$color: red;', '$color: blue;'],
    ['styles.sass', '$color: red\n', '$color: blue\n'],
    ['styles.less', '@color: red;', '@color: blue;'],
    ['Panel.vue', '<template>Old</template>', '<template>New</template>'],
    ['Panel.svelte', '<h1>Old</h1>', '<h1>New</h1>'],
    [
      'Panel.astro',
      '---\nconst title = "Old"\n---\n<h1>{title}</h1>',
      '---\nconst title = "New"\n---\n<h1>{title}</h1>',
    ],
    ['document.xml', '<title>Old</title>', '<title>New</title>'],
    ['settings.ini', 'name=Old', 'name=New'],
    ['settings.conf', 'name=Old', 'name=New'],
    ['settings.cfg', 'name=Old', 'name=New'],
    ['settings.properties', 'name=Old', 'name=New'],
    ['Cargo.lock', 'version = 3\n', 'version = 4\n'],
    ['notes.txt', 'old\r\ntext', '새 글\r\ntext'],
    ['LICENSE', 'old text', 'new text'],
    ['.gitignore', 'old/', 'new/'],
    ['readme.md', '# Old', '# New'],
    ['data.csv', 'name,count\na,1', 'name,count\na,42'],
  ])(
    'should save %s and return the same display tokens as reading it again',
    (path, original, source) => {
      writeFileSync(join(root, path), original)
      const saved = writeSource({path, revision: revision(original), root, source})
      expect(saved).toMatchObject({ok: true, value: {source}})
      expect(readFileSync(join(root, path), 'utf8')).toBe(source)
      expect(saved).toEqual(readDocument(root, path))
    },
  )
  it('should preserve an external text change on a revision conflict', () => {
    writeFileSync(join(root, 'notes.txt'), 'external text')
    expect(
      writeSource({path: 'notes.txt', revision: revision('old text'), root, source: 'draft'}),
    ).toMatchObject({
      error: {code: 'write-conflict'},
      ok: false,
    })
    expect(readFileSync(join(root, 'notes.txt'), 'utf8')).toBe('external text')
  })
  it.each(['', initial, 'edited draft'])(
    'should recreate a missing file with its current content %j',
    (source) => {
      rmSync(join(root, 'main.ts'))
      expect(writeSource({path: 'main.ts', revision: null, root, source})).toEqual(
        readDocument(root, 'main.ts'),
      )
      expect(readFileSync(join(root, 'main.ts'), 'utf8')).toBe(source)
      expect(readdirSync(root).sort()).toEqual(['.git', 'main.ts'])
    },
  )
  it('should not overwrite a file restored before recreation', () => {
    expect(writeSource({path: 'main.ts', revision: null, root, source: 'draft'})).toMatchObject({
      error: {code: 'write-conflict'},
      ok: false,
    })
    expect(readFileSync(join(root, 'main.ts'), 'utf8')).toBe(initial)
  })
  it('should reject recreation through a symbolic link or private directory', () => {
    symlinkSync(join(root, 'missing.ts'), join(root, 'link.ts'))
    expect(writeSource({path: 'link.ts', revision: null, root, source: 'draft'}).ok).toBe(false)
    expect(writeSource({path: '.git/new.ts', revision: null, root, source: 'draft'}).ok).toBe(false)
    symlinkSync(join(root, '.git'), join(root, 'alias'))
    expect(writeSource({path: 'alias/new.ts', revision: null, root, source: 'draft'}).ok).toBe(
      false,
    )
    expect(readdirSync(join(root, '.git'))).toEqual([])
  })
  it('should reject recreation outside the workspace', () => {
    const outside = realpathSync(mkdtempSync(join(tmpdir(), 'viewer-outside-')))
    try {
      expect(
        writeSource({path: join(outside, 'new.ts'), revision: null, root, source: 'draft'}).ok,
      ).toBe(false)
      expect(readdirSync(outside)).toEqual([])
    } finally {
      rmSync(outside, {recursive: true})
    }
  })
  it('should reject a text alias to a media file without replacing the target', () => {
    writeFileSync(join(root, 'image.png'), 'image bytes')
    symlinkSync(join(root, 'image.png'), join(root, 'notes.txt'))
    expect(
      writeSource({path: 'notes.txt', revision: revision('image bytes'), root, source: 'draft'}),
    ).toMatchObject({
      error: {code: 'unsupported-file'},
      ok: false,
    })
    expect(readFileSync(join(root, 'image.png'), 'utf8')).toBe('image bytes')
  })
  it('should replace existing code and preserve UTF-8 BOM, CRLF and permissions', () => {
    const source = initial.replace('1', '42')
    expect(writeSource({path: 'main.ts', revision: revision(initial), root, source})).toMatchObject(
      {ok: true, value: {revision: revision(source), source}},
    )
    expect(readFileSync(join(root, 'main.ts'), 'utf8')).toBe(source)
    expect(statSync(join(root, 'main.ts')).mode % 0o1000).toBe(0o640)
    expect(readdirSync(root).sort()).toEqual(['.git', 'main.ts'])
  })
  it('should preserve an external edit when the original revision no longer matches', () => {
    writeFileSync(join(root, 'main.ts'), 'external change')
    expect(
      writeSource({path: 'main.ts', revision: revision(initial), root, source: 'draft'}),
    ).toMatchObject({error: {code: 'write-conflict'}, ok: false})
    expect(readFileSync(join(root, 'main.ts'), 'utf8')).toBe('external change')
  })
  it('should reject document editing without changing its bytes', () => {
    writeFileSync(join(root, 'document.docx'), 'document bytes')
    expect(
      writeSource({
        path: 'document.docx',
        revision: revision('document bytes'),
        root,
        source: 'changed',
      }),
    ).toMatchObject({error: {code: 'unsupported-file'}, ok: false})
    expect(readFileSync(join(root, 'document.docx'), 'utf8')).toBe('document bytes')
  })
  it('should reject a link outside the workspace', () => {
    const outside = mkdtempSync(join(tmpdir(), 'viewer-outside-'))
    try {
      writeFileSync(join(outside, 'other.ts'), initial)
      symlinkSync(join(outside, 'other.ts'), join(root, 'link.ts'))
      expect(
        writeSource({path: 'link.ts', revision: revision(initial), root, source: 'draft'}),
      ).toMatchObject({error: {code: 'outside-workspace'}, ok: false})
      expect(readFileSync(join(outside, 'other.ts'), 'utf8')).toBe(initial)
    } finally {
      rmSync(outside, {force: true, recursive: true})
    }
  })
  it.each(['x'.repeat(524289), 'value\0'])(
    'should reject oversized or binary content',
    (source) => {
      expect(writeSource({path: 'main.ts', revision: revision(initial), root, source}).ok).toBe(
        false,
      )
      expect(readFileSync(join(root, 'main.ts'), 'utf8')).toBe(initial)
    },
  )
  it('should reject private directories and missing files', () => {
    writeFileSync(join(root, '.git', 'config.ts'), initial)
    expect(
      writeSource({path: '.git/config.ts', revision: revision(initial), root, source: 'draft'}).ok,
    ).toBe(false)
    expect(writeSource({path: 'new.ts', revision: revision(''), root, source: 'draft'}).ok).toBe(
      false,
    )
  })
})

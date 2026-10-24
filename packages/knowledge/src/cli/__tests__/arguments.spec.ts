import {describe, expect, it} from 'vitest'
import {parseKnowledgeArguments} from '../arguments'

describe('parseKnowledgeArguments', () => {
  it('should parse explicit inspection modes only for doctor with a model', () => {
    expect(
      parseKnowledgeArguments(['doctor', '--model', 'test', '--inspection-mode', 'research']),
    ).toMatchObject({inspectionMode: 'research'})
    expect(
      parseKnowledgeArguments(['doctor', '--model', 'test', '--inspection-mode', 'contextual']),
    ).toMatchObject({command: 'doctor', inspectionMode: 'contextual'})
    expect(parseKnowledgeArguments(['doctor', '--inspection-mode', 'contextual'])).toBeUndefined()
    expect(
      parseKnowledgeArguments(['doctor', '--model', 'test', '--inspection-mode', 'separated']),
    ).toMatchObject({command: 'doctor', inspectionMode: 'separated'})
    expect(
      parseKnowledgeArguments(['doctor', '--model', 'test', '--inspection-mode', 'combined']),
    ).toMatchObject({inspectionMode: 'combined'})
    expect(parseKnowledgeArguments(['doctor', '--inspection-mode', 'separated'])).toBeUndefined()
    expect(
      parseKnowledgeArguments(['doctor', '--model', 'test', '--inspection-mode', 'invalid']),
    ).toBeUndefined()
    expect(
      parseKnowledgeArguments(['search', 'text', '--inspection-mode', 'separated']),
    ).toBeUndefined()
  })
  it('should parse offline diagnostic evaluation and reject missing reports or unrelated options', () => {
    expect(
      parseKnowledgeArguments([
        'eval-inspection',
        'labels.yml',
        '--report',
        'doctor.json',
        '--baseline',
        'old.json',
        '--output',
        'new.json',
        '--json',
      ]),
    ).toEqual({
      baseline: 'old.json',
      command: 'eval-inspection',
      datasetPath: 'labels.yml',
      json: true,
      outputPath: 'new.json',
      reportPath: 'doctor.json',
    })
    expect(parseKnowledgeArguments(['eval-inspection', 'labels.yml'])).toBeUndefined()
    expect(
      parseKnowledgeArguments([
        'eval-inspection',
        'labels.yml',
        '--report',
        'doctor.json',
        '--model',
        'test',
      ]),
    ).toBeUndefined()
  })
  it('should enable bounded optional doctor diagnostics only with an explicit model', () => {
    expect(
      parseKnowledgeArguments([
        'doctor',
        '/repo',
        '--model',
        'test',
        '--limit',
        '3',
        '--cache-dir',
        '/cache',
      ]),
    ).toMatchObject({
      cacheDirectory: '/cache',
      command: 'doctor',
      inputPath: '/repo',
      limit: 3,
      model: 'test',
    })
    expect(parseKnowledgeArguments(['doctor', '--limit', '3'])).toBeUndefined()
    expect(parseKnowledgeArguments(['doctor', '--cache-dir', '/cache'])).toBeUndefined()
    expect(parseKnowledgeArguments(['doctor', '--model', ' '])).toBeUndefined()
  })
  it('should require model/output for generation and explicit selection/reviewer for approval', () => {
    expect(
      parseKnowledgeArguments([
        'eval-generate',
        '/repo',
        '--model',
        'test',
        '--output',
        'candidates.json',
        '--cache-dir',
        '/cache',
        '--limit',
        '2',
      ]),
    ).toMatchObject({
      cacheDirectory: '/cache',
      command: 'eval-generate',
      inputPath: '/repo',
      limit: 2,
      model: 'test',
      outputPath: 'candidates.json',
    })
    expect(
      parseKnowledgeArguments([
        'eval-approve',
        'candidates.json',
        '--ids',
        'one,two',
        '--reviewer',
        'Human',
        '--output',
        'golden.json',
      ]),
    ).toMatchObject({
      candidatePath: 'candidates.json',
      command: 'eval-approve',
      ids: ['one', 'two'],
      outputPath: 'golden.json',
      reviewer: 'Human',
    })
    for (const args of [
      ['eval-generate', '--output', 'x'],
      ['eval-generate', '--model', 'test'],
      ['eval-approve', 'x', '--output', 'y'],
      [
        'eval-approve',
        'x',
        '--ids',
        'one',
        '--reviewer',
        'Human',
        '--output',
        'y',
        '--repo',
        '/repo',
      ],
      ['search', 'q', '--model', 'test'],
      ['eval', 'cases.yml', '--output', 'x'],
    ]) {
      expect(parseKnowledgeArguments(args)).toBeUndefined()
    }
  })
  it('should accept eval inputs and restrict evaluation flags to eval', () => {
    expect(
      parseKnowledgeArguments([
        'eval',
        'cases.yml',
        '--repo',
        '/repo',
        '--k',
        '5',
        '--baseline',
        'previous.json',
        '--json',
      ]),
    ).toEqual({
      baseline: 'previous.json',
      command: 'eval',
      cutoff: 5,
      datasetPath: 'cases.yml',
      inputPath: '/repo',
      json: true,
    })
    for (const args of [
      ['eval'],
      ['eval', 'cases.yml', '--k', '0'],
      ['search', 'q', '--k', '5'],
      ['status', '--baseline', 'report.json'],
      ['eval', 'cases.yml', '--limit', '5'],
    ]) {
      expect(parseKnowledgeArguments(args)).toBeUndefined()
    }
  })
  it('should accept MCP with a fixed repository and reject ordinary JSON output mode', () => {
    expect(parseKnowledgeArguments(['mcp', '--repo', '/repo'])).toEqual({
      command: 'mcp',
      inputPath: '/repo',
      json: false,
    })
    expect(parseKnowledgeArguments(['mcp', '--json'])).toBeUndefined()
  })
  it.each(['index', 'status', 'doctor'])(
    'should resolve repository arguments for %s',
    (command) => {
      expect(parseKnowledgeArguments([command, '/repo', '--json'])).toEqual({
        command,
        inputPath: '/repo',
        json: true,
      })
    },
  )
  it('should make reindex a preview unless explicitly confirmed', () => {
    expect(parseKnowledgeArguments(['reindex', '/repo'])).toMatchObject({
      command: 'reindex',
      confirmed: false,
    })
    expect(parseKnowledgeArguments(['reindex', '--repo', '/repo', '--yes'])).toMatchObject({
      confirmed: true,
      inputPath: '/repo',
    })
  })
  it.each([
    ['doctor', '--yes'],
    ['status', '--limit', '1'],
    ['reindex', 'a', '--repo', 'b'],
    ['get'],
    ['search'],
    ['search', 'q', '--limit', '101'],
    ['doctor', 'a', 'b'],
    ['unknown'],
  ])('should reject invalid arguments %j', (...args) => {
    expect(parseKnowledgeArguments(args)).toBeUndefined()
  })
})

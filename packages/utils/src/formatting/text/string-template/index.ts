interface TextSegment {
  readonly type: 'text'
  readonly value: string
}

interface VariableSegment {
  readonly name: string
  readonly type: 'variable'
}

type TemplateSegment = TextSegment | VariableSegment

interface ParsedVariable {
  readonly nextIndex: number
  readonly segment: VariableSegment
}

export interface StringTemplateRenderer {
  (values: Readonly<Record<string, string>>): string
}

const VARIABLE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/u
const OPENING_DELIMITER = '{{'
const CLOSING_DELIMITER = '}}'

const readVariable = (template: string, openingIndex: number): ParsedVariable => {
  const contentIndex = openingIndex + OPENING_DELIMITER.length
  const closingIndex = template.indexOf(CLOSING_DELIMITER, contentIndex)

  if (closingIndex === -1) {
    throw new SyntaxError(`Unclosed template variable at index ${openingIndex}`)
  }

  const name = template.slice(contentIndex, closingIndex).trim()

  if (!VARIABLE_NAME_PATTERN.test(name)) {
    throw new SyntaxError(`Invalid template variable at index ${openingIndex}: ${name}`)
  }

  return {
    nextIndex: closingIndex + CLOSING_DELIMITER.length,
    segment: {name, type: 'variable'},
  }
}

const parseTemplate = (template: string): ReadonlyArray<TemplateSegment> => {
  const segments: Array<TemplateSegment> = []
  let startIndex = 0

  while (startIndex < template.length) {
    const openingIndex = template.indexOf(OPENING_DELIMITER, startIndex)

    if (openingIndex === -1) {
      segments.push({type: 'text', value: template.slice(startIndex)})
      startIndex = template.length
    } else {
      if (openingIndex > startIndex) {
        segments.push({type: 'text', value: template.slice(startIndex, openingIndex)})
      }

      const variable = readVariable(template, openingIndex)
      segments.push(variable.segment)
      startIndex = variable.nextIndex
    }
  }

  return segments
}

const renderVariable = (
  segment: VariableSegment,
  values: Readonly<Record<string, string>>,
): string => {
  if (!Object.hasOwn(values, segment.name)) {
    throw new ReferenceError(`Missing template variable: ${segment.name}`)
  }

  return values[segment.name] as string
}

/** Compiles `{{NAME}}` placeholders into a reusable string renderer. */
export const compileStringTemplate = (template: string): StringTemplateRenderer => {
  const segments = parseTemplate(template)

  return (values) => {
    let result = ''

    for (const segment of segments) {
      result += segment.type === 'text' ? segment.value : renderVariable(segment, values)
    }

    return result
  }
}

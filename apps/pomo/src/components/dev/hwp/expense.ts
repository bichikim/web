export interface ExpenseItem {
  readonly amount: number
  readonly name: string
  readonly quantity: number
  readonly unitPrice: number
}

export interface ExpenseForm {
  readonly date: string | null
  readonly items: ReadonlyArray<ExpenseItem>
  readonly questions: ReadonlyArray<string>
  readonly total: number
}

export interface ExpenseParseError {
  readonly code: 'invalid-input' | 'invalid-json' | 'invalid-shape'
}

export interface ExpenseFieldValue {
  readonly name: string
  readonly value: string
}

export type ExpenseParseResult =
  | {readonly ok: true; readonly value: ExpenseForm}
  | {readonly error: ExpenseParseError; readonly ok: false}

const MAXIMUM_ITEMS = 20
const EXPENSE_LINE_PATTERN =
  /^\s*(?<name>.+?)\s+(?<unitPrice>[\d,]+)\s*원(?:\s+(?<quantity>[\d,]+)\s*개)?\s*$/u
const DATE_LINE_PATTERN = /^\s*(?<date>\d{4}-\d{1,2}-\d{1,2})\s*$/u

const invalid = (code: ExpenseParseError['code']): ExpenseParseResult => ({
  error: {code},
  ok: false,
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const toPositiveInteger = (value: unknown) => {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) {
    return value
  }

  if (typeof value !== 'string') {
    return null
  }

  const normalized = value
    .replaceAll(',', '')
    .replace(/원|개/gu, '')
    .trim()
  const parsed = Number(normalized)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

const readDate = (value: unknown) => {
  if (value === undefined || value === null) {
    return null
  }

  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

const readQuestions = (value: unknown) => {
  if (value === undefined) {
    return []
  }

  if (!Array.isArray(value) || value.some((question) => typeof question !== 'string')) {
    return null
  }

  return value.map((question) => question.trim()).filter((question) => question.length > 0)
}

const readItems = (value: unknown) => {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAXIMUM_ITEMS) {
    return null
  }

  const items: Array<ExpenseItem> = []
  for (const item of value) {
    if (!isRecord(item) || typeof item.name !== 'string' || item.name.trim().length === 0) {
      return null
    }

    const unitPrice = toPositiveInteger(item.unitPrice)
    const quantity = toPositiveInteger(item.quantity)
    if (unitPrice === null || quantity === null) {
      return null
    }

    const amount = unitPrice * quantity
    if (!Number.isSafeInteger(amount)) {
      return null
    }

    items.push({
      amount,
      name: item.name.trim(),
      quantity,
      unitPrice,
    })
  }

  return items
}

const extractJson = (text: string) => {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  return start >= 0 && end > start ? text.slice(start, end + 1) : null
}

const createExpenseForm = (
  date: string | null,
  items: ReadonlyArray<ExpenseItem>,
  questions: ReadonlyArray<string>,
  overflowCode: ExpenseParseError['code'] = 'invalid-shape',
): ExpenseParseResult => {
  const total = items.reduce((sum, item) => sum + item.amount, 0)
  if (!Number.isSafeInteger(total)) {
    return invalid(overflowCode)
  }

  return {ok: true, value: {date, items, questions, total}}
}

export const parseExpenseAssistantResponse = (text: string): ExpenseParseResult => {
  const json = extractJson(text)
  if (json === null) {
    return invalid('invalid-json')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return invalid('invalid-json')
  }

  if (!isRecord(parsed)) {
    return invalid('invalid-shape')
  }

  const date = readDate(parsed.date)
  const questions = readQuestions(parsed.questions)
  const items = readItems(parsed.items)
  if (parsed.date !== undefined && parsed.date !== null && date === null) {
    return invalid('invalid-shape')
  }
  if (questions === null || items === null) {
    return invalid('invalid-shape')
  }

  return createExpenseForm(date, items, questions)
}

export const parseExpenseText = (text: string): ExpenseParseResult => {
  const lines = text
    .split(/\r?\n/u)
    .map((line) => line.replace(/^\s*[•*-]\s*/u, '').trim())
    .filter((line) => line.length > 0)
  let date: string | null = null
  const items: Array<ExpenseItem> = []

  for (const line of lines) {
    const dateMatch = DATE_LINE_PATTERN.exec(line)
    const dateValue = dateMatch?.groups?.date
    if (dateValue !== undefined && date === null) {
      date = dateValue
    } else {
      const expenseMatch = EXPENSE_LINE_PATTERN.exec(line)
      if (expenseMatch?.groups === undefined) {
        return invalid('invalid-input')
      }

      const unitPrice = toPositiveInteger(expenseMatch.groups.unitPrice)
      const quantity = toPositiveInteger(expenseMatch.groups.quantity ?? '1')
      const name = expenseMatch.groups.name.trim()
      if (unitPrice === null || quantity === null || name.length === 0) {
        return invalid('invalid-input')
      }

      items.push({amount: unitPrice * quantity, name, quantity, unitPrice})
    }
  }

  if (items.length === 0 || items.length > MAXIMUM_ITEMS) {
    return invalid('invalid-input')
  }

  return createExpenseForm(date, items, [], 'invalid-input')
}

export const createExpenseFieldValues = (form: ExpenseForm): ReadonlyArray<ExpenseFieldValue> => {
  const fields: Array<ExpenseFieldValue> = [{name: 'date', value: form.date ?? ''}]

  form.items.forEach((item, index) => {
    const row = index + 1
    fields.push(
      {name: `item_${row}`, value: item.name},
      {name: `unitPrice_${row}`, value: String(item.unitPrice)},
      {name: `quantity_${row}`, value: String(item.quantity)},
      {name: `amount_${row}`, value: String(item.amount)},
    )
  })

  fields.push({name: 'total', value: String(form.total)})
  return fields
}

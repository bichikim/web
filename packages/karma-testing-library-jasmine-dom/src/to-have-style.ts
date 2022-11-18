import cssParse from 'css/lib/parse'
import {checkHtmlElement, getTag, InvalidCSSError} from './utils'
import {printError, printSecError, printSecSuccess, printSuccess} from './printers'

function parseCSS(css, ...args: any) {
  const ast = cssParse(`selector { ${css} }`, {
    silent: true,
  }).stylesheet
  if (ast.parsingErrors && ast.parsingErrors.length > 0) {
    // eslint-disable-next-line prefer-destructuring
    const {reason, line} = ast.parsingErrors[0]
    throw new InvalidCSSError(
      {
        css,
        message: printSecError(
          `Syntax error parsing expected styles: ${reason} on ${printError(`line ${line}`)}`,
        ),
      },
      ...args,
    )
  }
  const parsedRules = Object.fromEntries(
    ast.rules[0].declarations
      .filter((declaration) => declaration.type === 'declaration')
      .map(({property, value}) => [property, value]),
  )
  return parsedRules
}

function parseJStoCSS(document, styles) {
  const sandboxElement = document.createElement('div')
  Object.assign(sandboxElement.style, styles)
  return sandboxElement.style.cssText
}

function getStyleDeclaration(document, css) {
  const styles = {}

  // The next block is necessary to normalize colors
  const copy = document.createElement('div')
  Object.keys(css).forEach((prop) => {
    copy.style[prop] = css[prop]
    styles[prop] = copy.style[prop]
  })

  return styles
}

function styleIsSubset(styles, computedStyle) {
  return (
    Object.keys(styles).length > 0 &&
    Object.entries(styles).every(
      ([prop, value]) =>
        computedStyle[prop] === value ||
        computedStyle.getPropertyValue(prop.toLowerCase()) === value,
    )
  )
}

function getCSStoParse(document, styles) {
  return typeof styles === 'object' ? parseJStoCSS(document, styles) : styles
}

function printoutStyles(styles) {
  return Object.keys(styles)
    .sort()
    .map((prop) => `${prop}: ${styles[prop]};`)
    .join('\n')
}

function expectedStyleDiff(expected, computedStyles) {
  const received = Object.fromEntries(
    [...computedStyles]
      .filter((prop) => expected[prop] !== undefined)
      .map((prop) => [prop, computedStyles.getPropertyValue(prop)]),
  )
  const receivedOutput = printoutStyles(received)
  return receivedOutput
}

export function toHaveStyle() {
  return {
    compare: function (htmlElement, styles) {
      checkHtmlElement(htmlElement)
      const result: any = {}
      const cssToParse = getCSStoParse(htmlElement.ownerDocument, styles)
      const parsedCSS = parseCSS(cssToParse)
      const {getComputedStyle} = htmlElement.ownerDocument.defaultView
      const expected = getStyleDeclaration(htmlElement.ownerDocument, parsedCSS)
      const received = getComputedStyle(htmlElement)
      result.pass = styleIsSubset(expected, received)
      result.message = result.pass
        ? `${printSuccess('PASSED')} ${printSecSuccess(
            `Expected the provided ${printSuccess(
              getTag(htmlElement),
            )} element to have styles:\n${printSuccess(styles)}\nReceived:\n\n${printSuccess(
              expectedStyleDiff(expected, received),
            )}`,
          )}`
        : `${printError('FAILED')} ${printSecError(
            `Expected the provided ${printError(
              getTag(htmlElement),
            )} element to have styles:\n${printError(styles)}\nReceived:\n\n${printError(
              expectedStyleDiff(expected, received),
            )}`,
          )}`
      return result
    },
    negativeCompare: function (htmlElement, styles) {
      checkHtmlElement(htmlElement)
      const result: any = {}
      const cssToParse = getCSStoParse(htmlElement.ownerDocument, styles)
      const parsedCSS = parseCSS(cssToParse)
      const {getComputedStyle} = htmlElement.ownerDocument.defaultView
      const expected = getStyleDeclaration(htmlElement.ownerDocument, parsedCSS)
      const received = getComputedStyle(htmlElement)
      result.pass = !styleIsSubset(expected, received)
      result.message = result.pass
        ? `${printSuccess('PASSED')} ${printSecSuccess(
            `Expected the provided ${printSuccess(
              getTag(htmlElement),
            )} element not to have styles:\n${printSuccess(styles)}\nReceived:\n\n${printSuccess(
              expectedStyleDiff(expected, received),
            )}`,
          )}`
        : `${printError('FAILED')} ${printSecError(
            `Expected the provided ${printError(
              getTag(htmlElement),
            )} element not to have styles:\n${printError(styles)}\nReceived:\n\n${printError(
              expectedStyleDiff(expected, received),
            )}`,
          )}`
      return result
    },
  }
}

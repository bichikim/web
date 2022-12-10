/* eslint-disable max-classes-per-file */
import {isEqual, isEqualWith, uniq} from '@winter-love/lodash'
import cssEscape from 'css.escape'
import {printError, printSecError, printSecWarning, printWarning} from './printers'

class HtmlElementTypeError extends Error {
  constructor(htmlElement) {
    super()
    this.message = `${printError('FAILED')} ${printSecWarning(
      `Received element must be an HTMLElement or an SVGElement.\nReceived: ${printWarning(
        htmlElement,
      )}`,
    )}`
  }
}

class InvalidCSSError extends Error {
  constructor(received, ...args: any) {
    super()
    this.message = [
      received.message,
      '',
      printSecError(`Failing CSS:`),
      printError(received.css),
    ].join('\n')
  }
}

function checkHasWindow(htmlElement, ...args) {
  if (!htmlElement || !htmlElement.ownerDocument || !htmlElement.ownerDocument.defaultView) {
    throw new HtmlElementTypeError(htmlElement)
  }
}

function checkHtmlElement(htmlElement, ...args) {
  checkHasWindow(htmlElement, ...args)
  const window = htmlElement.ownerDocument.defaultView
  if (!(htmlElement instanceof window.HTMLElement) && !(htmlElement instanceof window.SVGElement)) {
    throw new HtmlElementTypeError(htmlElement)
  }
}

function normalize(text) {
  return text.replace(/\s+/gu, ' ').trim()
}

function matches(textToMatch, matcher) {
  if (matcher instanceof RegExp) {
    return matcher.test(textToMatch)
  }
  return textToMatch.includes(String(matcher))
}

function getTag(htmlElement) {
  return htmlElement === null ? null : htmlElement.tagName && htmlElement.tagName.toLowerCase()
}

function getInputValue(inputElement) {
  switch (inputElement.type) {
    case 'number': {
      return inputElement.value === '' ? null : Number(inputElement.value)
    }

    case 'checkbox': {
      return inputElement.checked
    }

    default: {
      return inputElement.value
    }
  }
}

function getSelectValue({multiple, options}) {
  const selectedOptions = [...options].filter((option) => option.selected)
  if (multiple) {
    return [...selectedOptions].map((option) => option.value)
  }
  if (selectedOptions.length === 0) {
    return
  }
  return selectedOptions[0].value
}

function getSingleElementValue(htmlElement) {
  if (!htmlElement) {
    return
  }

  switch (htmlElement.tagName.toLowerCase()) {
    case 'input': {
      return getInputValue(htmlElement)
    }

    case 'select': {
      return getSelectValue(htmlElement)
    }

    default: {
      return htmlElement.value
    }
  }
}

function compareArraysAsSet(aItem, bItem) {
  if (Array.isArray(aItem) && Array.isArray(bItem)) {
    return isEqual(new Set(aItem), new Set(bItem))
  }
}

function toSentence(array, {wordConnector = ', ', lastWordConnector = ' and '} = {}) {
  return [array.slice(0, -1).join(wordConnector), array[array.length - 1]].join(
    array.length > 1 ? lastWordConnector : '',
  )
}

export {
  checkHasWindow,
  checkHtmlElement,
  HtmlElementTypeError,
  InvalidCSSError,
  normalize,
  matches,
  getTag,
  getSingleElementValue,
  compareArraysAsSet,
  isEqualWith,
  cssEscape,
  uniq,
  toSentence,
}

let _clipboard = ''

export const setClipboard = (value: string) => {
  _clipboard = value
}

export const Clipboard = {
  read: jest.fn(() => Promise.resolve(_clipboard)),
  write: jest.fn(),
}

export const ILLEGAL_ESCAPE_SEQUENCE_ERROR =
    'You have illegal escape sequence in your template literal, most likely inside content\'s' +
  ' property value.\n Because you write your CSS inside a JavaScript string you actually have to' +
  ' do double escaping, so for example "content: \'\\00d7\';" should become "content: \'\\\\00d7\';' +
  ' You can read more about this here:\n' +
  'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/' +
  'Template_literals#ES2018_revision_of_illegal_escape_sequences'

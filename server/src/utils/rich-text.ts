import sanitizeHtml from 'sanitize-html';
import { AppData } from '../../../client/src/app/core/models/tracker';
export function cleanRichText(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [
      'p',
      'br',
      'h1',
      'h2',
      'h3',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'ul',
      'ol',
      'li',
      'blockquote',
      'pre',
      'code',
      'a',
      'label',
      'input',
      'span',
      'div',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      ul: ['data-type'],
      li: ['data-type', 'data-checked'],
      input: ['type', 'checked', 'disabled'],
      label: ['contenteditable'],
    },
    allowedSchemes: ['http', 'https'],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer' },
      }),
      input: (tagName, attribs) => ({
        tagName,
        attribs: {
          type: 'checkbox',
          disabled: '',
          ...(attribs.checked !== undefined ? { checked: '' } : {}),
        },
      }),
    },
  });
}
export function sanitizeWorkspaceNotes(data: AppData) {
  for (const note of data.life?.learning ?? [])
    if (note.format === 'html') {
      note.description = cleanRichText(note.description);
      note.notes = cleanRichText(note.notes);
    }
}

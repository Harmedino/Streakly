/** Used only to check for meaningful content, never to render untrusted HTML. */
export function noteHasContent(note: {
  format?: string;
  description: string;
  notes: string;
  topic: string;
}): boolean {
  if (note.format !== 'html')
    return !!(note.description.trim() || note.notes.trim() || note.topic.trim());
  return !![note.description, note.notes]
    .join(' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&(?:nbsp|#160);/g, ' ')
    .trim();
}

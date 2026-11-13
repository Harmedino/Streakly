import { Component, input, computed } from '@angular/core';
const escape = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
function inline(s: string) {
  return escape(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );
}
export function markdown(source: string) {
  let code = false;
  return (
    source
      .split('\n')
      .map((line) => {
        if (line.startsWith('```')) {
          code = !code;
          return code ? '<pre><code>' : '</code></pre>';
        }
        if (code) return escape(line) + '\n';
        const h = line.match(/^(#{1,3}) (.*)/);
        if (h) return `<h${h[1].length + 1}>${inline(h[2])}</h${h[1].length + 1}>`;
        if (/^[-*] \[[ x]\] /.test(line))
          return (
            '<p class="checklist-line">' +
            (line[3] === 'x' ? '☑ ' : '☐ ') +
            inline(line.slice(6)) +
            '</p>'
          );
        if (/^[-*] /.test(line)) return '<p class="list-line">• ' + inline(line.slice(2)) + '</p>';
        if (/^\d+\. /.test(line)) return '<p class="list-line">' + inline(line) + '</p>';
        return line ? '<p>' + inline(line) + '</p>' : '<br />';
      })
      .join('') + (code ? '</code></pre>' : '')
  );
}
@Component({
  selector: 'app-markdown',
  template: `<div class="note-prose" [innerHTML]="html()"></div>`,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .note-prose {
      font-size: 14px;
      line-height: 1.85;
      overflow-wrap: anywhere;
    }
    .note-prose :is(h2, h3, h4) {
      font-size: 17px;
      margin: 20px 0 10px;
    }
    .note-prose p {
      margin: 0 0 10px;
    }
    .note-prose pre {
      padding: 16px;
      background: var(--hover);
      border: 1px solid var(--line);
      border-radius: 7px;
      overflow-x: auto;
      white-space: pre;
      max-width: 100%;
    }
    .note-prose code {
      font-family: monospace;
      font-size: 12px;
    }
    .note-prose .list-line,
    .note-prose .checklist-line {
      margin: 3px 0;
    }
  `,
})
export class Markdown {
  content = input('');
  html = computed(() => markdown(this.content()));
}

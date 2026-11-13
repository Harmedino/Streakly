import { Component, ViewEncapsulation, computed, input } from '@angular/core';
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
  encapsulation: ViewEncapsulation.None,
  templateUrl: './markdown.component.html',
  styleUrl: './markdown.component.scss',
})
export class Markdown {
  content = input('');
  format = input<'markdown' | 'html'>('markdown');
  html = computed(() => (this.format() === 'html' ? this.content() : markdown(this.content())));
}

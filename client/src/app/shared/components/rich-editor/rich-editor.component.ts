import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewEncapsulation,
  forwardRef,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Editor } from '@tiptap/core';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import StarterKit from '@tiptap/starter-kit';
@Component({
  selector: 'app-rich-editor',
  imports: [FormsModule],
  templateUrl: './rich-editor.component.html',
  styleUrl: './rich-editor.component.scss',
  encapsulation: ViewEncapsulation.None,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RichEditor), multi: true },
  ],
})
export class RichEditor implements AfterViewInit, OnDestroy, ControlValueAccessor {
  label = input('Note content');
  placeholder = input('Start writing…');
  mount = viewChild.required<ElementRef<HTMLElement>>('mount');
  editor?: Editor;
  revision = signal(0);
  empty = signal(true);
  showLink = signal(false);
  link = '';
  linkError = signal('');
  private content = '';
  private disabled = false;
  private change: (html: string) => void = () => {};
  private touch: () => void = () => {};
  tools = [
    { command: 'heading', label: 'Heading', text: 'H2' },
    { command: 'bold', label: 'Bold', text: 'B' },
    { command: 'italic', label: 'Italic', text: 'I' },
    { command: 'bulletList', label: 'Bullet list', text: '• List' },
    { command: 'orderedList', label: 'Numbered list', text: '1. List' },
    { command: 'taskList', label: 'Checklist', text: '☑' },
    { command: 'code', label: 'Inline code', text: '`' },
    { command: 'codeBlock', label: 'Code block', text: '</>' },
    { command: 'blockquote', label: 'Quote', text: '❝' },
  ];
  ngAfterViewInit() {
    this.editor = new Editor({
      element: this.mount().nativeElement,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          link: {
            openOnClick: false,
            HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
            protocols: ['http', 'https'],
            isAllowedUri: (url) => /^https?:\/\//i.test(url),
          },
        }),
        TaskList,
        TaskItem.configure({ nested: true }),
      ],
      content: this.content,
      editable: !this.disabled,
      editorProps: {
        attributes: {
          role: 'textbox',
          'aria-label': this.label(),
          'aria-multiline': 'true',
          'data-placeholder': this.placeholder(),
        },
      },
      onUpdate: ({ editor }) => {
        this.empty.set(editor.isEmpty);
        this.content = editor.isEmpty ? '' : editor.getHTML();
        this.change(this.content);
        this.revision.update((n) => n + 1);
      },
      onSelectionUpdate: () => this.revision.update((n) => n + 1),
      onBlur: () => this.touch(),
    });
  }
  active(command: string) {
    this.revision();
    return this.editor?.isActive(command) ?? false;
  }
  format(command: string) {
    const chain = this.editor?.chain().focus();
    if (!chain) return;
    switch (command) {
      case 'heading':
        chain.toggleHeading({ level: 2 }).run();
        break;
      case 'bold':
        chain.toggleBold().run();
        break;
      case 'italic':
        chain.toggleItalic().run();
        break;
      case 'bulletList':
        chain.toggleBulletList().run();
        break;
      case 'orderedList':
        chain.toggleOrderedList().run();
        break;
      case 'taskList':
        chain.toggleTaskList().run();
        break;
      case 'code':
        chain.toggleCode().run();
        break;
      case 'codeBlock':
        chain.toggleCodeBlock().run();
        break;
      case 'blockquote':
        chain.toggleBlockquote().run();
    }
    this.revision.update((n) => n + 1);
  }
  addLink() {
    if (!/^https?:\/\/\S+$/i.test(this.link)) {
      this.linkError.set('Use an http:// or https:// link.');
      return;
    }
    this.editor?.chain().focus().extendMarkRange('link').setLink({ href: this.link }).run();
    this.showLink.set(false);
    this.linkError.set('');
    this.link = '';
  }
  removeLink() {
    this.editor?.chain().focus().unsetLink().run();
    this.showLink.set(false);
  }
  writeValue(value: string | null) {
    this.content = value ?? '';
    this.empty.set(!this.content.replace(/<[^>]*>/g, '').trim());
    if (this.editor && this.editor.getHTML() !== this.content)
      this.editor.commands.setContent(this.content, { emitUpdate: false });
  }
  registerOnChange(fn: (value: string) => void) {
    this.change = fn;
  }
  registerOnTouched(fn: () => void) {
    this.touch = fn;
  }
  setDisabledState(disabled: boolean) {
    this.disabled = disabled;
    this.editor?.setEditable(!disabled);
  }
  ngOnDestroy() {
    this.editor?.destroy();
  }
}

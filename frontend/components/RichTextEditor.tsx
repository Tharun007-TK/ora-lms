'use client';

import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  type LucideIcon,
  Quote,
  RemoveFormatting,
  Strikethrough,
  Underline as UnderlineIcon,
} from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';

import { sanitizeHtml } from '@/lib/html';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  id?: string;
  ariaLabel?: string;
}

interface ToolDef {
  key: string;
  label: string;
  icon: LucideIcon;
  command: string;
  arg?: string;
}

const TOOLS: ToolDef[] = [
  { key: 'bold', label: 'Bold', icon: Bold, command: 'bold' },
  { key: 'italic', label: 'Italic', icon: Italic, command: 'italic' },
  { key: 'underline', label: 'Underline', icon: UnderlineIcon, command: 'underline' },
  { key: 'strike', label: 'Strikethrough', icon: Strikethrough, command: 'strikeThrough' },
  { key: 'h2', label: 'Heading 2', icon: Heading2, command: 'formatBlock', arg: 'H2' },
  { key: 'h3', label: 'Heading 3', icon: Heading3, command: 'formatBlock', arg: 'H3' },
  { key: 'ul', label: 'Bulleted list', icon: List, command: 'insertUnorderedList' },
  { key: 'ol', label: 'Numbered list', icon: ListOrdered, command: 'insertOrderedList' },
  { key: 'quote', label: 'Quote', icon: Quote, command: 'formatBlock', arg: 'BLOCKQUOTE' },
  { key: 'code', label: 'Code block', icon: Code, command: 'formatBlock', arg: 'PRE' },
];

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 240,
  id,
  ariaLabel,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const lastEmitted = useRef<string>('');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (value !== lastEmitted.current) {
      el.innerHTML = value || '';
      lastEmitted.current = value || '';
    }
  }, [value]);

  const emit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const html = sanitizeHtml(el.innerHTML);
    lastEmitted.current = html;
    onChange(html);
  }, [onChange]);

  const exec = (cmd: string, arg?: string) => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    document.execCommand(cmd, false, arg);
    emit();
  };

  const insertLink = () => {
    const url = window.prompt('Link URL', 'https://');
    if (!url) return;
    if (!/^(https?:|mailto:|\/|#)/i.test(url)) {
      window.alert('Only http(s), mailto, /relative or #anchor links allowed.');
      return;
    }
    exec('createLink', url);
  };

  const clearFormatting = () => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    document.execCommand('removeFormat');
    document.execCommand('formatBlock', false, 'P');
    emit();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    emit();
  };

  const isEmpty = !value || value === '<br>' || value === '<p></p>';

  return (
    <div className="rounded-md border-hair bg-[var(--surface-raised)] focus-within:ring-2 focus-within:ring-[var(--ember)]/40">
      <div
        role="toolbar"
        aria-label="Formatting"
        className="flex flex-wrap items-center gap-0.5 border-b-hair px-2 py-1.5"
      >
        {TOOLS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              title={t.label}
              aria-label={t.label}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec(t.command, t.arg)}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
            >
              <Icon size={14} />
            </button>
          );
        })}
        <div className="mx-1 h-5 w-px bg-[var(--border-hair)]" aria-hidden />
        <button
          type="button"
          title="Insert link"
          aria-label="Insert link"
          onMouseDown={(e) => e.preventDefault()}
          onClick={insertLink}
          className="inline-flex h-7 w-7 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
        >
          <LinkIcon size={14} />
        </button>
        <button
          type="button"
          title="Clear formatting"
          aria-label="Clear formatting"
          onMouseDown={(e) => e.preventDefault()}
          onClick={clearFormatting}
          className="inline-flex h-7 w-7 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
        >
          <RemoveFormatting size={14} />
        </button>
      </div>
      <div className="relative">
        {isEmpty && placeholder && (
          <div
            aria-hidden
            className="pointer-events-none absolute left-3 top-2 t-body text-[var(--text-muted)]"
          >
            {placeholder}
          </div>
        )}
        <div
          id={id}
          ref={ref}
          role="textbox"
          aria-multiline="true"
          aria-label={ariaLabel}
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onBlur={emit}
          onPaste={handlePaste}
          spellCheck
          className="rich-text-content w-full px-3 py-2 t-body focus:outline-none"
          style={{ minHeight }}
        />
      </div>
    </div>
  );
}

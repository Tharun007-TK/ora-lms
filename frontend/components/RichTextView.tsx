'use client';

import { useMemo } from 'react';

import { isHtml, sanitizeHtml } from '@/lib/html';

interface Props {
  html: string;
  className?: string;
}

export function RichTextView({ html, className }: Props) {
  const safe = useMemo(() => (isHtml(html) ? sanitizeHtml(html) : ''), [html]);
  if (!html) return null;
  if (safe) {
    return (
      <div
        className={`rich-text-content ${className ?? ''}`}
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    );
  }
  return <div className={`whitespace-pre-wrap ${className ?? ''}`}>{html}</div>;
}

const ALLOWED_TAGS = new Set([
  'P',
  'BR',
  'STRONG',
  'B',
  'EM',
  'I',
  'U',
  'S',
  'STRIKE',
  'H2',
  'H3',
  'UL',
  'OL',
  'LI',
  'CODE',
  'PRE',
  'BLOCKQUOTE',
  'A',
  'SPAN',
  'DIV',
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  A: new Set(['href', 'title', 'rel', 'target']),
};

const URL_SAFE = /^(https?:|mailto:|\/|#)/i;

function cleanNode(node: Element): void {
  const children = Array.from(node.children);
  for (const child of children) {
    if (!ALLOWED_TAGS.has(child.tagName)) {
      const text = child.ownerDocument.createTextNode(child.textContent || '');
      child.replaceWith(text);
      continue;
    }
    const allowed = ALLOWED_ATTRS[child.tagName] || new Set<string>();
    for (const attr of Array.from(child.attributes)) {
      if (!allowed.has(attr.name.toLowerCase())) {
        child.removeAttribute(attr.name);
        continue;
      }
      if (attr.name.toLowerCase() === 'href' && !URL_SAFE.test(attr.value)) {
        child.removeAttribute('href');
      }
    }
    if (child.tagName === 'A') {
      child.setAttribute('rel', 'noopener noreferrer nofollow');
      child.setAttribute('target', '_blank');
    }
    cleanNode(child);
  }
}

export function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined' || !html) return '';
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild as Element | null;
  if (!root) return '';
  cleanNode(root);
  return root.innerHTML;
}

export function isHtml(value: string): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed.startsWith('<') && /<\/?[a-z][\s\S]*>/i.test(trimmed);
}

import Link from 'next/link';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ora';
import { fileUrl, type LibraryBook } from '@/lib/api';

export function BookCard({
  book,
  href,
  footer,
}: {
  book: LibraryBook;
  href: string;
  footer?: React.ReactNode;
}) {
  const cover = fileUrl(book.cover_url);
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="aspect-[3/4] w-full overflow-hidden bg-[var(--surface-sunken)]">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={book.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="hatch flex h-full w-full items-center justify-center p-4 text-center t-caption">
            No cover
          </div>
        )}
      </div>
      <CardHeader className="space-y-1">
        {book.category && (
          <span className="w-fit rounded bg-[var(--surface-sunken)] px-2 py-0.5 t-caption font-medium text-[var(--text-secondary)]">
            {book.category}
          </span>
        )}
        <CardTitle className="t-h3 leading-tight">
          <Link
            href={href}
            className="hover:text-[var(--ember)] transition-colors focus-ora rounded"
          >
            {book.title}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 t-body text-[var(--text-secondary)]">
        by {book.author}
      </CardContent>
      {footer && <CardFooter className="justify-end">{footer}</CardFooter>}
    </Card>
  );
}

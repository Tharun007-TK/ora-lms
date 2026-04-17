import Link from 'next/link';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
      <div className="aspect-[3/4] w-full overflow-hidden bg-muted">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={book.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-4 text-center text-xs text-muted-foreground">
            No cover
          </div>
        )}
      </div>
      <CardHeader className="space-y-1">
        {book.category && (
          <span className="w-fit rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
            {book.category}
          </span>
        )}
        <CardTitle className="text-base leading-tight">
          <Link href={href} className="hover:underline">
            {book.title}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 text-sm text-muted-foreground">
        by {book.author}
      </CardContent>
      {footer && <CardFooter className="justify-end">{footer}</CardFooter>}
    </Card>
  );
}

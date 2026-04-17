import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">
        The page you’re looking for doesn’t exist.
      </p>
      <Button asChild>
        <Link href="/">Back to Ora</Link>
      </Button>
    </div>
  );
}

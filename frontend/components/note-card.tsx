import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { fileUrl, type Note } from '@/lib/api';

export function NoteCard({
  note,
  canDelete,
  onDelete,
}: {
  note: Note;
  canDelete?: boolean;
  onDelete?: () => void;
}) {
  const url = fileUrl(note.file_url);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{note.title}</CardTitle>
          {note.ai_generated && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              AI
            </span>
          )}
        </div>
        <CardDescription>
          {new Date(note.created_at).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {note.content && (
          <div className="whitespace-pre-wrap text-muted-foreground">
            {note.content}
          </div>
        )}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-primary hover:underline"
          >
            Open attachment ↗
          </a>
        )}
        {canDelete && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="text-xs text-destructive hover:underline"
          >
            Delete
          </button>
        )}
      </CardContent>
    </Card>
  );
}

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ora';
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
          <CardTitle>{note.title}</CardTitle>
          {note.ai_generated && (
            <span
              className="rounded-full px-2 py-0.5 t-caption font-medium text-[var(--ember)]"
              style={{ backgroundColor: 'rgba(216, 90, 48, 0.1)' }}
            >
              AI
            </span>
          )}
        </div>
        <CardDescription>
          {new Date(note.created_at).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {note.content && (
          <div className="whitespace-pre-wrap t-body text-[var(--text-secondary)]">
            {note.content}
          </div>
        )}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="t-body-sm font-medium text-[var(--ember)] hover:underline focus-ora rounded"
          >
            Open attachment ↗
          </a>
        )}
        {canDelete && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="t-caption text-[var(--danger-fg)] hover:underline focus-ora rounded"
          >
            Delete
          </button>
        )}
      </CardContent>
    </Card>
  );
}

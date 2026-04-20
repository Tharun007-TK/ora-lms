'use client';

import Link from 'next/link';
import { useState } from 'react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from '@/components/ora';
import { users, type StudentImportResult } from '@/lib/api';

export default function ImportStudentsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<StudentImportResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const r = await users.importStudents(file);
      setResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-1">
        <Link
          href="/admin/users"
          className="text-xs text-[var(--text-secondary)] hover:underline"
        >
          ← Back to Users
        </Link>
        <h1 className="text-2xl font-semibold">Import students from CSV</h1>
        <p className="t-body text-[var(--text-secondary)]">
          Bulk-create student accounts. Each row creates one student who can sign in immediately.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">CSV format</CardTitle>
          <CardDescription>
            Header row required. Columns:
            <code className="ml-1 rounded bg-[var(--surface-sunken)] px-1 py-0.5 font-mono text-xs">
              email,name,department_code,password
            </code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="ml-4 list-disc t-body-sm text-[var(--text-secondary)]">
            <li>
              <strong>email</strong> (required) — must end with{' '}
              <code className="font-mono">@mcet.in</code>
            </li>
            <li>
              <strong>name</strong> (optional) — defaults to the email local part
            </li>
            <li>
              <strong>department_code</strong> (optional) — e.g. <code>CSE</code>,{' '}
              <code>ECE</code>, <code>MECH</code>
            </li>
            <li>
              <strong>password</strong> (optional) — a 12-char random password is generated when blank and shown to you once below
            </li>
          </ul>
          <pre className="overflow-auto rounded-md border-hair bg-[var(--surface-sunken)] p-3 font-mono text-xs">
{`email,name,department_code,password
727622bam100@mcet.in,Test Student A,CSE,
727622bam101@mcet.in,Test Student B,ECE,Spec1fic!
727622bam102@mcet.in,Test Student C,,`}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setResult(null);
            }}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-hair file:bg-[var(--surface-sunken)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--text-primary)]"
          />
          {error && <p className="t-caption text-[var(--danger-fg)]">{error}</p>}
          <div className="flex justify-end">
            <Button
              onClick={submit}
              disabled={!file || uploading}
              loading={uploading}
            >
              {uploading ? 'Uploading…' : 'Import students'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Import result</CardTitle>
              <div className="flex items-center gap-2">
                <Badge tone="success">{result.created} created</Badge>
                <Badge tone="warning">{result.skipped} skipped</Badge>
                <Badge tone="neutral">{result.total} total</Badge>
              </div>
            </div>
            <CardDescription>
              Generated passwords are shown only here. Save them now — they cannot be recovered.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Line</TH>
                  <TH>Email</TH>
                  <TH>Status</TH>
                  <TH>Password</TH>
                  <TH>Detail</TH>
                </TR>
              </THead>
              <TBody>
                {result.rows.map((r) => (
                  <TR key={r.line}>
                    <TD className="text-[var(--text-muted)]">{r.line}</TD>
                    <TD className="font-mono text-xs">{r.email}</TD>
                    <TD>
                      <Badge
                        tone={
                          r.status === 'created'
                            ? 'success'
                            : r.status === 'exists'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {r.status}
                      </Badge>
                    </TD>
                    <TD className="font-mono text-xs">
                      {r.generated_password ?? '—'}
                    </TD>
                    <TD className="text-[var(--text-secondary)]">
                      {r.detail ?? ''}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

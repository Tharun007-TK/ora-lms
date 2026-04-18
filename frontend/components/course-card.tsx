import Link from 'next/link';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ora';
import type { Course } from '@/lib/api';

export function CourseCard({
  course,
  href,
  footer,
}: {
  course: Course;
  href: string;
  footer?: React.ReactNode;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <span className="rounded bg-[var(--surface-sunken)] px-2 py-0.5 t-caption font-medium text-[var(--text-secondary)]">
            {course.code}
          </span>
          {course.semester && (
            <span className="t-caption">{course.semester}</span>
          )}
        </div>
        <CardTitle className="mt-2">
          <Link
            href={href}
            className="hover:text-[var(--ember)] transition-colors focus-ora rounded"
          >
            {course.title}
          </Link>
        </CardTitle>
        {course.faculty_name && (
          <CardDescription>Faculty: {course.faculty_name}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1 t-body text-[var(--text-secondary)]">
        {course.description || 'No description provided yet.'}
      </CardContent>
      {(footer || course.enrollment_count != null) && (
        <CardFooter className="flex items-center justify-between t-caption">
          {course.enrollment_count != null && (
            <span>{course.enrollment_count} enrolled</span>
          )}
          {footer}
        </CardFooter>
      )}
    </Card>
  );
}

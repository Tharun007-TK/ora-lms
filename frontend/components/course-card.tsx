import Link from 'next/link';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
          <span className="rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
            {course.code}
          </span>
          {course.semester && (
            <span className="text-xs text-muted-foreground">{course.semester}</span>
          )}
        </div>
        <CardTitle className="mt-2">
          <Link href={href} className="hover:underline">
            {course.title}
          </Link>
        </CardTitle>
        {course.faculty_name && (
          <CardDescription>Faculty: {course.faculty_name}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1 text-sm text-muted-foreground">
        {course.description || 'No description provided yet.'}
      </CardContent>
      {(footer || course.enrollment_count != null) && (
        <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
          {course.enrollment_count != null && (
            <span>{course.enrollment_count} enrolled</span>
          )}
          {footer}
        </CardFooter>
      )}
    </Card>
  );
}

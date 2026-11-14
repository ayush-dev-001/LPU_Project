import type { Metadata } from "next";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { NameForm, PasswordForm } from "./profile-forms";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const details = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      createdAt: true,
      _count: { select: { memberships: true, managedProjects: true, assignedTasks: true } },
    },
  });

  return (
    <>
      <PageHeader title="Your profile" description="Update your name and password." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Account" />
          <CardBody>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd className="font-medium">{user.email}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Role</dt>
                <dd className="mt-0.5">
                  <StatusBadge value={user.role} />
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Member since</dt>
                <dd className="font-medium">{formatDate(details.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Projects</dt>
                <dd className="font-medium">
                  {details._count.managedProjects} managed · {details._count.memberships} as member
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Tasks assigned</dt>
                <dd className="font-medium">{details._count.assignedTasks}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-slate-500">To change your email or role, ask an admin.</p>
          </CardBody>
        </Card>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader title="Name" description="Shown to your team on tasks and updates." />
            <CardBody>
              <NameForm name={user.name} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Password" />
            <CardBody>
              <PasswordForm />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

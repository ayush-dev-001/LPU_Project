import type { Metadata } from "next";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { AddUserForm } from "./add-user-form";
import { ResetPasswordButton } from "./reset-password-button";
import { UserRowForm } from "./user-row-form";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const me = await requireRole("ADMIN");
  const users = await db.user.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });

  return (
    <>
      <PageHeader title="Users" description="Add people, set their role, or reset a forgotten password." />

      <Card className="mb-6">
        <CardHeader
          title="Add a user"
          description="Creates the account with a temporary password for you to share. People can also sign up themselves as members."
        />
        <CardBody>
          <AddUserForm />
        </CardBody>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Joined</th>
              <th className="px-5 py-3 font-medium">Role & status</th>
              <th className="px-5 py-3 font-medium">
                <span className="sr-only">Password</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className={u.isActive ? "align-top" : "bg-slate-50 align-top text-slate-500"}>
                <td className="px-5 py-3 font-medium">{u.name}</td>
                <td className="px-5 py-3">{u.email}</td>
                <td className="whitespace-nowrap px-5 py-3">{formatDate(u.createdAt)}</td>
                <td className="px-5 py-3">
                  <UserRowForm userId={u.id} role={u.role} isActive={u.isActive} isSelf={u.id === me.id} />
                </td>
                <td className="px-5 py-3">
                  {u.id === me.id ? null : <ResetPasswordButton userId={u.id} name={u.name} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

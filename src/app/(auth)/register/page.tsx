import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="anim-text-rise text-2xl font-bold tracking-tight text-slate-900">
        Create your account
      </h1>
      <p className="anim-text-rise mt-2 text-sm text-slate-500 [animation-delay:120ms]">
        New accounts start as team members. An admin can change your role.
      </p>

      <div className="mt-7">
        <RegisterForm />
      </div>

      <p className="mt-7 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-slate-900 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}

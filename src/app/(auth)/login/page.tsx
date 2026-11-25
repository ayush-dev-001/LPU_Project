import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="anim-text-rise text-2xl font-bold tracking-tight text-slate-900">
        WELCOME BACK !
      </h1>
      <p className="anim-text-rise mt-2 text-sm text-slate-500 [animation-delay:120ms]">
        Sign in to monitor your projects.
      </p>

      <div className="mt-8">
        <LoginForm />
      </div>

      <p className="mt-8 text-center text-sm text-slate-500">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-semibold text-slate-900 hover:underline"
        >
          Sign up
        </Link>
      </p>
    </>
  );
}

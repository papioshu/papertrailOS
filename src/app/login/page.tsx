import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

async function authenticate(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  try {
    await signIn("credentials", { email, password, redirectTo: "/select" });
  } catch (error) {
    if (error instanceof AuthError) redirect("/login?error=1");
    throw error; // redirect() control-flow and others
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm tt-card tt-scan tt-glow p-7">
        <div className="mb-6">
          <div className="tt-label">Papertrail OS</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted">Track. Connect. Remember.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-signal/40 bg-signal/10 px-3 py-2 text-sm text-signal">
            Invalid email or password.
          </div>
        )}

        <form action={authenticate} className="space-y-4">
          <label className="block">
            <span className="tt-label">Email or username</span>
            <input
              name="email"
              type="text"
              required
              autoComplete="username"
              className="mt-1 w-full rounded-md border border-line bg-ink-2 px-3 py-2 text-sm outline-none focus:border-violet"
            />
          </label>
          <label className="block">
            <span className="tt-label">Password</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-md border border-line bg-ink-2 px-3 py-2 text-sm outline-none focus:border-violet"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-md bg-violet px-3 py-2 text-sm font-medium text-white transition hover:brightness-110"
          >
            Enter
          </button>
        </form>
      </div>
    </main>
  );
}

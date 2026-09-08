import { auth, signIn, signOut } from "@/lib/auth";
import { isAllowlistedLogin } from "@/lib/auth";

export async function AuthControls() {
  const session = await auth();
  const login = (session?.user as { login?: string } | undefined)?.login;
  const allowed = isAllowlistedLogin(login);

  if (session?.user && allowed) {
    return (
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
        className="flex items-center gap-3 text-sm"
      >
        <span className="text-scripture/70">
          Writer: {login ?? session.user.name}
        </span>
        <button
          type="submit"
          className="underline decoration-note-rule underline-offset-2 hover:text-note-ink"
        >
          Sign out
        </button>
      </form>
    );
  }

  return (
    <form
      action={async () => {
        "use server";
        await signIn("github");
      }}
    >
      <button
        type="submit"
        className="text-sm underline decoration-note-rule underline-offset-2 hover:text-note-ink"
      >
        Sign in with GitHub (writers)
      </button>
    </form>
  );
}

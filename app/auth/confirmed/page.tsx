import Image from "next/image";
import { LinkButton } from "@/components/ui/button";

export default function ConfirmedPage() {
  return (
    <main className="w-full max-w-md px-4 py-16 sm:px-6">
      <div className="border border-[var(--color-line)] bg-[var(--color-paper)] p-8 text-center sm:p-10">
        <Image
          src="/logo-mark.png"
          alt="Job News SA"
          width={455}
          height={450}
          className="mx-auto mb-5 h-10 w-auto"
        />
        <h1 className="font-display text-2xl font-semibold">Email confirmed</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Your account is active. Sign in to start browsing jobs across South
          Africa.
        </p>
        <div className="mt-6">
          <LinkButton href="/auth/login" className="w-full justify-center">
            Sign in to your account
          </LinkButton>
        </div>
      </div>
    </main>
  );
}

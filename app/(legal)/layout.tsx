import Link from "next/link";
import Image from "next/image";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="legal-shell flex min-h-screen flex-col">
      <header className="border-b border-zinc-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link href="/" className="brand">
            <Image
              src="/logo.png"
              alt="PulseAW"
              width={1149}
              height={274}
              sizes="185px"
            />
          </Link>
          <nav className="flex gap-6 text-sm font-medium text-zinc-600">
            <Link href="/" className="hover:text-zinc-900">
              Home
            </Link>
            <Link href="/#services" className="hover:text-zinc-900">
              Services
            </Link>
            <Link href="/#contact" className="hover:text-zinc-900">
              Contact
            </Link>
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-zinc-100 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="text-lg font-bold text-zinc-900">PulseAW</div>
              <p className="mt-1 text-sm text-zinc-500">
                Premium marketing for new entrepreneurs.
              </p>
            </div>
            <div className="flex flex-wrap gap-5 text-sm text-zinc-600">
              <Link href="/terms-of-service" className="hover:text-zinc-900">
                Terms of Service
              </Link>
              <Link href="/privacy-policy" className="hover:text-zinc-900">
                Privacy Policy
              </Link>
              <Link href="/refund-policy" className="hover:text-zinc-900">
                Refund Policy
              </Link>
            </div>
          </div>
          <div className="mt-6 text-xs text-zinc-400">
            © 2026 PulseAW LLC. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

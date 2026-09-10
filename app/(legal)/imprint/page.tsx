import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Imprint | PulseAW",
  description: "Company information and contact details for PulseAW LLC, the operator of pulseaw.com.",
  alternates: { canonical: "https://www.pulseaw.com/imprint" },
};

export default function ImprintPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <p className="eyebrow mb-4">Company information</p>
      <h1 className="mb-4 text-3xl font-bold text-zinc-900">Imprint</h1>
      <p className="mb-8 text-sm text-zinc-500">Legal notice · Last updated: September 10, 2026</p>
      <div className="space-y-6 text-zinc-700 leading-relaxed">
        <p>This website is operated by PulseAW LLC, providing marketing services for new entrepreneurs.</p>
        <section>
          <h2 className="mb-3 text-lg font-bold text-zinc-900">Website operator</h2>
          <p>PulseAW LLC</p>
          <address className="not-italic leading-relaxed">
            3721 Beecher Rd<br />
            Flint, Michigan 48503<br />
            United States
          </address>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-bold text-zinc-900">Contact</h2>
          <p>Email: <a href="mailto:info@pulseaw.com" className="underline">info@pulseaw.com</a></p>
          <p>Phone: <a href="tel:+12513321334" className="underline">+1 (251) 332-1334</a></p>
          <p>Website: <Link href="/" className="underline">www.pulseaw.com</Link></p>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-bold text-zinc-900">Related information</h2>
          <p>For information about our services, personal data and refunds, please see our <Link href="/terms-of-service" className="underline">Terms of Service</Link>, <Link href="/privacy-policy" className="underline">Privacy Policy</Link> and <Link href="/refund-policy" className="underline">Refund Policy</Link>.</p>
        </section>
      </div>
    </main>
  );
}

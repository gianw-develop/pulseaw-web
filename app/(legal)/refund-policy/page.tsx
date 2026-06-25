import Link from "next/link";

export default function RefundPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="mb-4 text-3xl font-bold text-zinc-900">Refund Policy</h1>
      <p className="mb-8 text-sm text-zinc-500">Last updated: June 2026</p>

      <div className="space-y-6 text-zinc-700 leading-relaxed">
        <p>
          At PulseAW LLC, we stand behind the quality of our work. This Refund Policy explains when you may be eligible for a refund.
        </p>

        <h2 className="text-lg font-bold text-zinc-900">1. Digital Downloads</h2>
        <p>
          All digital downloads (PDFs, templates, guides, checklists) are final sale and <strong>non-refundable</strong> once delivered. Please review the product description carefully before purchasing.
        </p>

        <h2 className="text-lg font-bold text-zinc-900">2. Services & Consulting Sessions</h2>
        <p>
          For service-based purchases (audits, consulting calls, done-for-you work):
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>If work has not yet started, you may request a <strong>full refund</strong> within 48 hours of purchase.</li>
          <li>If work has begun but not been completed, you may request a <strong>partial refund</strong> based on the percentage of work delivered.</li>
          <li>If the deliverable has been fully completed and delivered, no refund will be issued.</li>
        </ul>

        <h2 className="text-lg font-bold text-zinc-900">3. No-Show Policy</h2>
        <p>
          For scheduled consulting calls: if you fail to attend without at least 24 hours notice, the session is considered delivered and is not eligible for a refund.
        </p>

        <h2 className="text-lg font-bold text-zinc-900">4. How to Request a Refund</h2>
        <p>
          Send your request to <Link href="mailto:info@pulseaw.com" className="underline">info@pulseaw.com</Link> with your order confirmation number and reason. We respond within 3 business days.
        </p>

        <h2 className="text-lg font-bold text-zinc-900">5. Disputes</h2>
        <p>
          We aim to resolve all issues fairly. If you are unsatisfied, please contact us before initiating a chargeback with your bank or card issuer.
        </p>

        <h2 className="text-lg font-bold text-zinc-900">6. Exceptions</h2>
        <p>
          Refund policy exceptions may be granted at our sole discretion in extenuating circumstances.
        </p>
      </div>
    </main>
  );
}

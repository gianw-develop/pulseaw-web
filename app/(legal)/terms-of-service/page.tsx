import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="mb-4 text-3xl font-bold text-zinc-900">Terms of Service</h1>
      <p className="mb-8 text-sm text-zinc-500">Last updated: June 2026</p>

      <div className="space-y-6 text-zinc-700 leading-relaxed">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your use of the website and services provided by PulseAW LLC (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By purchasing any service or accessing our website, you agree to these Terms.
        </p>

        <h2 className="text-lg font-bold text-zinc-900">1. Description of Services</h2>
        <p>
          PulseAW LLC provides fixed-price digital marketing deliverables, including but not limited to downloadable templates, audits, consulting sessions, and done-for-you marketing services. Each service has a defined scope and price listed on our website.
        </p>

        <h2 className="text-lg font-bold text-zinc-900">2. Purchases & Payments</h2>
        <p>
          All purchases are processed securely through Stripe. Prices are in USD and are non-negotiable unless otherwise agreed in writing. Payment is due at the time of purchase. You will receive an electronic receipt via email upon successful payment.
        </p>

        <h2 className="text-lg font-bold text-zinc-900">3. Delivery</h2>
        <p>
          Digital downloads are delivered within 24 hours of purchase via email or direct download link. Consulting sessions and done-for-you services begin within 24-48 business hours of purchase, unless otherwise communicated.
        </p>

        <h2 className="text-lg font-bold text-zinc-900">4. Refunds</h2>
        <p>
          Refund policy applies as stated in our separate <Link href="/refund-policy" className="underline">Refund Policy</Link>. In general, digital downloads are not refundable once delivered. Service-based work may be eligible for a full or partial refund depending on delivery status.
        </p>

        <h2 className="text-lg font-bold text-zinc-900">5. Intellectual Property</h2>
        <p>
          All content, templates, and deliverables provided by PulseAW LLC are for your personal or business use only. You may not resell, redistribute, or claim authorship of any deliverable purchased from us.
        </p>

        <h2 className="text-lg font-bold text-zinc-900">6. Limitation of Liability</h2>
        <p>
          PulseAW LLC provides materials and services as-is. We do not guarantee specific results (e.g., revenue increase, traffic growth). To the maximum extent permitted by law, our liability shall not exceed the total amount paid for the service in question.
        </p>

        <h2 className="text-lg font-bold text-zinc-900">7. No Guarantee of Results</h2>
        <p>
          Marketing outcomes depend on external factors. We deliver the agreed scope of work; we do not guarantee performance outcomes like conversions, sales, or search rankings.
        </p>

        <h2 className="text-lg font-bold text-zinc-900">8. Contact</h2>
        <p>
          For questions about these Terms, contact us at <Link href="mailto:info@pulseaw.com" className="underline">info@pulseaw.com</Link>.
        </p>
      </div>
    </main>
  );
}

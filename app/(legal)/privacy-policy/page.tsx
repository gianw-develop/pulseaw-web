import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="mb-4 text-3xl font-bold text-zinc-900">Privacy Policy</h1>
      <p className="mb-8 text-sm text-zinc-500">Last updated: June 2026</p>

      <div className="space-y-6 text-zinc-700 leading-relaxed">
        <p>
          PulseAW LLC (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) respects your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use our website and services.
        </p>

        <h2 className="text-lg font-bold text-zinc-900">1. Information We Collect</h2>
        <p>
          When you use our website or make a purchase, we may collect: your name, email address, billing information (handled by Stripe), and any messages you send through our contact form. We do not store full credit card details on our servers.
        </p>

        <h2 className="text-lg font-bold text-zinc-900">2. How We Use Your Information</h2>
        <p>
          We use your information to:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Process and deliver your purchases.</li>
          <li>Send you receipts, confirmations, and service-related updates.</li>
          <li>Respond to your inquiries.</li>
          <li>Improve our website and service offerings.</li>
        </ul>

        <h2 className="text-lg font-bold text-zinc-900">3. Payment Processing</h2>
        <p>
          All payments are processed by Stripe. We do not store your credit card information. Stripe&apos;s privacy policy governs the data collected during payment.
        </p>

        <h2 className="text-lg font-bold text-zinc-900">4. Cookies & Analytics</h2>
        <p>
          We may use basic analytics tools and cookies to understand how visitors interact with our website. You can disable cookies in your browser settings.
        </p>

        <h2 className="text-lg font-bold text-zinc-900">5. Data Sharing</h2>
        <p>
          We do not sell your personal information. We only share data with service providers necessary to operate our business (e.g., Stripe for payments, email providers for receipts).
        </p>

        <h2 className="text-lg font-bold text-zinc-900">6. Data Security</h2>
        <p>
          We take reasonable measures to protect your data. However, no method of transmission over the internet is 100% secure.
        </p>

        <h2 className="text-lg font-bold text-zinc-900">7. Your Rights</h2>
        <p>
          You may request access, correction, or deletion of your personal data by contacting us at <Link href="mailto:info@pulseaw.com" className="underline">info@pulseaw.com</Link>.
        </p>

        <h2 className="text-lg font-bold text-zinc-900">8. Contact</h2>
        <p>
          PulseAW LLC<br />
          3721 Beecher Rd, Flint, Michigan 48503, United States<br />
          Email: <Link href="mailto:info@pulseaw.com" className="underline">info@pulseaw.com</Link>
        </p>
      </div>
    </main>
  );
}

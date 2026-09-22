import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Payment Submitted | PulseAW",
  robots: { index: false, follow: false },
};

export default function PaymentSuccessPage() {
  return (
    <main className="pay-result-page">
      <section className="pay-result-card">
        <CheckCircle2 size={42} aria-hidden="true" />
        <p className="eyebrow">Payment submitted</p>
        <h1>Thank you.</h1>
        <p>SouthBill will send your payment receipt by email. PulseAW will verify the payment against your agreed scope before issuing the paid invoice document.</p>
        <div className="pay-result-actions">
          <Link className="button" href="/">Return to PulseAW</Link>
          <a href="mailto:info@pulseaw.com">Contact support</a>
        </div>
      </section>
    </main>
  );
}
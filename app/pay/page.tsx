import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import PayForm from "./pay-form";

export const metadata: Metadata = {
  title: "Secure Payment | PulseAW",
  description: "Pay an agreed PulseAW service through SouthBill's secure checkout.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/pay" },
};

export default function PayPage() {
  return (
    <main className="pay-page">
      <div className="pay-shell">
        <header className="pay-header">
          <Link href="/" aria-label="PulseAW home" className="pay-brand">
            <Image src="/logo.png" alt="PulseAW" width={1149} height={274} priority sizes="190px" />
          </Link>
          <span><ShieldCheck size={17} aria-hidden="true" /> Secure payment</span>
        </header>
        <div className="pay-grid">
          <section className="pay-intro" aria-labelledby="pay-title">
            <p className="eyebrow">Complete your payment</p>
            <h1 id="pay-title">Your agreed PulseAW service.</h1>
            <p>Use this page after confirming your service scope and total with PulseAW. Enter the exact whole-dollar amount shown in your agreement.</p>
            <div className="pay-facts" aria-label="Payment details">
              <div><strong>USD</strong><span>Currency</span></div>
              <div><strong>$6–$200</strong><span>Accepted amount</span></div>
              <div><strong>One-time</strong><span>Payment type</span></div>
            </div>
          </section>
          <section className="pay-card" aria-label="Payment information">
            <h2>Your details</h2>
            <p>You will enter your payment details securely in the next step.</p>
            <PayForm />
            <p className="pay-legal">By continuing, you acknowledge our <Link href="/terms-of-service">terms</Link>, <Link href="/privacy-policy">privacy policy</Link> and <Link href="/refund-policy">refund policy</Link>.</p>
          </section>
        </div>
        <footer className="pay-footer">
          <span>© 2026 PulseAW LLC</span>
          <a href="mailto:info@pulseaw.com">info@pulseaw.com</a>
        </footer>
      </div>
    </main>
  );
}
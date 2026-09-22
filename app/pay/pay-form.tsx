"use client";

import { FormEvent, useRef, useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";

type CheckoutResponse = { checkoutUrl?: unknown; error?: unknown };

function newRequestId() {
  return crypto.randomUUID();
}

export default function PayForm() {
  const requestId = useRef<string>(newRequestId());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/southbill/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          amount: Number(form.get("amount")),
          website: form.get("website"),
          requestId: requestId.current,
        }),
      });
      const body = (await response.json()) as CheckoutResponse;
      if (!response.ok || typeof body.checkoutUrl !== "string") throw new Error("CHECKOUT_UNAVAILABLE");
      window.location.assign(body.checkoutUrl);
    } catch {
      setError("We couldn't open the secure checkout. Please try again or contact info@pulseaw.com.");
      setPending(false);
    }
  }

  return (
    <form className="pay-form" onSubmit={submit} aria-describedby={error ? "pay-error" : undefined}>
      <label htmlFor="pay-name">
        Full name
        <input id="pay-name" name="name" autoComplete="name" required minLength={2} maxLength={120} />
      </label>
      <label htmlFor="pay-email">
        Email
        <input id="pay-email" name="email" type="email" inputMode="email" autoComplete="email" required maxLength={254} />
      </label>
      <label htmlFor="pay-amount">
        Amount (USD)
        <input id="pay-amount" name="amount" type="number" inputMode="numeric" required min={6} max={200} step={1} defaultValue={6} />
        <span>Whole-dollar amounts from $6 to $200.</span>
      </label>
      <label className="pay-honeypot" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      {error && <p className="pay-error" id="pay-error" role="alert">{error}</p>}
      <button className="pay-submit" type="submit" disabled={pending}>
        {pending ? "Opening secure checkout…" : "Continue to secure payment"}
        {!pending && <ArrowRight size={18} aria-hidden="true" />}
      </button>
      <p className="pay-security"><LockKeyhole size={15} aria-hidden="true" /> Payment details are entered securely on SouthBill.</p>
    </form>
  );
}
"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Download,
  FileText,
  TrendingUp,
  Shield,
  Clock,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  Camera,
  BarChart3,
  Search,
  Layers,
  PenTool,
  MessageSquare,
  Rocket,
  Globe,
  ArrowRight,
  CheckCircle2,
  Lock,
  CreditCard,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
} from "lucide-react";

const services = [
  { icon: <PenTool className="h-5 w-5" />, name: "Social Content Starter Pack", price: 10, desc: "Editable ideas and captions for a fast content launch." },
  { icon: <Layers className="h-5 w-5" />, name: "Hashtag Strategy Pack", price: 15, desc: "Platform-ready hashtag sets organized by niche." },
  { icon: <FileText className="h-5 w-5" />, name: "Brand Voice Guide Template", price: 25, desc: "Simple messaging guide to keep your content consistent." },
  { icon: <Search className="h-5 w-5" />, name: "SEO Keyword Snapshot", price: 35, desc: "Quick keyword research with priority terms and intent." },
  { icon: <Camera className="h-5 w-5" />, name: "Social Media Account Audit", price: 50, desc: "One-profile audit with actionable optimization notes." },
  { icon: <BarChart3 className="h-5 w-5" />, name: "Website SEO Quick Audit", price: 75, desc: "Technical overview plus a ranked improvement checklist." },
  { icon: <MessageSquare className="h-5 w-5" />, name: "Marketing Strategy Call", price: 95, desc: "Focused strategy call with a written follow-up summary." },
  { icon: <Rocket className="h-5 w-5" />, name: "Ads Campaign Review", price: 125, desc: "Campaign review with clear fixes for better performance." },
  { icon: <Globe className="h-5 w-5" />, name: "Landing Page Copy + Wireframe", price: 150, desc: "Conversion-focused copy and layout direction for one page." },
  { icon: <TrendingUp className="h-5 w-5" />, name: "Full Growth Roadmap", price: 200, desc: "90-day plan with priorities, channels, and next steps." },
] as const;

const steps = [
  { icon: <Download className="h-6 w-6 text-[#2563EB]" />, title: "Pick & Pay", desc: "Choose a service and pay securely via Stripe. Instant receipt by email." },
  { icon: <Clock className="h-6 w-6 text-[#2563EB]" />, title: "We Deliver", desc: "Digital downloads within 24h. Services start within 24-48h." },
  { icon: <Rocket className="h-6 w-6 text-[#2563EB]" />, title: "You Grow", desc: "Track performance. Support included per service terms." },
];

const serviceGroups = [
  {
    category: "Stripe-ready service catalog",
    icon: <ShoppingCart className="h-5 w-5 text-white" />,
    items: services,
  },
];

const faqs = [
  { q: "How fast will I receive my deliverable?", a: "Digital deliverables are delivered within 24 hours via email. Service-based work begins within 24-48 business hours of purchase." },
  { q: "What payment methods do you accept?", a: "We accept all major credit and debit cards through Stripe — Visa, Mastercard, American Express, and Discover. All transactions are encrypted and secure." },
  { q: "Can I get a refund?", a: "Digital downloads are final sale and non-refundable once delivered. For services, you may request a full refund within 48 hours if work has not started. Partial refunds apply if work is in progress. See our Refund Policy for full details." },
  { q: "Do you offer custom packages?", a: "Yes. If none of our fixed-price services fit your needs, contact us at info@pulseaw.com and we will build a custom engagement tailored to your goals." },
  { q: "Is my payment information secure?", a: "Absolutely. We never store your credit card details. All payments are processed securely through Stripe, a PCI-DSS Level 1 certified payment processor." },
];

function ServiceCard({ item }: { item: (typeof services)[number] }) {
  const [agreed, setAgreed] = useState(false);
  return (
    <div className="group relative flex flex-col rounded-2xl border border-slate-200/80 bg-white p-7 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#2563EB]/30 hover:shadow-xl hover:shadow-[#2563EB]/5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition group-hover:bg-[#2563EB]/10 group-hover:text-[#2563EB]">
        {item.icon}
      </div>
      <div className="mb-1 text-3xl font-extrabold text-slate-900">${item.price}</div>
      <h4 className="mb-2 text-base font-bold text-slate-900">{item.name}</h4>
      <p className="mb-5 text-sm leading-relaxed text-slate-500">{item.desc}</p>
      <div className="mt-auto space-y-3">
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
          />
          <span className="text-xs text-slate-500 leading-relaxed">
            I agree to the{" "}
            <Link href="/terms-of-service" className="underline hover:text-[#2563EB]">Terms of Service</Link>,{" "}
            <Link href="/privacy-policy" className="underline hover:text-[#2563EB]">Privacy Policy</Link>, and{" "}
            <Link href="/refund-policy" className="underline hover:text-[#2563EB]">Refund Policy</Link>.
          </span>
        </label>
        <button
          disabled={!agreed}
          className="inline-flex h-11 w-full items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 text-sm font-bold text-white transition hover:from-[#2563EB] hover:to-[#1d4ed8] disabled:opacity-40 disabled:cursor-not-allowed group-hover:shadow-md"
        >
          Pay ${item.price}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-6 text-left transition hover:bg-slate-50"
      >
        <span className="font-bold text-slate-900">{q}</span>
        {open ? <ChevronUp className="h-5 w-5 text-slate-400 shrink-0" /> : <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-6 pb-6 text-sm leading-relaxed text-slate-600">
          {a}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const priceRange = useMemo(() => {
    const values = services.map((service) => service.price);
    return { min: Math.min(...values), max: Math.max(...values) };
  }, []);

  return (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="PulseAW" width={140} height={36} className="h-9 w-auto" />
          </Link>
          <nav className="hidden gap-7 text-sm font-semibold text-slate-500 sm:flex">
            <a href="#services" className="transition hover:text-slate-900">Services</a>
            <a href="#about" className="transition hover:text-slate-900">About</a>
            <a href="#faq" className="transition hover:text-slate-900">FAQ</a>
            <a href="#contact" className="transition hover:text-slate-900">Contact</a>
          </nav>
          <a
            href="#services"
            className="hidden rounded-lg bg-gradient-to-r from-[#2563EB] to-[#1d4ed8] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 sm:inline-block"
          >
            Get Started
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#f0f7ff] to-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-1/4 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[#2563EB]/5 blur-3xl" />
          <div className="absolute -bottom-1/4 right-0 h-[400px] w-[600px] rounded-full bg-[#1d4ed8]/5 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-6xl px-6 pt-24 pb-20 text-center sm:pt-36 sm:pb-28">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-[#2563EB]/20 bg-[#2563EB]/5 px-4 py-1.5">
            <Shield className="h-3.5 w-3.5 text-[#2563EB]" />
            <span className="text-xs font-bold text-[#2563EB]">Fixed-Price Marketing Deliverables</span>
          </div>
          <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
            Marketing services,
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-[#2563EB] to-[#1d4ed8] bg-clip-text text-transparent"> priced like products.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-600">
            Pick a service. Pay securely via Stripe. Get deliverables in hours — not weeks.
            No quotes, no calls, no surprises.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="#services"
              className="group inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#1d4ed8] px-7 text-sm font-bold text-white shadow-lg shadow-[#2563EB]/20 transition hover:shadow-[#2563EB]/30"
            >
              Browse Services
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </a>
            <a
              href="#how"
              className="inline-flex h-12 items-center rounded-xl border border-slate-200 bg-white px-7 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              How It Works
            </a>
          </div>

          {/* Metrics */}
          <div className="mx-auto mt-20 max-w-4xl rounded-2xl border border-slate-200/60 bg-white/70 p-6 backdrop-blur sm:p-8">
            <div className="grid grid-cols-2 gap-y-6 sm:grid-cols-4">
              {[
                { num: "10", label: "Stripe-Ready Services" },
                { num: `$${priceRange.min}+`, label: "Starting Price" },
                { num: "24h", label: "Fast Delivery" },
                { num: "100%", label: "Stripe-Secured" },
              ].map((m) => (
                <div key={m.label} className="flex flex-col items-center gap-1 text-center">
                  <div className="text-3xl font-extrabold text-slate-900 sm:text-4xl">{m.num}</div>
                  <div className="text-[13px] font-medium text-slate-500">{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By */}
      <section className="border-y border-slate-100 bg-white py-10">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-6 text-center text-xs font-bold uppercase tracking-widest text-slate-400">Trusted by marketers at</p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-40 grayscale">
            {["Shopify", "WordPress", "Google Ads", "Meta", "Stripe", "Mailchimp"].map((brand) => (
              <span key={brand} className="text-lg font-bold text-slate-700">{brand}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="relative bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">Services & Pricing</h2>
            <p className="mx-auto mt-5 max-w-2xl text-slate-500 leading-relaxed">
              Clear scopes. Fixed prices. Every purchase is a secure transaction via Stripe — no hidden fees.
            </p>
          </div>
          <div className="space-y-20">
            {serviceGroups.map((group) => (
              <div key={group.category}>
                <div className="mb-8 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] shadow-md shadow-[#2563EB]/20">
                    {group.icon}
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">{group.category}</h3>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((item) => (
                    <ServiceCard key={item.name} item={item} />
                  ))}
                </div>
                <p className="mt-6 text-center text-sm text-slate-500">
                  Built for the Stripe algorithm: one fixed-price catalog from ${priceRange.min} to ${priceRange.max}.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-[#f8fafc] py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">How It Works</h2>
            <p className="mx-auto mt-5 max-w-xl text-slate-500 leading-relaxed">Three simple steps from purchase to delivery.</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.title} className="relative rounded-2xl border border-white/60 bg-white p-8 shadow-sm">
                <div className="absolute -top-4 left-8 flex h-10 w-10 items-center justify-center rounded-full bg-[#2563EB]/10 text-lg font-extrabold text-[#2563EB] shadow-sm">
                  {i + 1}
                </div>
                <div className="mt-4 mb-4">{step.icon}</div>
                <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#2563EB]/20 bg-[#2563EB]/5 px-4 py-1.5">
                <BadgeCheck className="h-3.5 w-3.5 text-[#2563EB]" />
                <span className="text-xs font-bold text-[#2563EB]">Verified Business</span>
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">Built for businesses that move fast.</h2>
              <p className="mt-6 text-lg leading-relaxed text-slate-600">
                PulseAW LLC is a digital marketing agency based in Flint, Michigan. We believe marketing services should be as easy to buy as products — clear scope, fixed price, instant delivery.
              </p>
              <p className="mt-4 text-lg leading-relaxed text-slate-600">
                Founded by Melvis Julieth Asto Farias, we help small businesses and entrepreneurs grow with professional marketing deliverables without the agency retainers or endless back-and-forth.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                  <MapPin className="h-4 w-4 text-[#2563EB]" />
                  Flint, MI, USA
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                  <Shield className="h-4 w-4 text-[#2563EB]" />
                  Wyoming LLC
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-[#2563EB]" />
                  EIN Pending
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#2563EB]/10 to-[#1d4ed8]/10" />
              <div className="relative rounded-3xl border border-slate-200 bg-white p-10 shadow-xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] text-2xl font-extrabold text-white">
                    M
                  </div>
                  <div>
                    <div className="text-lg font-bold text-slate-900">Melvis Julieth Asto Farias</div>
                    <div className="text-sm text-slate-500">Founder & CEO, PulseAW LLC</div>
                  </div>
                </div>
                <blockquote className="text-slate-600 leading-relaxed italic">
                  &ldquo;I started PulseAW because I saw too many small businesses struggling to get simple marketing tasks done. No one should wait weeks for a content calendar or pay thousands for a basic ad setup. We deliver quality, fast, at a fair price.&rdquo;
                </blockquote>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-[#f8fafc] py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">Frequently Asked Questions</h2>
            <p className="mx-auto mt-5 max-w-xl text-slate-500 leading-relaxed">Everything you need to know before purchasing.</p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="relative bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-5xl px-6">
          <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/40">
            <div className="grid lg:grid-cols-2">
              {/* Left info */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-10 text-white lg:p-14">
                <h2 className="text-3xl font-extrabold">Get In Touch</h2>
                <p className="mt-3 text-slate-300 leading-relaxed">
                  Have questions or need a custom engagement? We respond within 24 business hours.
                </p>
                <div className="mt-10 space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Email</div>
                      <a href="mailto:info@pulseaw.com" className="mt-0.5 block font-semibold text-white hover:underline">info@pulseaw.com</a>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Phone</div>
                      <a href="tel:+12513321334" className="mt-0.5 block font-semibold text-white hover:underline">+1 (251) 332-1334</a>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Address</div>
                      <p className="mt-0.5 font-semibold text-white">3721 Beecher Rd, Flint, Michigan 48503, United States</p>
                      <p className="text-sm text-slate-400">United States</p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Right form */}
              <div className="p-10 lg:p-14">
                <h3 className="text-lg font-bold text-slate-900">Send a message</h3>
                <form className="mt-6 space-y-5" action="mailto:info@pulseaw.com" method="GET" encType="text/plain">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Name</label>
                      <input type="text" name="name" className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]" placeholder="Your name" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Email</label>
                      <input type="email" name="email" className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]" placeholder="you@company.com" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">Message</label>
                    <textarea rows={4} name="message" className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]" placeholder="How can we help?" />
                  </div>
                  <button type="submit" className="inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-[#2563EB] to-[#1d4ed8] px-7 text-sm font-bold text-white shadow-lg shadow-[#2563EB]/20 transition hover:opacity-90">
                    Send Message
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div>
              <div className="flex items-center">
                <Image src="/logo.png" alt="PulseAW" width={140} height={36} className="h-9 w-auto" />
              </div>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
                Fixed-price digital marketing services for businesses that want results fast.
              </p>
            </div>
            <div className="flex flex-wrap gap-7 text-sm font-semibold text-slate-500">
              <Link href="/terms-of-service" className="transition hover:text-slate-900">Terms of Service</Link>
              <Link href="/privacy-policy" className="transition hover:text-slate-900">Privacy Policy</Link>
              <Link href="/refund-policy" className="transition hover:text-slate-900">Refund Policy</Link>
              <a href="#contact" className="transition hover:text-slate-900">Contact</a>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 border-t border-slate-200 pt-8">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Lock className="h-4 w-4 text-[#2563EB]" />
              SSL Secure
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <CreditCard className="h-4 w-4 text-[#2563EB]" />
              Stripe Payments
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Shield className="h-4 w-4 text-[#2563EB]" />
              PCI-DSS Compliant
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <BadgeCheck className="h-4 w-4 text-[#2563EB]" />
              Verified US Business
            </div>
          </div>

          <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-slate-200 pt-8 sm:flex-row sm:items-center">
            <p className="text-xs text-slate-400">© {new Date().getFullYear()} PulseAW LLC. All rights reserved.</p>
            <p className="text-xs text-slate-400">3721 Beecher Rd, Flint, Michigan 48503, United States</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

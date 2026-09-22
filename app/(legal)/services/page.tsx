import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { individualServices } from "../../individual-services";
import { formatPrice } from "../../engagements";
import { buildProjectEmail } from "../../contact-mail";

export const metadata: Metadata = {
  title: "Individual Marketing Services, $5–$200 | PulseAW",
  description: "Focused marketing services from $5 to $200 USD. Clear deliverables for copy, landing pages, tracking, CRM and launch planning, delivered digitally in 1–3 business days.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-14 sm:py-20">
      <p className="eyebrow">Individual services · $5–$200 USD</p>
      <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">One focused task. A clear next step.</h1>
      <p className="mt-6 max-w-2xl text-base text-slate-600">
        Practical support for campaign messaging, landing pages, measurement, CRM and launch planning.
        Choose the work you need. We confirm your scope, materials and availability before work begins.
      </p>
      <p className="mt-4 max-w-2xl text-sm text-slate-600">
        One-time prices in USD. Digital delivery within 1–3 business days after we receive the required
        materials. Advertising spend and third-party software are separate. Results are not guaranteed.
      </p>
      <div className="mt-10 border-t border-slate-200">
        {individualServices.map(item => (
          <article key={item.id} id={item.id} className="grid gap-5 border-b border-slate-200 py-7 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-8">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">{item.name}</h2>
              <p className="mt-3 max-w-2xl text-sm text-slate-600">{item.scope}</p>
              <p className="mt-2 text-xs font-medium text-slate-500">
                Digital delivery · {item.deliveryDays} business {item.deliveryDays === 1 ? "day" : "days"}
              </p>
            </div>
            <div className="flex items-center justify-between gap-5 sm:flex-col sm:items-end sm:justify-start">
              <p className="text-2xl font-semibold tracking-tight">{formatPrice(item.price)} <span className="text-xs font-normal text-slate-500">USD</span></p>
              <a className="text-link" href={buildProjectEmail({ name:"",email:"",engagement:item.name,message:"I would like to discuss "+item.name+" ("+formatPrice(item.price)+" USD).\n\nMy project and available materials:\n" })} aria-label={"Discuss "+item.name}>
                Discuss this service <ArrowUpRight size={16} />
              </a>
            </div>
          </article>
        ))}
      </div>
      <p className="mt-6 text-sm text-slate-500">Service enquiries open your email app for you to review and send.</p>
      <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4 text-sm font-medium">
        <Link href="/#services" className="text-blue-600">Explore larger engagements</Link>
        <Link href="/refund-policy" className="text-blue-600">Refund and cancellation policy</Link>
        <Link href="/terms-of-service" className="text-blue-600">Terms of service</Link>
      </div>
    </main>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  ChartNoAxesColumnIncreasing,
  Check,
  ChevronRight,
  Compass,
  FileCheck2,
  FileText,
  Layers3,
  Lightbulb,
  Mail,
  MapPin,
  Phone,
  Menu,
  Minus,
  PanelsTopLeft,
  Plus,
  Rocket,
  Target,
  UsersRound,
  Workflow,
  X,
  MessagesSquare,
  Route,
  ContactRound,
  CalendarDays,
  Presentation,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import { engagements, formatPrice } from "./engagements";
import { buildProjectEmail } from "./contact-mail";

const scopeIcons: Record<string, LucideIcon> = {
  Compass,
  MessagesSquare,
  Route,
  FileCheck2,
  Target,
  PanelsTopLeft,
  Workflow,
  ChartNoAxesColumnIncreasing,
  UsersRound,
  ContactRound,
  CalendarDays,
  Megaphone,
  Layers3,
  Presentation,
  Mail,
};
const questions = [
  [
    "Which engagement is right for me?",
    "We start with your offer, stage and priorities to define the right scope. Choose a focused engagement for a specific need, or Founder Growth Launch to connect strategy, a funnel, CRM and paid acquisition within one defined project.",
  ],
  [
    "Is advertising spend included?",
    "No. The prices shown are one-time project fees in USD. Advertising spend, software subscriptions and other third-party costs are separate. We clarify these before you commit.",
  ],
  [
    "What will you need from me?",
    "Depending on your engagement, we need your offer, business and brand materials, access to the relevant accounts, and your feedback at agreed milestones. We confirm the full requirements in your project scope.",
  ],
  [
    "Is this a one-time project?",
    "Yes. Each engagement has a defined scope and handover. Campaign optimization is included only where stated, for 30 days from campaign activation. Any further work is agreed separately.",
  ],
];
const stages = [
  [
    "Discovery",
    "We learn about your business, market and goals to identify the right opportunity.",
  ],
  [
    "Scope & plan",
    "We define the engagement, priorities and execution plan in detail.",
  ],
  [
    "Build & launch",
    "We create and implement the marketing system agreed in your scope.",
  ],
  [
    "Review & handover",
    "We review the work, document the setup and hand everything over to you.",
  ],
];

export default function Home() {
  const [selected, setSelected] = useState(5);
  const [menuOpen, setMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [contactService, setContactService] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [emailPrepared, setEmailPrepared] = useState(false);
  const [showScope, setShowScope] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const service = engagements[selected];
  function openContact(name = "") {
    setContactService(name);
    setEmailPrepared(false);
    setCopied(false);
    setMenuOpen(false);
    dialog.current?.showModal();
  }
  function prepareEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    window.location.href = buildProjectEmail({
      name: String(form.get("name") || ""),
      email: String(form.get("email") || ""),
      engagement: contactService,
      message: String(form.get("message") || ""),
    });
    setEmailPrepared(true);
  }
  async function copyEmail() {
    try {
      await navigator.clipboard.writeText("info@pulseaw.com");
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <Link href="/" aria-label="PulseAW home" className="brand">
            <Image
              src="/logo.png"
              alt="PulseAW — Digital marketing that drives growth"
              width={1149}
              height={274}
              preload
              sizes="220px"
            />
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            <a href="#services">Expertise</a>
            <a href="#approach">Our approach</a>
            <a href="#about">About</a>
          </nav>
          <button className="button header-cta" onClick={() => openContact()}>
            Discuss your project <ArrowUpRight size={17} />
          </button>
          <button
            className="menu-toggle"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen && (
          <nav
            id="mobile-navigation"
            className="mobile-nav"
            aria-label="Mobile navigation"
          >
            <a href="#services" onClick={() => setMenuOpen(false)}>
              Expertise
            </a>
            <a href="#approach" onClick={() => setMenuOpen(false)}>
              Our approach
            </a>
            <a href="#about" onClick={() => setMenuOpen(false)}>
              About
            </a>
            <button onClick={() => openContact()}>
              Discuss your project <ArrowUpRight size={17} />
            </button>
          </nav>
        )}
      </header>

      <main id="main">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-art">
            <Image
              src="/images/hero.webp"
              alt="Four architectural panels connected by a blue pulse: Market, Launch, Acquire and Convert."
              fill
              preload
              sizes="(max-width: 700px) 100vw, 65vw"
            />
          </div>
          <div className="container hero-inner">
            <div className="hero-copy">
              <p className="eyebrow">Premium marketing for new entrepreneurs</p>
              <h1 id="hero-title">
                Your ambition.
                <br />
                Our next move.
              </h1>
              <p className="hero-description">
                From first market insight to a complete acquisition system.
                Built around your business.
              </p>
              <div className="hero-actions">
                <button className="button" onClick={() => openContact()}>
                  Discuss your project <ArrowUpRight size={18} />
                </button>
                <a className="text-link light" href="#services">
                  Explore our expertise <ArrowDown size={17} />
                </a>
              </div>
              <p className="hero-investment">
                Project engagements <span>·</span> $1,500–$8,000
              </p>
            </div>
            <span className="hero-art-label">Acquisition system / concept</span>
          </div>
        </section>
        <div className="principles">
          <div className="container">
            <p>Strategy before spend.</p>
            <p>Execution with purpose.</p>
            <p>A defined scope. A clear investment.</p>
          </div>
        </div>

        <section
          className="about-section section"
          id="about"
          aria-labelledby="about-title"
        >
          <div className="container about-grid">
            <div>
              <p className="eyebrow">Built for your next chapter</p>
              <h2 id="about-title">
                You bring the ambition.
                <br />
                We build the route to market.
              </h2>
              <p className="section-copy">
                Practical marketing systems for new entrepreneurs, designed
                around your offer, your audience and your next stage.
              </p>
            </div>
            <div className="audiences">
              {[
                [
                  Rocket,
                  "Launching your first venture",
                  "Turn your idea into a focused go-to-market plan.",
                ],
                [
                  Lightbulb,
                  "Turning expertise into a business",
                  "Define your audience and a clear path to reach them.",
                ],
                [
                  ChartNoAxesColumnIncreasing,
                  "Ready to invest in acquisition",
                  "Connect the steps from first interest to enquiry.",
                ],
              ].map(([Icon, title, copy]) => {
                const I = Icon as LucideIcon;
                return (
                  <div className="audience" key={title as string}>
                    <span className="icon-disc">
                      <I size={27} strokeWidth={1.6} />
                    </span>
                    <div>
                      <h3>{title as string}</h3>
                      <p>{copy as string}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section
          className="engagements section"
          id="services"
          aria-labelledby="engagement-title"
        >
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">The engagement collection</p>
                <h2 id="engagement-title">Choose your next move.</h2>
              </div>
              <p className="margin-note">
                Six focused engagements.
                <br />A clear path forward.
              </p>
            </div>
            <div className="engagement-layout">
              <div
                className="engagement-selector"
                role="group"
                aria-label="Choose a marketing engagement"
              >
                {engagements.map((item, index) => (
                  <button
                    key={item.id}
                    className={`engagement-option ${selected === index ? "is-active" : ""}`}
                    aria-pressed={selected === index}
                    aria-controls="engagement-panel"
                    onClick={() => {
                      setSelected(index);
                      setShowScope(false);
                    }}
                  >
                    <span className="option-number">{item.number}</span>
                    <span>
                      <span className="option-name">{item.name}</span>
                      <span className="option-price">
                        {formatPrice(item.price)}
                      </span>
                    </span>
                    <ChevronRight className="option-arrow" size={16} />
                  </button>
                ))}
                <p className="selector-help">
                  Select an engagement to explore its scope.
                </p>
              </div>
              <div
                className="engagement-panel"
                id="engagement-panel"
                aria-label="Selected engagement"
              >
                <div className="panel-content" key={service.id}>
                  <div className="panel-heading">
                    <span className="panel-number">{service.number}</span>
                    <div>
                      <p className="eyebrow">{service.label}</p>
                      <h3>{service.name}</h3>
                      <p className="panel-description">{service.description}</p>
                    </div>
                  </div>
                  <div className="service-art">
                    <Image
                      src={service.image}
                      alt={service.alt}
                      fill
                      sizes="(max-width: 700px) 100vw, (max-width: 1100px) 65vw, 900px"
                      loading="eager"
                    />
                    <span className="scene-caption">
                      Illustrative engagement concept
                    </span>
                  </div>
                  <div className="investment-row">
                    <div>
                      <p
                        className="investment"
                        aria-live="polite"
                        aria-atomic="true"
                      >
                        <span className="sr-only">{service.name}, </span>
                        {formatPrice(service.price)}
                      </p>
                      <p className="investment-label">One-time project · USD</p>
                    </div>
                    <button
                      className="button"
                      onClick={() => openContact(service.name)}
                    >
                      Discuss this engagement <ArrowUpRight size={18} />
                    </button>
                  </div>
                  <div className="scope-grid">
                    {service.scope.map(([icon, title, copy]) => {
                      const Icon = scopeIcons[icon];
                      return (
                        <div className="scope-item" key={title}>
                          <Icon size={28} strokeWidth={1.4} />
                          <div>
                            <h4>{title}</h4>
                            <p>{copy}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    className="scope-toggle"
                    onClick={() => setShowScope(!showScope)}
                    aria-expanded={showScope}
                    aria-controls="full-scope"
                  >
                    {showScope
                      ? "Close project scope"
                      : "View full project scope"}
                    {showScope ? <Minus size={16} /> : <Plus size={16} />}
                  </button>
                  <div
                    id="full-scope"
                    hidden={!showScope}
                    className="scope-detail"
                  >
                    <h4>Included in your engagement</h4>
                    <p>{service.detail}</p>
                    <h4>What we need from you</h4>
                    <p>{service.requirements}</p>
                    <p>
                      Timing, access requirements and milestones are confirmed
                      in your project agreement before work begins.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="deliverable-strip">
              <strong>What you receive:</strong>
              {service.deliverables.map((title, i) => {
                const Icon = [FileText, Workflow, UsersRound][i];
                return (
                  <div key={title}>
                    <span className="icon-disc">
                      <Icon size={23} />
                    </span>
                    <span>{title}</span>
                  </div>
                );
              })}
            </div>
            <p className="cost-note">
              Advertising spend and third-party software are separate.
            </p>
          </div>
        </section>

        <section
          className="deliverables section"
          aria-labelledby="deliverables-title"
        >
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Illustrative deliverables</p>
                <h2 id="deliverables-title">What stays with your business.</h2>
              </div>
              <p className="margin-note">
                Tangible assets.
                <br />A clear next step.
              </p>
            </div>
            <div className="deliverables-grid">
              {[
                [
                  "A documented strategy",
                  "A clear plan for your market, audience, positioning and next steps.",
                ],
                [
                  "Connected marketing assets",
                  "Landing pages, CRM or campaigns built around your agreed scope.",
                ],
                [
                  "A clear handover",
                  "Account access, documentation and guidance to keep you moving.",
                ],
              ].map(([title, copy], i) => (
                <article key={title}>
                  <div
                    className={`deliverable-art deliverable-art-${i}`}
                    role="img"
                    aria-label={
                      [
                        "Illustrative navy strategy dossier and launch plan",
                        "Illustrative landing page on desktop and mobile",
                        "Illustrative project handover documents",
                      ][i]
                    }
                  ></div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </article>
              ))}
            </div>
            <p className="cost-note">
              Deliverables depend on the engagement you choose.
            </p>
          </div>
        </section>

        <section
          id="approach"
          className="approach section"
          aria-labelledby="approach-title"
        >
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Our approach</p>
                <h2 id="approach-title">Clarity at every milestone.</h2>
              </div>
              <p className="margin-note">
                From strategy
                <br />
                to execution.
              </p>
            </div>
            <ol className="timeline">
              {stages.map(([title, copy], i) => (
                <li key={title}>
                  <span className="step-number">0{i + 1}</span>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="faq section" id="faq" aria-labelledby="faq-title">
          <div className="container faq-grid">
            <div>
              <p className="eyebrow">Questions</p>
              <h2 id="faq-title">Before we begin.</h2>
              <p className="section-copy">
                Straight answers, so you can move forward with confidence.
              </p>
            </div>
            <div className="faq-list">
              {questions.map(([q, answer], i) => (
                <div
                  className={`faq-item ${faqOpen === i ? "is-open" : ""}`}
                  key={q}
                >
                  <h3>
                    <button
                      onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                      aria-expanded={faqOpen === i}
                      aria-controls={`faq-answer-${i}`}
                      id={`faq-question-${i}`}
                    >
                      <span>{q}</span>
                      {faqOpen === i ? <Minus size={19} /> : <Plus size={19} />}
                    </button>
                  </h3>
                  <div
                    id={`faq-answer-${i}`}
                    role="region"
                    aria-labelledby={`faq-question-${i}`}
                    hidden={faqOpen !== i}
                  >
                    <p>{answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          className="contact-section"
          id="contact"
          aria-labelledby="contact-title"
        >
          <div className="container contact-inner">
            <div className="contact-intro">
              <p className="eyebrow">Let’s talk</p>
              <h2 id="contact-title">Let’s build your next chapter.</h2>
              <p>
                Tell us what you are building, where you want to go, and what
                needs to happen next.
              </p>
              <button className="button" onClick={() => openContact()}>
                Discuss your project <ArrowUpRight size={18} />
              </button>
            </div>
            <address className="contact-details">
              <a href="mailto:info@pulseaw.com" className="contact-detail">
                <Mail size={21} strokeWidth={1.5} />
                <span>
                  <span className="contact-label">Email us</span>
                  <span className="contact-value">info@pulseaw.com</span>
                </span>
                <ArrowUpRight size={18} className="contact-arrow" />
              </a>
              <a href="tel:+12513321334" className="contact-detail">
                <Phone size={21} strokeWidth={1.5} />
                <span>
                  <span className="contact-label">Call us</span>
                  <span className="contact-value">+1 (251) 332-1334</span>
                </span>
                <ArrowUpRight size={18} className="contact-arrow" />
              </a>
              <div className="contact-detail">
                <MapPin size={21} strokeWidth={1.5} />
                <span>
                  <span className="contact-label">Our address</span>
                  <span className="contact-value contact-address">
                    3721 Beecher Rd
                    <br />
                    Flint, Michigan 48503
                    <br />
                    United States
                  </span>
                </span>
              </div>
            </address>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div className="container footer-inner">
          <Link href="/" aria-label="PulseAW home" className="brand">
            <Image
              src="/logo.png"
              alt="PulseAW"
              width={1149}
              height={274}
              sizes="200px"
            />
          </Link>
          <p>© {new Date().getFullYear()} PulseAW LLC</p>
          <nav aria-label="Legal">
            <Link href="/imprint">Imprint</Link>
            <Link href="/terms-of-service">Terms</Link>
            <Link href="/privacy-policy">Privacy</Link>
            <Link href="/refund-policy">Refund Policy</Link>
          </nav>
        </div>
      </footer>

      <dialog
        className="contact-dialog"
        ref={dialog}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
        aria-labelledby="dialog-title"
      >
        <button
          className="dialog-close"
          aria-label="Close project enquiry"
          onClick={() => dialog.current?.close()}
        >
          <X size={24} />
        </button>
        <p className="eyebrow">Start a conversation</p>
        <h2 id="dialog-title">
          Your next chapter
          <br />
          starts here.
        </h2>
        <p className="dialog-intro">
          Tell us a little about your business. We’ll use your brief to discuss
          the right scope.
        </p>
        <form onSubmit={prepareEmail}>
          <div className="form-row">
            <label htmlFor="contact-name">
              Your name
              <input
                id="contact-name"
                name="name"
                autoComplete="name"
                required
                maxLength={100}
              />
            </label>
            <label htmlFor="contact-email">
              Email address
              <input
                id="contact-email"
                type="email"
                name="email"
                autoComplete="email"
                required
                maxLength={254}
              />
            </label>
          </div>
          <label htmlFor="contact-service">
            Engagement
            <select
              id="contact-service"
              value={contactService}
              onChange={(e) => setContactService(e.target.value)}
            >
              <option value="">Help me choose</option>
              {engagements.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name} — {formatPrice(item.price)}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="contact-message">
            What are you building?
            <textarea
              id="contact-message"
              name="message"
              rows={4}
              required
              maxLength={3000}
              placeholder="Your business, your goals and where you need support…"
            />
          </label>
          <p className="form-note">
            This opens your email app with your brief. Review it there before
            sending. <Link href="/privacy-policy">Privacy policy</Link>
          </p>
          <button className="button form-submit" type="submit">
            Continue in email <ArrowUpRight size={18} />
          </button>
          {emailPrepared && (
            <p className="email-status" role="status">
              Your email draft is ready to open. If your email app didn’t open,
              contact info@pulseaw.com directly.
            </p>
          )}
        </form>
        <button className="copy-email" type="button" onClick={copyEmail}>
          {copied ? <Check size={16} /> : <Mail size={16} />}{" "}
          {copied ? "Email address copied" : "Copy info@pulseaw.com"}
        </button>
      </dialog>
    </>
  );
}

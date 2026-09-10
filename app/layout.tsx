import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  display: "swap",
  variable: "--font-inter",
});
const sora = localFont({
  src: "./fonts/sora-latin.woff2",
  display: "swap",
  variable: "--font-sora",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.pulseaw.com"),
  title: "PulseAW | Premium Marketing for New Entrepreneurs",
  description:
    "Launch your next chapter with PulseAW. Six focused marketing engagements, from market strategy to integrated acquisition systems. Projects from $1,500 to $8,000.",
  openGraph: {
    title: "Your ambition. Our next move. | PulseAW",
    description:
      "Premium marketing for new entrepreneurs. Strategy, funnels, automation and acquisition — built around your business.",
    url: "https://www.pulseaw.com",
    siteName: "PulseAW",
    type: "website",
    images: [
      {
        url: "/images/hero.webp",
        width: 1536,
        height: 1024,
        alt: "PulseAW marketing acquisition system",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${sora.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="min-h-full bg-white">{children}</body>
    </html>
  );
}

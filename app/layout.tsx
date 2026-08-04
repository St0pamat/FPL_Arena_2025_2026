import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FPL Platform — Arena & Na Minusie ™",
  description:
    "Platforma lig Fantasy Premier League: archiwum FPL Arena (Skarb Kibica) oraz nowa liga H2H Na Minusie ™.",
  icons: {
    icon: [{ url: "/images/fpl-arena-logo.png", type: "image/png" }],
    apple: [{ url: "/images/fpl-arena-logo.png", type: "image/png" }],
    shortcut: "/images/fpl-arena-logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Oswald:wght@400;500;600;700&display=swap&subset=latin,latin-ext"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { Montserrat, Crimson_Pro } from "next/font/google";
import LandingPage from "@/features/landing/components/LandingPage";
import "@/features/landing/landing.css";

// next/font downloads and self-hosts these at build time — no runtime CDN request.
// They are declared here rather than in the root layout so the dashboard, which
// uses Geist, does not pay for fonts it never renders.
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  variable: "--font-montserrat",
  display: "swap",
});

const crimsonPro = Crimson_Pro({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-crimson",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Viajeros Paraguaná — Viajes y Encomiendas",
  description:
    "Viajes y encomiendas confiables entre Paraguaná y el resto del país.",
};

export default function Home() {
  // The font variables and the landing design tokens both resolve on this
  // wrapper, which keeps them out of :root and away from the dashboard theme.
  return (
    <div
      className={`${montserrat.variable} ${crimsonPro.variable} vp-landing grain`}
    >
      <LandingPage />
    </div>
  );
}

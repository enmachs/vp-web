import type { Metadata } from "next";
import { Montserrat, Crimson_Pro } from "next/font/google";
import LandingPage from "@/features/landing/components/LandingPage";
import { getContactInfo } from "@/features/landing/lib/getContactInfo";
import { getSocialLinks } from "@/features/landing/lib/getSocialLinks";
import { getServices } from "@/features/landing/lib/getServices";
import { getServiceTypes } from "@/features/landing/lib/getServiceTypes";
import { getGalleryItems } from "@/features/landing/lib/getGalleryItems";
import { getReviews } from "@/features/landing/lib/getReviews";
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

// Without this Next prerenders `/` once at build time, so the Keystone read
// below would be frozen at whatever the DB held when Vercel built the app.
export const revalidate = 60;

export default async function Home() {
  // Each loader catches its own failures (see features/landing/lib/published.ts),
  // so one bad read degrades one section rather than rejecting the whole batch.
  const [contact, socialLinks, services, serviceTypes, galleryItems, reviews] =
    await Promise.all([
      getContactInfo(),
      getSocialLinks(),
      getServices(),
      getServiceTypes(),
      getGalleryItems(),
      getReviews(),
    ]);

  // The font variables and the landing design tokens both resolve on this
  // wrapper, which keeps them out of :root and away from the dashboard theme.
  return (
    <div
      className={`${montserrat.variable} ${crimsonPro.variable} vp-landing grain`}
    >
      <LandingPage
        contact={contact}
        socialLinks={socialLinks}
        services={services}
        serviceTypes={serviceTypes}
        galleryItems={galleryItems}
        reviews={reviews}
      />
    </div>
  );
}

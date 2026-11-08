import { Suspense } from "react";
import {
  AvailableClubsSection,
  AvailableClubsSkeleton,
} from "@/components/na-minusie/AvailableClubsSection";
import { FeaturesSection } from "@/components/na-minusie/FeaturesSection";
import { HeroSection } from "@/components/na-minusie/HeroSection";
import { HowToJoinSection } from "@/components/na-minusie/HowToJoinSection";
import { LandingSubNav } from "@/components/na-minusie/LandingSubNav";
import { StructureSection } from "@/components/na-minusie/StructureSection";
import { SystemSection } from "@/components/na-minusie/SystemSection";

export default function NaMinusiePage() {
  return (
    <>
      <LandingSubNav />
      <main>
        <HeroSection />
        <FeaturesSection />
        <SystemSection />
        <StructureSection />
        <Suspense fallback={<AvailableClubsSkeleton />}>
          <AvailableClubsSection />
        </Suspense>
        <HowToJoinSection />
      </main>
    </>
  );
}

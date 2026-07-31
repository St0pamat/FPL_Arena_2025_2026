import type { Metadata } from "next";
import "@arena/styles/global.css";
import { ArenaAppClient } from "@/components/arena/ArenaAppClient";

export const metadata: Metadata = {
  title: "FPL Arena — Oficjalny Skarb Kibica",
  description:
    "Interaktywny, posezonowy raport ligi FPL Arena: profile gladiatorów, wyniki, tabela H2H, Panteon i jedenastka sezonu.",
};

export default function ArenaPage() {
  return <ArenaAppClient />;
}

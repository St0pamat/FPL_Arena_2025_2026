import Link from "next/link";
import { NA_MINUSIE_LINKS } from "@/lib/na-minusie/links";

const external = { target: "_blank" as const, rel: "noopener noreferrer" };

interface CtaButtonsProps {
  layout?: "row" | "column";
  formLabel?: string;
  discordLabel?: string;
  /** Oba przyciski w stylu primary (identyczny wygląd) */
  sameStyle?: boolean;
}

export function CtaButtons({
  layout = "row",
  formLabel = "Zarezerwuj Klub",
  discordLabel = "Wbijaj na Discord",
  sameStyle = false,
}: CtaButtonsProps) {
  const wrap =
    layout === "column"
      ? "flex w-full max-w-lg flex-col gap-4"
      : "flex flex-col items-center gap-4 sm:flex-row sm:justify-center";

  const discordClass = sameStyle
    ? "nm-btn-primary w-full sm:w-auto"
    : "nm-btn-secondary w-full sm:w-auto";

  return (
    <div className={wrap}>
      <Link href={NA_MINUSIE_LINKS.form} {...external} className="nm-btn-primary w-full sm:w-auto">
        {formLabel}
      </Link>
      <Link href={NA_MINUSIE_LINKS.discord} {...external} className={discordClass}>
        {discordLabel}
      </Link>
    </div>
  );
}

import { NM_CONTAINER } from "@/lib/na-minusie/theme";

interface SectionShellProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
  tight?: boolean;
}

export function SectionShell({ id, children, className = "", tight = false }: SectionShellProps) {
  const spacing = tight ? "py-12 sm:py-16" : "py-14 sm:py-20 lg:py-24";

  return (
    <section id={id} className={`nm-section ${spacing} ${className}`}>
      <div className={NM_CONTAINER}>{children}</div>
    </section>
  );
}

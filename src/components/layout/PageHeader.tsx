import type { ReactNode } from "react";
import { LeagueLogo } from "@arena/components/branding";

export const PageHeader = ({
  title,
  lead,
  children,
}: {
  title: ReactNode;
  lead?: ReactNode;
  children?: ReactNode;
}) => (
  <header className="page-header">
    <h2 className="page-title">
      <div className="league-logo-wrap rounded-xl p-2 shrink-0">
        <LeagueLogo size="lg" />
      </div>
      <span className="min-w-0 break-words leading-tight">{title}</span>
    </h2>
    {lead && <p className="page-lead">{lead}</p>}
    {children}
  </header>
);

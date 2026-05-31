import type { ReactNode } from "react";
import { CONTAINER_CLASS } from "@/config/layout";

type Width = keyof typeof CONTAINER_CLASS;

export const PageContainer = ({
  children,
  width = "wide",
  className = "",
}: {
  children: ReactNode;
  width?: Width;
  className?: string;
}) => (
  <div className={`page-stack w-full mx-auto ${CONTAINER_CLASS[width]} ${className}`}>{children}</div>
);

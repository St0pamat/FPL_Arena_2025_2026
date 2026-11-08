/**
 * Legacy Vite Arena (`src/`) — osobny toolchain.
 * Next `tsc` nie powinien typecheckować całego drzewa `src/` przez `@arena/*`.
 */
declare module "@arena/app/App" {
  import type { ComponentType } from "react";
  const ArenaApp: ComponentType;
  export default ArenaApp;
}

declare module "@arena/*" {
  const value: unknown;
  export default value;
}

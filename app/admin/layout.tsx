import "./admin.css";
import { createClient } from "@/lib/supabase/server";

/**
 * Root layout strefy /admin — ładuje motyw i potwierdza sesję Auth.
 * Dostęp do panelu: każdy zalogowany użytkownik Supabase Auth.
 */
export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="admin-theme" data-authenticated={user ? "true" : "false"}>
      {children}
    </div>
  );
}

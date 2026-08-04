interface AdminPlaceholderProps {
  tag: string;
  title: string;
  description: string;
}

export function AdminPlaceholder({ tag, title, description }: AdminPlaceholderProps) {
  return (
    <main className="flex-1 p-6 sm:p-8 lg:p-10">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#39FF14]">{tag}</p>
      <h1 className="mt-2 text-3xl font-extrabold text-white">{title}</h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#888]">{description}</p>
      <div className="admin-card mt-8 border-dashed border-[#2a2a2a] bg-[#0c0c0c]">
        <p className="text-sm font-semibold text-[#666]">Moduł w przygotowaniu</p>
        <p className="mt-2 text-xs leading-relaxed text-[#444]">
          Zgodnie z ADMIN_MASTERPLAN — logika tej zakładki będzie wdrażana w kolejnych krokach.
        </p>
      </div>
    </main>
  );
}

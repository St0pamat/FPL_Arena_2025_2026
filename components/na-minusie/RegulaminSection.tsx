import { REGULAMIN_INTRO, REGULAMIN_SECTIONS } from "@/lib/na-minusie/regulaminContent";
import { SectionShell } from "@/components/na-minusie/SectionShell";

function RegulaminBlock({ block }: { block: (typeof REGULAMIN_SECTIONS)[0]["blocks"][0] }) {
  if (block.type === "subheading") {
    return (
      <h4 className="mt-8 text-lg font-bold text-white first:mt-0">{block.text}</h4>
    );
  }

  if (block.type === "list" && block.items) {
    return (
      <ul className="mt-4 space-y-3">
        {block.items.map((item) => (
          <li key={item.slice(0, 48)} className="flex gap-3 text-base leading-relaxed text-slate-300 sm:text-lg">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#39FF14]" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (block.type === "paragraph" && block.text) {
    return <p className="mt-4 text-base leading-relaxed text-slate-300 sm:text-lg">{block.text}</p>;
  }

  return null;
}

export function RegulaminSection() {
  return (
    <SectionShell className="border-t border-[#1a1a1a]" tight>
      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#39FF14]">Regulamin</p>
      <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
        {REGULAMIN_INTRO.title}
      </h2>

      <div className="mt-8 space-y-4">
        {REGULAMIN_INTRO.paragraphs.map((p) => (
          <p key={p.slice(0, 40)} className="text-base leading-relaxed text-slate-300 sm:text-lg">
            {p}
          </p>
        ))}
      </div>

      <div className="mt-12 space-y-8">
        {REGULAMIN_SECTIONS.map((section) => (
          <article key={section.id} className="nm-card p-6 sm:p-8 lg:p-10">
            <h3 className="text-xl font-extrabold text-[#39FF14] sm:text-2xl">{section.title}</h3>
            <div className="mt-4">
              {section.blocks.map((block, i) => (
                <RegulaminBlock key={`${section.id}-${i}`} block={block} />
              ))}
            </div>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}

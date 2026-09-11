import { Nav } from "./Nav";
import { Footer } from "./Footer";

/**
 * Shared chrome + typographic content renderer for marketing/docs/legal pages
 * (product pages, developer docs, changelog, legal). Same "terminal newspaper"
 * treatment everywhere: mono eyebrow, 1px rules, 740px reading column.
 */

export type ContentBlock =
  | { kind: "p"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "code"; title?: string; code: string }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "note"; text: string };

export interface MarketingPageContent {
  eyebrow: string;
  title: string;
  lede: string;
  /** e.g. "Last updated June 10, 2026" — shown mono under the lede. */
  updated?: string;
  blocks: ContentBlock[];
}

export function MarketingPage({ content }: { content: MarketingPageContent }) {
  return (
    <div className="h-full overflow-y-auto overflow-x-hidden bg-background text-text-primary">
      <Nav />
      <main className="px-5 sm:px-6">
        <article className="mx-auto max-w-[760px] pb-24 pt-16 sm:pt-24 space-y-8">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-accent">
              {content.eyebrow}
            </span>
            <h1 className="text-[clamp(32px,5vw,46px)] font-bold leading-[1.1] tracking-tight text-white">
              {content.title}
            </h1>
            <p className="max-w-[58ch] text-base sm:text-[17px] leading-[1.65] text-zinc-300">
              {content.lede}
            </p>
            {content.updated && (
              <p className="font-mono text-xs text-zinc-500 pt-1">{content.updated}</p>
            )}
          </div>

          <hr className="border-white/[0.08]" />

          <div className="flex flex-col gap-6">
            {content.blocks.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}

function Block({ block }: { block: ContentBlock }) {
  switch (block.kind) {
    case "h2":
      return (
        <h2 className="mt-8 border-t border-white/[0.08] pt-8 text-[22px] font-bold leading-[1.3] tracking-tight text-white">
          {block.text}
        </h2>
      );
    case "h3":
      return (
        <h3 className="mt-4 text-[17px] font-semibold leading-[1.4] text-zinc-100">
          {block.text}
        </h3>
      );
    case "p":
      return <p className="text-[15px] leading-[1.75] text-zinc-300">{block.text}</p>;
    case "ul":
      return (
        <ul className="flex flex-col gap-2.5 my-1">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-[1.65] text-zinc-300">
              <span aria-hidden className="shrink-0 font-mono text-[13px] leading-[1.8] text-accent">
                —
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case "code":
      return (
        <div className="aiic-glass-default overflow-hidden rounded-2xl shadow-xl my-2">
          {block.title && (
            <div className="border-b border-white/[0.08] px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-accent bg-white/[0.02]">
              {block.title}
            </div>
          )}
          <pre className="overflow-x-auto p-4 sm:p-5 font-mono text-xs sm:text-[13px] leading-[1.7] text-zinc-200">
            <code>{block.code}</code>
          </pre>
        </div>
      );
    case "table":
      return (
        <div className="aiic-glass-soft overflow-x-auto rounded-2xl p-1 shadow-lg my-3">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08]">
                {block.head.map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-accent"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={
                        j === 0
                          ? "px-4 py-3 font-mono text-xs font-semibold text-white"
                          : "px-4 py-3 text-xs sm:text-sm text-zinc-300"
                      }
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "note":
      return (
        <div className="aiic-glass-soft rounded-xl border-l-2 border-accent p-4 text-xs sm:text-sm leading-[1.65] text-zinc-200 font-sans my-2">
          {block.text}
        </div>
      );
  }
}

import { Caveat } from "next/font/google";
import { Github, Link as LinkIcon } from "lucide-react";

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export function FooterSignature() {
  return (
    <footer className="mt-8 border-t border-dashed border-[#CCFF00]/50 px-4 py-12">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 text-sm text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-center sm:text-left">
          <div
            className={`${caveat.className} text-xl sm:text-2xl text-[#CCFF00]/80 transition hover:text-[#CCFF00] hover:drop-shadow-[0_0_20px_rgba(204,255,0,0.8)]`}
          >
            built with clinical irony by harsha.
          </div>
          <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">
            [ next.js • openai • csv-nlp • framer motion ]
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 sm:justify-end">
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/foggyhead"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#CCFF00] text-[#CCFF00] shadow-[0_0_6px_rgba(204,255,0,0.35)] transition hover:scale-110 hover:shadow-[0_0_18px_rgba(204,255,0,0.85)]"
            >
              <Github className="h-5 w-5" />
            </a>
            <div className="group relative inline-flex items-center">
              <a
                href="https://harshaportfolio-three.vercel.app/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#CCFF00] text-[#CCFF00] shadow-[0_0_6px_rgba(204,255,0,0.35)] transition hover:scale-110 hover:shadow-[0_0_18px_rgba(204,255,0,0.85)]"
              >
                <LinkIcon className="h-5 w-5" />
              </a>
              <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded-full bg-black/80 px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.2em] text-[#CCFF00] opacity-0 shadow-[0_0_10px_rgba(0,0,0,0.8)] transition-opacity duration-200 group-hover:opacity-100">
                view portfolio
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}


import { Github, Link as LinkIcon } from "lucide-react";

export function FooterSignature() {
  return (
    <footer className="shrink-0 border-t border-white/10 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:gap-5 sm:text-left">
        <p
          className="text-lg text-rose-200/90"
          style={{ fontFamily: "var(--font-caveat), cursive" }}
        >
          built with clinical irony by harsha
        </p>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/foggyhead"
            target="_blank"
            rel="noreferrer"
            className="rounded-full p-2.5 text-neutral-400 transition hover:bg-rose-500/10 hover:text-rose-200"
            aria-label="GitHub"
          >
            <Github className="h-5 w-5" />
          </a>
          <a
            href="https://harshaportfolio-three.vercel.app/"
            target="_blank"
            rel="noreferrer"
            className="rounded-full p-2.5 text-neutral-400 transition hover:bg-rose-500/10 hover:text-rose-200"
            aria-label="Portfolio"
          >
            <LinkIcon className="h-5 w-5" />
          </a>
        </div>
      </div>
    </footer>
  );
}

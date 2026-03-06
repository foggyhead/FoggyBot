import { ChatShell } from "@/components/ChatShell";
import { FooterSignature } from "@/components/FooterSignature";

export default function Home() {
  return (
    <main className="flex min-h-screen min-h-[100dvh] flex-col bg-[#0c0c0c]">
      <div className="flex min-h-0 flex-1 flex-col">
        <ChatShell />
      </div>
      <FooterSignature />
    </main>
  );
}

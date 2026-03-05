import { ChatShell } from "@/components/ChatShell";
import { FooterSignature } from "@/components/FooterSignature";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex-1">
        <ChatShell />
      </div>
      <FooterSignature />
    </main>
  );
}

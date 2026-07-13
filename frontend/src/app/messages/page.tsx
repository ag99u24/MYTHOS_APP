import { AppShell } from "@/components/AppShell";
import { MessagesClient } from "./MessagesClient";

export default function MessagesPage() {
  return (
    <AppShell title="Chat" description="Comunicate con clientes o profesionales desde una conversacion centralizada.">
      <MessagesClient />
    </AppShell>
  );
}

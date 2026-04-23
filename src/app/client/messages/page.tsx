import { AppShell } from "@/components/layout/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { messages } from "@/lib/demo-data";

export default function ClientMessagesPage() {
  return (
    <AppShell role="client" title="Messages & check-ins" subtitle="Reply to coach notes and submit recovery context so your plan can adapt.">
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <Card className="p-5">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.from === "client" ? "justify-end" : ""}`}>
                {message.from === "trainer" && <Avatar name={message.author} className="size-9" />}
                <div className={`max-w-[78%] rounded-[1.5rem] p-4 ${message.from === "client" ? "bg-charcoal-950 text-ivory-50" : "bg-stone-50"}`}>
                  <p className="text-sm leading-6">{message.body}</p>
                  <p className={`mt-2 text-xs ${message.from === "client" ? "text-ivory-50/50" : "text-stone-500"}`}>{message.createdAt}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex gap-3">
            <Input placeholder="Reply to Avery..." />
            <Button variant="warm">Send</Button>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="text-xl font-semibold">Submit check-in</h3>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {["Energy", "Soreness", "Sleep", "Stress", "Motivation", "Mood"].map((field) => (
              <Input key={field} placeholder={field} />
            ))}
          </div>
          <Textarea className="mt-3" placeholder="Anything your trainer should know?" />
          <Button className="mt-4 w-full" variant="warm">Submit check-in</Button>
        </Card>
      </div>
    </AppShell>
  );
}

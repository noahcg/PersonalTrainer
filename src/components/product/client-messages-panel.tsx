"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Send } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { messages as demoMessages } from "@/lib/demo-data";
import { messagesChangedEventName, readDemoMessages, writeDemoMessages } from "@/lib/demo-message-storage";
import { createClient as createBrowserClient } from "@/lib/supabase-browser";
import type { ConversationParticipant, Message } from "@/lib/types";

export function ClientMessagesPanel({
  initialParticipant,
  initialMessages,
  initialTrainerProfile,
  mode,
}: {
  initialParticipant: ConversationParticipant;
  initialMessages: Message[];
  initialTrainerProfile: { fullName: string; photo: string };
  mode: "demo" | "supabase";
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [reply, setReply] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (mode !== "demo") return;

    const stored = readDemoMessages(demoMessages);
    const timeout = window.setTimeout(() => {
      setMessages(stored.filter((item) => item.clientId === initialParticipant.id));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [initialParticipant.id, mode]);

  const markTrainerMessagesRead = useEffectEvent(async () => {
    const readAt = new Date().toISOString();

    if (mode === "demo") {
      const stored = readDemoMessages(demoMessages);
      let changed = false;
      const nextMessages = stored.map((item) => {
        if (item.clientId !== initialParticipant.id || item.from !== "trainer" || item.readAt) return item;

        changed = true;
        return { ...item, readAt };
      });

      if (!changed) return;

      writeDemoMessages(nextMessages);
      setMessages(nextMessages.filter((item) => item.clientId === initialParticipant.id));
      return;
    }

    const supabase = createBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle<{ id: string }>();

    if (!client?.id) return;

    const { error } = await supabase
      .from("messages")
      .update({ read_at: readAt })
      .eq("client_id", client.id)
      .eq("kind", "message")
      .neq("sender_profile_id", user.id)
      .is("read_at", null);

    if (error) return;

    setMessages((current) =>
      current.map((item) => (item.clientId === client.id && item.from === "trainer" && !item.readAt ? { ...item, readAt } : item)),
    );
    window.dispatchEvent(new Event(messagesChangedEventName));
  });

  useEffect(() => {
    const transcript = transcriptRef.current;
    if (!transcript) return;

    transcript.scrollTop = transcript.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void markTrainerMessagesRead();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [initialParticipant.id, mode]);

  async function sendReply() {
    if (!reply.trim()) return;

    try {
      const body = reply.trim();

      if (mode === "supabase") {
        const supabase = createBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) throw new Error("You need an authenticated client session to send messages.");

        const { data: client } = await supabase
          .from("clients")
          .select("id, trainer_id, full_name")
          .eq("profile_id", user.id)
          .maybeSingle<{ id: string; trainer_id: string; full_name: string }>();

        if (!client?.id || !client.trainer_id) throw new Error("Client profile not found.");

        const { data: inserted, error } = await supabase
          .from("messages")
          .insert({
            trainer_id: client.trainer_id,
            client_id: client.id,
            sender_profile_id: user.id,
            kind: "message",
            body,
          })
          .select("id, body, created_at")
          .single<{ id: string; body: string; created_at: string }>();

        if (error || !inserted) throw error ?? new Error("Unable to send message.");

        setMessages((current) => [
          ...current,
          {
            id: inserted.id,
            from: "client",
            author: client.full_name,
            body: inserted.body,
            createdAt: new Date(inserted.created_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
            clientId: client.id,
            clientName: client.full_name,
          },
        ]);
      } else {
        const nextMessages = readDemoMessages(demoMessages);
        const nextMessage = {
          id: `message-${Date.now()}`,
          from: "client" as const,
          author: initialParticipant.name,
          body,
          createdAt: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
          clientId: initialParticipant.id,
          clientName: initialParticipant.name,
        } satisfies Message;
        const merged = [...nextMessages, nextMessage];
        writeDemoMessages(merged);
        setMessages(merged.filter((item) => item.clientId === initialParticipant.id));
      }

      setReply("");
      setMessage("Reply sent.");
      window.setTimeout(() => setMessage(null), 1800);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to send reply.");
      window.setTimeout(() => setMessage(null), 2200);
    }
  }

  return (
    <AppShell role="client" title="Messages" eyebrow="Trainer messages" subtitle="Reply directly to your trainer." mobileFocus>
      <div className="flex h-[calc(100dvh-15.5rem)] min-h-[23rem] max-w-4xl flex-col sm:h-[calc(100dvh-16rem)] sm:min-h-[24rem]">
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.25rem] p-2 sm:rounded-[2rem] sm:p-4">
          <div
            ref={transcriptRef}
            className="chat-scrollbar min-h-0 flex-1 overscroll-contain overflow-y-auto rounded-[1rem] border border-stone-200/80 bg-white/58 px-2.5 py-3 shadow-inner-soft sm:rounded-[1.6rem] sm:px-4 sm:py-5"
          >
            {messages.length ? (
              <div className="flex min-h-full flex-col justify-end pr-1 sm:pr-3">
                {messages.map((messageItem, index) => {
                  const previousFrom = messages[index - 1]?.from;
                  const nextFrom = messages[index + 1]?.from;
                  const startsGroup = previousFrom !== messageItem.from;
                  const endsGroup = nextFrom !== messageItem.from;
                  const isClientMessage = messageItem.from === "client";

                  return (
                    <div
                      key={messageItem.id}
                      className={`flex items-end gap-2 ${index === 0 ? "" : startsGroup ? "mt-3.5" : "mt-1"} ${isClientMessage ? "justify-end" : ""}`}
                    >
                      {messageItem.from === "trainer" ? (
                        endsGroup ? (
                          <Avatar name={initialTrainerProfile.fullName || messageItem.author} src={initialTrainerProfile.photo} className="size-8 sm:size-9" />
                        ) : (
                          <div className="size-8 shrink-0 sm:size-9" />
                        )
                      ) : null}
                      <div
                        className={`max-w-[86%] rounded-[1.1rem] px-3.5 py-2.5 sm:max-w-[72%] ${
                          isClientMessage
                            ? `rounded-br-md bg-charcoal-950 text-ivory-50 shadow-soft ${startsGroup ? "" : "rounded-tr-md"}`
                            : `rounded-bl-md border border-stone-200/80 bg-ivory-50 text-charcoal-950 ${startsGroup ? "" : "rounded-tl-md"}`
                        }`}
                      >
                        <p className="text-sm leading-5">{messageItem.body}</p>
                        {endsGroup ? (
                          <p className={`mt-1.5 text-[0.72rem] leading-4 ${isClientMessage ? "text-ivory-50/54" : "text-stone-500"}`}>{messageItem.createdAt}</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-full flex-col justify-end">
                <div className="rounded-[1.15rem] border border-stone-200/80 bg-ivory-50 px-4 py-3 text-sm leading-6 text-stone-600">No messages yet.</div>
              </div>
            )}
          </div>
          <div className="mt-2 flex flex-none gap-2 rounded-[1.15rem] border border-stone-200/80 bg-white/76 p-2 shadow-inner-soft sm:mt-3 sm:gap-3 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
            <Input
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.nativeEvent.isComposing) return;

                event.preventDefault();
                void sendReply();
              }}
              placeholder="Reply to Nick..."
              className="min-w-0 flex-1 rounded-full bg-white"
            />
            <Button variant="warm" onClick={() => void sendReply()} className="size-11 shrink-0 px-0 sm:size-auto sm:px-5" aria-label="Send reply">
              <Send className="size-4" />
              <span className="hidden sm:inline">Send</span>
            </Button>
          </div>
        </Card>
      </div>
      {message ? <div className="fixed bottom-24 right-3 z-40 rounded-full bg-charcoal-950 px-4 py-3 text-sm text-ivory-50 shadow-soft lg:right-6">{message}</div> : null}
    </AppShell>
  );
}

"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { brand } from "@/lib/brand";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { messages as demoMessages } from "@/lib/demo-data";
import { messagesChangedEventName, readDemoMessages, writeDemoMessages } from "@/lib/demo-message-storage";
import { createClient as createBrowserClient } from "@/lib/supabase-browser";
import type { ConversationParticipant, Message } from "@/lib/types";

export function TrainerMessagesManager({
  initialParticipants,
  initialMessages,
  mode,
}: {
  initialParticipants: ConversationParticipant[];
  initialMessages: Message[];
  mode: "demo" | "supabase";
}) {
  const participants = initialParticipants;
  const [messages, setMessages] = useState(initialMessages);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(() => initialParticipants[0]?.id ?? null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (mode !== "demo") return;

    const stored = readDemoMessages(demoMessages);
    const timeout = window.setTimeout(() => {
      setMessages(stored);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [mode]);

  const selectedClient = participants.find((participant) => participant.id === selectedClientId) ?? null;

  const threads = useMemo(() => {
    return participants.map((participant) => {
      const threadMessages = messages.filter((message) => message.clientId === participant.id);
      const latest = threadMessages[threadMessages.length - 1] ?? null;
      return {
        ...participant,
        latestTime: latest?.createdAt ?? "",
        total: threadMessages.length,
        unread: threadMessages.filter((message) => message.from === "client" && !message.readAt).length,
      };
    });
  }, [messages, participants]);

  const activeMessages = useMemo(
    () => messages.filter((message) => message.clientId === selectedClientId),
    [messages, selectedClientId],
  );

  useEffect(() => {
    const transcript = transcriptRef.current;
    if (!transcript) return;

    transcript.scrollTop = transcript.scrollHeight;
  }, [activeMessages, selectedClientId]);

  const markSelectedClientMessagesRead = useEffectEvent(async () => {
    if (!selectedClientId) return;

    const readAt = new Date().toISOString();

    if (mode === "demo") {
      const stored = readDemoMessages(demoMessages);
      let changed = false;
      const nextMessages = stored.map((item) => {
        if (item.clientId !== selectedClientId || item.from !== "client" || item.readAt) return item;

        changed = true;
        return { ...item, readAt };
      });

      if (!changed) return;

      writeDemoMessages(nextMessages);
      setMessages(nextMessages);
      return;
    }

    const supabase = createBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("messages")
      .update({ read_at: readAt })
      .eq("client_id", selectedClientId)
      .eq("kind", "message")
      .neq("sender_profile_id", user.id)
      .is("read_at", null);

    if (error) return;

    setMessages((current) =>
      current.map((item) => (item.clientId === selectedClientId && item.from === "client" && !item.readAt ? { ...item, readAt } : item)),
    );
    window.dispatchEvent(new Event(messagesChangedEventName));
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void markSelectedClientMessagesRead();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [mode, selectedClientId]);

  async function sendMessage() {
    if (!selectedClient || !draft.trim()) return;

    setBusy(true);
    try {
      const body = draft.trim();

      if (mode === "supabase") {
        const supabase = createBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) throw new Error("You need an authenticated trainer session to send messages.");

        const { data: trainer } = await supabase
          .from("trainers")
          .select("id")
          .eq("profile_id", user.id)
          .maybeSingle<{ id: string }>();

        if (!trainer?.id) throw new Error("Trainer profile not found.");

        const { data: inserted, error } = await supabase
          .from("messages")
          .insert({
            trainer_id: trainer.id,
            client_id: selectedClient.id,
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
            from: "trainer",
            author: brand.app.trainerLabel,
            body: inserted.body,
            createdAt: new Date(inserted.created_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
            clientId: selectedClient.id,
            clientName: selectedClient.name,
          },
        ]);
      } else {
        const nextMessages = [
          ...messages,
          {
            id: `message-${Date.now()}`,
            from: "trainer" as const,
            author: brand.app.trainerLabel,
            body,
            createdAt: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
            clientId: selectedClient.id,
            clientName: selectedClient.name,
          },
        ];
        setMessages(nextMessages);
        writeDemoMessages(nextMessages);
      }

      setDraft("");
      setStatus("Message sent.");
      window.setTimeout(() => setStatus(null), 1800);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to send message.");
      window.setTimeout(() => setStatus(null), 2200);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pb-5">
      {status ? (
        <Card className="mb-5 border-bronze-200 bg-bronze-50/70 p-4 text-sm text-stone-700">
          {status}
        </Card>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border bg-white/35 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.66rem] uppercase tracking-[0.28em] text-bronze-600">Inbox</p>
                <p className="mt-2 text-sm text-stone-500">{threads.length} shown</p>
              </div>
              <Badge variant="dark">{threads.length} total</Badge>
            </div>
          </div>
          <div className="max-h-[680px] space-y-3 overflow-y-auto p-4">
            {threads.length ? (
              threads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setSelectedClientId(thread.id)}
                  className={`w-full rounded-[1.25rem] border p-4 text-left transition ${
                    selectedClientId === thread.id ? "border-bronze-300 bg-bronze-50" : "border-stone-200 bg-white/70 hover:bg-stone-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={thread.name} src={thread.photo} className="size-10" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-charcoal-950">{thread.name}</p>
                        <div className="flex shrink-0 items-center gap-2">
                          {thread.unread > 0 ? (
                            <span className="min-w-5 rounded-full bg-bronze-200 px-1.5 py-0.5 text-center text-[10px] font-semibold leading-4 text-charcoal-950">
                              {thread.unread > 99 ? "99+" : thread.unread}
                            </span>
                          ) : null}
                          <span className="text-xs text-stone-400">{thread.latestTime || "No activity"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-[1.25rem] bg-stone-50 p-5 text-sm text-stone-500">
                No message threads yet.
              </div>
            )}
          </div>
        </Card>

        <Card className="flex min-h-[620px] flex-col overflow-hidden p-0">
          {selectedClient ? (
            <>
              <div className="flex items-center gap-3 border-b border-border bg-white/35 p-5">
                <Avatar name={selectedClient.name} src={selectedClient.photo} className="size-12" />
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-charcoal-950">{selectedClient.name}</p>
                  <p className="text-sm text-stone-500">Direct coaching conversation</p>
                </div>
              </div>

              <div ref={transcriptRef} className="min-h-0 flex-1 overflow-y-auto p-5">
                {activeMessages.length ? (
                  <div className="flex min-h-full flex-col justify-end gap-4">
                    {activeMessages.map((message) => (
                      <div key={message.id} className={`flex gap-3 ${message.from === "trainer" ? "justify-end" : ""}`}>
                        {message.from === "client" ? <Avatar name={message.author} src={selectedClient.photo} className="size-9" /> : null}
                        <div className={`max-w-[86%] rounded-[1.5rem] p-4 sm:max-w-[78%] ${message.from === "trainer" ? "bg-charcoal-950 text-ivory-50" : "bg-stone-50"}`}>
                          <p className="text-sm leading-6">{message.body}</p>
                          <p className={`mt-2 text-xs ${message.from === "trainer" ? "text-ivory-50/50" : "text-stone-500"}`}>{message.createdAt}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-full flex-col justify-end">
                    <div className="rounded-[1.25rem] bg-stone-50 p-5 text-sm text-stone-500">
                      No messages yet. Start the conversation with a direct coaching note.
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-border bg-stone-50/45 p-5">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" || event.nativeEvent.isComposing) return;

                      event.preventDefault();
                      void sendMessage();
                    }}
                    placeholder={`Message ${selectedClient.name}...`}
                  />
                  <Button variant="warm" onClick={sendMessage} disabled={busy}>
                    <Send className="size-4" />
                    {busy ? "Sending..." : "Send"}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="grid min-h-[420px] place-items-center text-center text-stone-500">
              <div>
                <MessageCircle className="mx-auto size-8 text-stone-300" />
                <p className="mt-4 text-sm">No client selected.</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

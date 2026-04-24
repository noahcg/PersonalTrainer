"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import { Mail, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

export function InviteComposeDialog({
  open,
  onOpenChange,
  title,
  description,
  defaultSubject,
  defaultMessage,
  busy = false,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  defaultSubject: string;
  defaultMessage: string;
  busy?: boolean;
  onSend: (draft: { subject: string; message: string }) => Promise<void>;
}) {
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultMessage);

  async function submit() {
    if (!subject.trim() || !message.trim()) return;
    await onSend({ subject: subject.trim(), message: message.trim() });
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-charcoal-950/35 backdrop-blur-sm" />
        <Dialog.Content asChild>
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[2rem] border border-white/70 bg-ivory-50 p-5 shadow-soft outline-none sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="font-serif text-4xl font-semibold text-charcoal-950">{title}</Dialog.Title>
                <Dialog.Description className="mt-2 text-sm leading-6 text-stone-600">{description}</Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Close invite dialog">
                  <X className="size-5" />
                </Button>
              </Dialog.Close>
            </div>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-charcoal-950">
                Subject
                <Input value={subject} onChange={(event) => setSubject(event.target.value)} />
              </label>
              <label className="grid gap-2 text-sm font-medium text-charcoal-950">
                Message
                <Textarea value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-52" />
              </label>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Dialog.Close asChild>
                <Button variant="secondary">Cancel</Button>
              </Dialog.Close>
              <Button variant="warm" onClick={() => void submit()} disabled={busy || !subject.trim() || !message.trim()}>
                <Mail className="size-4" />
                {busy ? "Sending..." : "Send invite"}
              </Button>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

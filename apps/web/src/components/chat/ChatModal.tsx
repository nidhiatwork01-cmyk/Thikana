import React, { useState, useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Send,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  Clock,
  Sparkles,
} from "lucide-react";
import { fetchChatMessages, sendChatMessage, markChatRead } from "../../lib/api";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: any | null; // HelpRequest object
}

const QUICK_PROMPTS = [
  "ðŸ’§ Is water 24/7 or dependent on tankers in this area?",
  "ðŸ² How is the food quality, taste, and hygiene in this PG?",
  "âš¡ Is power backup included or charged separately per unit?",
  "ðŸŽ¥ Could you do a quick in-person visit or video walkthrough?",
];

export const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose, request }) => {
  const queryClient = useQueryClient();
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const requestId = request?.id;

  // 1. Fetch message history
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["chat-messages", requestId],
    queryFn: () => (requestId ? fetchChatMessages(requestId) : Promise.resolve([])),
    enabled: Boolean(isOpen && requestId),
    refetchInterval: 3000, // Poll every 3 seconds for new messages
  });

  // 2. Mark messages as read when opening
  useEffect(() => {
    if (isOpen && requestId) {
      markChatRead(requestId).catch(() => {});
    }
  }, [isOpen, requestId, messages.length]);

  // 3. Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 4. Send Message Mutation
  const sendMutation = useMutation({
    mutationFn: (text: string) =>
      sendChatMessage(requestId!, text, [], `temp-${Date.now()}`),
    onSuccess: () => {
      setInputText("");
      queryClient.invalidateQueries({ queryKey: ["chat-messages", requestId] });
    },
  });

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || !requestId || sendMutation.isPending) return;
    sendMutation.mutate(text);
  };

  const handleQuickPrompt = (prompt: string) => {
    if (!requestId || sendMutation.isPending) return;
    sendMutation.mutate(prompt);
  };

  if (!request) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-[92vh] max-h-[700px] bg-white rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden border border-[#E2E8F0] animate-in zoom-in-95">
          {/* Header */}
          <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center font-extrabold text-sm border border-[#4F46E5]/20">
                {request.buddyName
                  ? request.buddyName
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  : "ðŸ¤"}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-[#0F172A] truncate">
                    {request.buddyName || "Local Buddy"}
                  </h3>
                  <span className="inline-flex items-center" title="Verified Local Resident">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  </span>
                </div>
                <p className="text-[11px] text-[#64748B] flex items-center gap-1">
                  <span>Target: {request.targetLocalities?.join(", ") || "Hyderabad"}</span>
                  <span>â€¢ Fee: â‚¹{request.agreedFee} (Direct UPI)</span>
                </p>
              </div>
            </div>

            <Dialog.Close asChild>
              <button
                type="button"
                className="w-8 h-8 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-stone-50 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Anti-Scam Shield Banner */}
          <div className="bg-amber-50/80 border-b border-amber-200/60 px-4 py-2 flex items-center gap-2 text-[11px] text-amber-900 shrink-0">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="leading-tight">
              <strong className="font-semibold">Anti-Scam Protection:</strong> Never pay gate pass fees, QR tokens, or booking advances before physically visiting.
            </p>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
            {/* Initial Note from Seeker */}
            <div className="p-3 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-[10px] text-[#64748B]">
                <span className="font-bold text-[#0F172A] flex items-center gap-1">
                  <Info className="w-3 h-3 text-[#4F46E5]" /> Request Scope
                </span>
                <span>{new Date(request.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-xs text-stone-700 italic">"{request.note}"</p>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-xs text-[#64748B]">
                Connecting to secure chat channel...
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center mx-auto text-sm font-bold">
                  ðŸ’¬
                </div>
                <h4 className="text-xs font-bold text-[#0F172A]">No Messages Yet</h4>
                <p className="text-[11px] text-[#64748B] max-w-xs mx-auto">
                  Ask your buddy about ground reality â€” water supply, electricity metering, caretaker attitude, or food hygiene.
                </p>
              </div>
            ) : (
              messages.map((m: any) => {
                const isSeekerMsg =
                  m.senderId === request.seekerId || m.senderName?.includes("Seeker");

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isSeekerMsg ? "items-end" : "items-start"}`}
                  >
                    <span className="text-[10px] text-[#64748B] mb-1 px-1">
                      {m.senderName || (isSeekerMsg ? "You" : request.buddyName)}
                    </span>

                    {/* Scam Alert Warning Card */}
                    {m.isFlaggedScam && (
                      <div className="max-w-[85%] mb-1.5 p-2.5 rounded-2xl bg-red-50 border border-red-300 text-red-900 text-xs shadow-xs space-y-1 animate-pulse">
                        <div className="flex items-center gap-1.5 font-bold text-red-700">
                          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                          <span>âš ï¸ SCAM ALERT FLAGGED</span>
                        </div>
                        <p className="text-[11px] leading-tight">
                          This message mentions known rental fraud patterns (e.g., gate pass fees, QR code scams, or advance token before inspection). Genuine PGs in Hyderabad NEVER demand gate pass fees.
                        </p>
                      </div>
                    )}

                    {/* Chat Bubble */}
                    <div
                      className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                        isSeekerMsg
                          ? "bg-[#4F46E5] text-white rounded-br-xs"
                          : "bg-white text-[#0F172A] border border-[#E2E8F0] rounded-bl-xs"
                      } ${m.isFlaggedScam ? "border-2 border-red-500" : ""}`}
                    >
                      {m.text}
                    </div>

                    <span className="text-[9px] text-[#94A3B8] mt-0.5 px-1 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                );
              })
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="bg-white border-t border-[#F1F5F9] px-3 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            <span className="text-[10px] font-bold text-[#64748B] shrink-0 flex items-center gap-1 mr-1">
              <Sparkles className="w-3 h-3 text-[#4F46E5]" /> Quick Ask:
            </span>
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickPrompt(prompt)}
                disabled={sendMutation.isPending}
                className="px-2.5 py-1 rounded-full text-[11px] bg-[#F8FAFC] border border-[#E2E8F0] text-stone-700 hover:border-[#4F46E5] hover:text-[#4F46E5] transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSend}
            className="p-3 bg-white border-t border-[#E2E8F0] flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask about water supply, food quality, or room visits..."
              className="flex-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl px-3.5 py-2.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors"
              disabled={sendMutation.isPending}
            />

            <button
              type="submit"
              disabled={!inputText.trim() || sendMutation.isPending}
              className="w-10 h-10 rounded-2xl bg-[#4F46E5] text-white flex items-center justify-center hover:bg-[#4338CA] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs shrink-0"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

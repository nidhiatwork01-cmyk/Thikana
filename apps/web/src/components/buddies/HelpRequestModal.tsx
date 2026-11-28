import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  MessageSquare,
  Phone,
  Footprints,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { createBuddyHelpRequest } from "../../lib/api";

interface HelpRequestModalProps {
  buddy: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const HelpRequestModal: React.FC<HelpRequestModalProps> = ({
  buddy,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [channel, setChannel] = useState<"TEXT" | "PHONE" | "VIDEO" | "IN_PERSON">("TEXT");
  const [targetLocalities, setTargetLocalities] = useState<string[]>(
    buddy?.serviceLocalities || ["Madhapur"]
  );
  const [maxBudget, setMaxBudget] = useState("12000");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!buddy) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (note.trim().length < 10) {
      setErrorMsg("Please provide at least 10 characters describing what help you need.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      await createBuddyHelpRequest({
        buddyId: buddy.id,
        channel,
        targetLocalities: targetLocalities.length > 0 ? targetLocalities : [buddy.serviceLocalities[0] || "Madhapur"],
        maxBudget: Number(maxBudget) || 12000,
        note,
        agreedFee: Number(buddy.hourlyFee) || 150,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send help request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const channelOptions = [
    { id: "TEXT", label: "Text Guidance", icon: MessageSquare, desc: "Quick chat & owner checks" },
    { id: "PHONE", label: "Phone Call", icon: Phone, desc: "Direct phone consultation" },
    { id: "IN_PERSON", label: "In-Person Tour", icon: Footprints, desc: "Walk neighborhood together" },
  ];

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 animate-fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-[#E2E8F0] z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex items-center justify-between shrink-0 bg-[#F8FAFC]">
            <div>
              <Dialog.Title className="text-base font-bold text-[#0F172A]">
                Request Help from {buddy.fullName}
              </Dialog.Title>
              <p className="text-xs text-[#64748B]">
                Get local insider advice on PGs, water supply, and street safety
              </p>
            </div>

            <Dialog.Close asChild>
              <button
                type="button"
                className="p-2 rounded-full text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. Channel Selector */}
            <div>
              <label className="block font-bold text-[#64748B] uppercase tracking-wider mb-2">
                Preferred Mode of Help
              </label>
              <div className="grid grid-cols-3 gap-2">
                {channelOptions.map((opt) => {
                  const isSelected = channel === opt.id;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setChannel(opt.id as any)}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        isSelected
                          ? "bg-[#EEF2FF] text-[#4F46E5] border-[#4F46E5] shadow-2xs font-semibold"
                          : "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0] hover:bg-[#F1F5F9]"
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-1" />
                      <span className="font-bold text-[11px] text-[#0F172A]">{opt.label}</span>
                      <span className="text-[10px] text-[#64748B] mt-0.5">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Target Localities */}
            <div>
              <label className="block font-bold text-[#64748B] uppercase tracking-wider mb-1.5">
                Neighborhoods You Are Exploring
              </label>
              <div className="flex flex-wrap gap-1.5">
                {buddy.serviceLocalities.map((loc: string) => {
                  const isSelected = targetLocalities.includes(loc);
                  return (
                    <button
                      key={loc}
                      type="button"
                      onClick={() =>
                        setTargetLocalities((prev) =>
                          isSelected ? prev.filter((l) => l !== loc) : [...prev, loc]
                        )
                      }
                      className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                        isSelected
                          ? "bg-[#4F46E5] text-white border-[#4F46E5]"
                          : "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]"
                      }`}
                    >
                      {loc}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Budget */}
            <div>
              <label className="block font-bold text-[#64748B] uppercase tracking-wider mb-1.5">
                Your Monthly PG Budget (â‚¹)
              </label>
              <input
                type="number"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#E2E8F0] text-xs font-semibold focus:outline-none focus:border-[#4F46E5]"
              />
            </div>

            {/* 4. Note */}
            <div>
              <label className="block font-bold text-[#64748B] uppercase tracking-wider mb-1.5">
                What advice or help do you need? *
              </label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Moving next week for a job at Cyber Towers. Need to know which streets in Madhapur have 24/7 water supply and no water tanker shortage."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#E2E8F0] text-xs focus:outline-none focus:border-[#4F46E5]"
              />
            </div>

            {/* 5. Trust & Transparent Off-Platform Payment Guidance */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Fair Helper Fee Agreement: â‚¹{buddy.hourlyFee}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-emerald-800">
                You pay this nominal token fee directly to your buddy via UPI only after your session is completed. Thikana takes zero cut. Never pay any advance deposit before meeting.
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] font-bold text-xs text-[#64748B] hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-xs shadow-xs transition-colors"
              >
                {isSubmitting ? "Sending Request..." : `Send Request (â‚¹${buddy.hourlyFee})`}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

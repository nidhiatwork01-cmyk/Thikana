import React, { useState, useMemo } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Sparkles, UserCheck, ShieldCheck, Check } from "lucide-react";
import { optInAsBuddy } from "../../lib/api";

interface BecomeBuddyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LOCALITIES = [
  "Madhapur",
  "HITEC City",
  "Gachibowli",
  "Kondapur",
  "Ameerpet",
  "Begumpet",
  "Kukatpally",
  "Financial District",
];

const LANGUAGES = ["English", "Telugu", "Hindi", "Tamil", "Kannada", "Urdu"];
const DAYS = ["SAT", "SUN", "FRI", "MON-FRI"];

const QUICK_PHRASES = [
  "verify 24/7 water supply & geyser pressure",
  "check real food hygiene & mess taste",
  "spot hidden electricity or deposit clauses",
  "accompany for weekend in-person PG visits",
];

export const BecomeBuddyModal: React.FC<BecomeBuddyModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedLocalities, setSelectedLocalities] = useState<string[]>(["Madhapur"]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["English", "Hindi"]);
  const [selectedDays, setSelectedDays] = useState<string[]>(["SAT", "SUN"]);
  const [hourlyFee, setHourlyFee] = useState<number>(150);
  const [bio, setBio] = useState("");
  const [isNotBroker, setIsNotBroker] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    if (list.includes(item)) {
      if (list.length > 1) setList(list.filter((x) => x !== item));
    } else {
      setList([...list, item]);
    }
  };

  // Smart incoming text recommendation based on user's rough line + selections
  const recommendedBio = useMemo(() => {
    const areas = selectedLocalities.join(" & ") || "Madhapur";
    const langs = selectedLanguages.join(", ") || "English";
    const trimmed = bio.trim();

    if (!trimmed) {
      return `Local resident in ${areas} (speaks ${langs}). Happy to help newcomers verify real 24/7 water supply, food hygiene, and fair deposit terms before you pay any token.`;
    }

    const lower = trimmed.toLowerCase();
    const hints: string[] = [];
    if (lower.includes("water")) hints.push("tanker vs 24/7 water supply");
    if (lower.includes("food") || lower.includes("mess")) hints.push("mess food quality & kitchen hygiene");
    if (lower.includes("noise") || lower.includes("traffic")) hints.push("street noise & ventilation");
    if (lower.includes("deposit") || lower.includes("rent") || lower.includes("scam")) {
      hints.push("hidden electricity/deposit clauses");
    }

    const focus =
      hints.length > 0
        ? hints.join(", ")
        : "water pressure, food hygiene, and landlord credibility";

    const baseLine = trimmed.endsWith(".") ? trimmed : `${trimmed}.`;
    return `${baseLine} Based in ${areas} (${langs}), I can help you inspect ${focus} and share honest local ground reality before you book.`;
  }, [bio, selectedLocalities, selectedLanguages]);

  const mutation = useMutation({
    mutationFn: optInAsBuddy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buddies"] });
      setFullName("");
      setPhone("");
      setBio("");
      setIsNotBroker(false);
      setErrorMsg(null);
      onClose();
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || "Could not submit your buddy profile");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isNotBroker) {
      setErrorMsg("Please confirm that you are a real resident and not a broker.");
      return;
    }

    mutation.mutate({
      fullName,
      phone,
      bio,
      languages: selectedLanguages,
      serviceLocalities: selectedLocalities,
      hourlyFee,
      availableDays: selectedDays,
      isDeclaredNotBroker: true,
    });
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-lg max-h-[90vh] bg-white rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden border border-[#E2E8F0] animate-in zoom-in-95">
          {/* Header */}
          <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-5 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <Dialog.Title className="text-base font-extrabold text-[#0F172A] font-display">
                  Become a Local Buddy
                </Dialog.Title>
                <p className="text-[11px] text-[#64748B]">
                  Help newcomers avoid PG scams & inspect rooms in your area
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 font-semibold">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#0F172A] mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Nidhi Singh"
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#0F172A] mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98490 XXXXX"
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>
            </div>

            {/* Neighborhoods */}
            <div>
              <label className="block font-bold text-[#0F172A] mb-1.5">
                Areas You Know Well *
              </label>
              <div className="flex flex-wrap gap-1.5">
                {LOCALITIES.map((loc) => {
                  const active = selectedLocalities.includes(loc);
                  return (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => toggleItem(selectedLocalities, setSelectedLocalities, loc)}
                      className={`px-2.5 py-1 rounded-full font-semibold transition-colors border ${
                        active
                          ? "bg-[#4F46E5] text-white border-[#4F46E5]"
                          : "bg-[#F8FAFC] text-stone-600 border-[#E2E8F0] hover:border-stone-400"
                      }`}
                    >
                      {loc}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Languages & Days */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#0F172A] mb-1.5">Languages *</label>
                <div className="flex flex-wrap gap-1.5">
                  {LANGUAGES.map((lang) => {
                    const active = selectedLanguages.includes(lang);
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => toggleItem(selectedLanguages, setSelectedLanguages, lang)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                          active
                            ? "bg-[#0F172A] text-white border-[#0F172A]"
                            : "bg-[#F8FAFC] text-stone-600 border-[#E2E8F0]"
                        }`}
                      >
                        {lang}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] mb-1.5">Available Days</label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map((day) => {
                    const active = selectedDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleItem(selectedDays, setSelectedDays, day)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                          active
                            ? "bg-emerald-700 text-white border-emerald-700"
                            : "bg-[#F8FAFC] text-stone-600 border-[#E2E8F0]"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Fee */}
            <div>
              <label className="block font-bold text-[#0F172A] mb-1.5">
                Visit / Help Fee (₹)
              </label>
              <div className="flex gap-2">
                {[
                  { value: 0, label: "Free (Volunteer)" },
                  { value: 150, label: "₹150 / help" },
                  { value: 250, label: "₹250 / visit" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setHourlyFee(opt.value)}
                    className={`flex-1 py-1.5 rounded-xl font-bold border transition-colors ${
                      hourlyFee === opt.value
                        ? "bg-[#EEF2FF] text-[#4F46E5] border-[#4F46E5]"
                        : "bg-[#F8FAFC] text-stone-600 border-[#E2E8F0]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description with Smart Text Recommender */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-[#0F172A]">
                  Short Bio / How You Can Help *
                </label>
                <span className="text-[10px] text-[#4F46E5] font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Smart Bio Assist
                </span>
              </div>

              <textarea
                rows={3}
                required
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write one quick line (e.g. 'Living in Madhapur 2 yrs, know good PGs and water issues')..."
                className="w-full p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] focus:outline-none focus:border-[#4F46E5] leading-relaxed"
              />

              {/* Quick Phrase Chips */}
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {QUICK_PHRASES.map((phrase) => (
                  <button
                    key={phrase}
                    type="button"
                    onClick={() =>
                      setBio((prev) =>
                        prev.trim() ? `${prev.trim().replace(/\.$/, "")}, can ${phrase}.` : `I can ${phrase}.`
                      )
                    }
                    className="px-2 py-0.5 rounded-full bg-stone-100 hover:bg-[#EEF2FF] text-stone-700 hover:text-[#4F46E5] text-[10px] font-medium transition-colors"
                  >
                    + {phrase}
                  </button>
                ))}
              </div>

              {/* Live Incoming Text Recommendation Card */}
              <div className="mt-2.5 p-3 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    Recommended Incoming Text
                  </span>
                  <button
                    type="button"
                    onClick={() => setBio(recommendedBio)}
                    className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold flex items-center gap-1 transition-colors"
                  >
                    <Check className="w-3 h-3" /> Use This Text
                  </button>
                </div>
                <p className="text-[11px] text-amber-950 leading-relaxed italic">
                  "{recommendedBio}"
                </p>
              </div>
            </div>

            {/* Non-Broker Declaration */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 cursor-pointer">
              <input
                type="checkbox"
                checked={isNotBroker}
                onChange={(e) => setIsNotBroker(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-emerald-600"
              />
              <span className="text-[11px] text-emerald-900 font-medium leading-snug">
                <strong className="flex items-center gap-1 text-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5" /> Zero-Brokerage Pledge:
                </strong>
                I confirm I am a local resident/student/professional and <strong>NOT</strong> a PG broker or commission agent.
              </span>
            </label>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] font-bold text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold shadow-xs disabled:opacity-50"
              >
                {mutation.isPending ? "Publishing..." : "Publish Buddy Profile"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

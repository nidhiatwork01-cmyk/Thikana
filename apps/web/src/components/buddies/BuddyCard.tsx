import React from "react";
import {
  ShieldCheck,
  Star,
  MapPin,
  Clock,
  Languages,
  MessageCircle,
} from "lucide-react";

interface BuddyCardProps {
  buddy: any;
  onRequestHelp: (buddy: any) => void;
}

export const BuddyCard: React.FC<BuddyCardProps> = ({ buddy, onRequestHelp }) => {
  const initials = buddy.fullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="bg-white rounded-2xl border border-[#E7E5E4] p-4.5 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FDEEE9] text-[#D9532F] flex items-center justify-center font-extrabold text-base font-display shrink-0 border border-[#D9532F]/20">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-bold text-[#1C1917] truncate">
                  {buddy.fullName}
                </h3>
                {buddy.verificationTier !== "NONE" && (
                  <span title="Verified Local Resident" className="inline-flex items-center">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  </span>
                )}
              </div>
              <p className="text-xs text-[#78716C] flex items-center gap-1 mt-0.5">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span className="font-bold text-[#1C1917]">{buddy.rating}</span>
                <span>({buddy.totalReviews} reviews)</span>
              </p>
            </div>
          </div>

          {/* Fee Pill */}
          <div className="text-right shrink-0">
            <span className="text-base font-extrabold font-display text-[#1C1917]">
              ₹{buddy.hourlyFee}
            </span>
            <span className="text-[11px] text-[#78716C] block font-normal">/help session</span>
          </div>
        </div>

        {/* Bio */}
        <p className="text-xs text-[#78716C] mt-3 line-clamp-2 leading-relaxed">
          {buddy.bio}
        </p>

        {/* Localities & Languages */}
        <div className="mt-3.5 space-y-2">
          {/* Service Localities */}
          <div className="flex flex-wrap gap-1">
            {buddy.serviceLocalities.map((loc: string) => (
              <span
                key={loc}
                className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#FAF9F6] border border-[#E7E5E4] text-[#1C1917]"
              >
                <MapPin className="w-2.5 h-2.5 text-[#D9532F]" />
                <span>{loc}</span>
              </span>
            ))}
          </div>

          {/* Languages & Timing */}
          <div className="flex items-center justify-between text-[11px] text-[#78716C] pt-1 border-t border-[#F3F1EC]">
            <span className="flex items-center gap-1 truncate">
              <Languages className="w-3 h-3 text-[#78716C]" />
              <span>{buddy.languages.join(", ")}</span>
            </span>

            <span className="flex items-center gap-1 shrink-0">
              <Clock className="w-3 h-3 text-emerald-600" />
              <span>~{buddy.avgResponseMinutes}m reply</span>
            </span>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-3 border-t border-[#F3F1EC] flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md flex items-center gap-1">
          <span>🛡️</span> Declared Non-Broker
        </span>

        <button
          type="button"
          onClick={() => onRequestHelp(buddy)}
          className="px-3.5 py-2 rounded-xl bg-[#D9532F] hover:bg-[#BF4321] text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>Request Help</span>
        </button>
      </div>
    </div>
  );
};

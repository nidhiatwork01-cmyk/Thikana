import React from "react";
import { MapPin, CheckCircle2, Utensils } from "lucide-react";
import { useCommuteStore } from "../../store/commuteStore";
import type { CommutePGListing } from "@thikana/shared-types";

interface PGCardPreviewProps {
  pg: CommutePGListing;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const PGCardPreview: React.FC<PGCardPreviewProps> = ({
  pg,
  isSelected = false,
  onSelect,
}) => {
  const { setHoveredPgId, travelMode } = useCommuteStore();

  const modeEmoji = travelMode === "bike" ? "ðŸï¸" : travelMode === "car" ? "ðŸš—" : "ðŸš‡";

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHoveredPgId(pg.id)}
      onMouseLeave={() => setHoveredPgId(null)}
      className={`group relative bg-white rounded-xl p-3.5 border transition-all cursor-pointer flex gap-3 shadow-xs hover:shadow-md ${
        isSelected
          ? "border-[#4F46E5] ring-2 ring-[#4F46E5]/20 bg-[#EEF2FF]/30"
          : "border-[#E2E8F0] hover:border-[#4F46E5]/60"
      }`}
    >
      {/* Thumbnail */}
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden shrink-0 bg-[#F1F5F9]">
        {pg.coverImageUrl ? (
          <img
            src={pg.coverImageUrl}
            alt={pg.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#64748B] text-xs font-semibold">
            Thikana PG
          </div>
        )}

        {/* Gender Pill */}
        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-black/75 text-white backdrop-blur-xs">
          {pg.gender === "MEN" ? "Boys" : pg.gender === "WOMEN" ? "Girls" : "Co-Ed"}
        </span>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          {/* Commute Time Badge */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#EEF2FF] text-[#4F46E5]">
              <span>{modeEmoji}</span>
              <span>{pg.estimatedCommuteMinutes} min commute</span>
            </span>
            <span className="text-[11px] text-[#64748B]">â€¢ {pg.distanceKm} km</span>
          </div>

          {/* Title */}
          <h3 className="text-sm font-bold text-[#0F172A] truncate group-hover:text-[#4F46E5] transition-colors flex items-center gap-1">
            <span>{pg.title}</span>
            {pg.isVerified && (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 inline" />
            )}
          </h3>

          {/* Address */}
          <p className="text-xs text-[#64748B] truncate mt-0.5 flex items-center gap-1">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{pg.address}</span>
          </p>
        </div>

        {/* Price & Features Footer */}
        <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-[#F1F5F9]">
          <div>
            <span className="text-base font-extrabold font-display text-[#0F172A]">
              â‚¹{pg.minRent.toLocaleString()}
            </span>
            <span className="text-[11px] text-[#64748B] font-normal"> /mo</span>
          </div>

          {pg.isFoodIncluded && (
            <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded">
              <Utensils className="w-2.5 h-2.5" /> Food Incl.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Heart,
  ChevronLeft,
  ChevronRight,
  Scale,
  MessageCircle,
} from "lucide-react";
import { useCommuteStore } from "../../store/commuteStore";
import { useShortlistStore } from "../../store/shortlistStore";
import type { CommutePGListing } from "@thikana/shared-types";

interface PGCardProps {
  pg: CommutePGListing;
  isSelected?: boolean;
  onSelect?: () => void;
  onOpenDetails?: () => void;
}

export const PGCard: React.FC<PGCardProps> = ({
  pg,
  isSelected = false,
  onSelect,
  onOpenDetails,
}) => {
  const { setHoveredPgId, travelMode } = useCommuteStore();
  const { isShortlisted, toggleShortlist, isInCompare, toggleCompare } =
    useShortlistStore();

  const [currentImageIdx, setCurrentImageIdx] = useState(0);

  const shortlisted = isShortlisted(pg.id);
  const inCompare = isInCompare(pg.id);

  const images = pg.images.length > 0 ? pg.images : [pg.coverImageUrl || ""];
  const modeEmoji = travelMode === "bike" ? "🏍️" : travelMode === "car" ? "🚗" : "🚇";

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIdx((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHoveredPgId(pg.id)}
      onMouseLeave={() => setHoveredPgId(null)}
      className={`group bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md cursor-pointer flex flex-col ${
        isSelected
          ? "border-[#D9532F] ring-2 ring-[#D9532F]/20"
          : "border-[#E7E5E4] hover:border-[#D9532F]/50"
      }`}
    >
      {/* ------------------------------------------------------------- */}
      {/* Image Carousel & Floating Badges                              */}
      {/* ------------------------------------------------------------- */}
      <div className="relative w-full aspect-16/10 bg-[#F3F1EC] overflow-hidden">
        {images[currentImageIdx] ? (
          <img
            src={images[currentImageIdx]}
            alt={pg.title}
            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-[#78716C]">
            Thikana Verified PG
          </div>
        )}

        {/* Carousel Arrows (visible when multiple images) */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prevImage}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={nextImage}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1 z-10">
              {images.map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === currentImageIdx ? "bg-white w-3" : "bg-white/60"
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide bg-black/65 text-white backdrop-blur-md">
            {pg.gender === "MEN" ? "Boys" : pg.gender === "WOMEN" ? "Girls" : "Co-Living"}
            {pg.isVerified ? " · Verified" : ""}
          </span>
        </div>

        {/* Floating Commute Pill (Bottom-Left of Image) */}
        <div className="absolute bottom-2.5 left-2.5 z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/95 text-[#1C1917] shadow-sm backdrop-blur-md">
            <span>{modeEmoji}</span>
            <span>{pg.estimatedCommuteMinutes} min</span>
          </span>
        </div>

        {/* Shortlist Heart Button (Optimistic Micro-interaction) */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.8 }}
          onClick={(e) => {
            e.stopPropagation();
            toggleShortlist(pg.id);
          }}
          aria-label={shortlisted ? "Remove from shortlist" : "Add to shortlist"}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md shadow-md transition-colors z-10 ${
            shortlisted
              ? "bg-[#D9532F] text-white"
              : "bg-white/85 text-[#1C1917] hover:bg-white hover:text-[#D9532F]"
          }`}
        >
          <motion.div
            animate={shortlisted ? { scale: [1, 1.35, 1] } : { scale: 1 }}
            transition={{ duration: 0.25 }}
          >
            <Heart
              className={`w-4 h-4 ${shortlisted ? "fill-current" : ""}`}
            />
          </motion.div>
        </motion.button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Card Content & Pricing                                        */}
      {/* ------------------------------------------------------------- */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1">
          {/* Title & Distance */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm sm:text-base font-bold text-[#1C1917] group-hover:text-[#D9532F] transition-colors truncate">
              {pg.title}
            </h3>
            <span className="text-[11px] text-[#78716C] shrink-0 font-medium">
              {pg.distanceKm} km
            </span>
          </div>

          {/* Clean Short Location */}
          <p className="text-xs text-[#78716C] truncate">
            {pg.address}
          </p>

          {/* Minimal 1-line Summary */}
          <p className="text-[11px] font-medium text-stone-500 pt-0.5">
            {pg.sharingTypes
              .map((st) =>
                st === "SINGLE" ? "1-Bed" : st === "DOUBLE" ? "2-Bed" : st === "TRIPLE" ? "3-Bed" : "4+"
              )
              .join(" · ")}
            {pg.isFoodIncluded ? " · Meals Included" : ""}
          </p>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* Price & Action Footer                                       */}
        {/* ----------------------------------------------------------- */}
        <div className="pt-2.5 border-t border-[#F3F1EC] flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black font-display text-[#1C1917]">
              ₹{pg.minRent.toLocaleString()}
            </span>
            <span className="text-[11px] text-[#78716C]">/mo</span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* WhatsApp Quick Action */}
            <a
              href={`https://wa.me/91${(pg as any).contactPhone ? (pg as any).contactPhone.replace(/\D/g, "") : "9849012345"}?text=Hi!%20I%20found%20${encodeURIComponent(pg.title)}%20on%20Thikana.%20Is%20a%20bed%20available?`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Chat with manager on WhatsApp"
              className="p-2 rounded-xl text-xs font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all flex items-center justify-center"
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </a>

            {/* Compare Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleCompare(pg.id);
              }}
              title="Add to side-by-side compare"
              className={`p-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1 ${
                inCompare
                  ? "bg-[#1C1917] text-white border-[#1C1917]"
                  : "bg-white text-[#78716C] border-[#E7E5E4] hover:bg-[#FAF9F6] hover:text-[#1C1917]"
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
            </button>

            {/* View Details Trigger */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenDetails) onOpenDetails();
                else if (onSelect) onSelect();
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-[#FAF9F6] text-[#D9532F] border border-[#D9532F]/30 hover:bg-[#D9532F] hover:text-white transition-all shadow-2xs"
            >
              View Rooms
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

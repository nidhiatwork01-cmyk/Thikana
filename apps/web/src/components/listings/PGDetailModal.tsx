import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  MapPin,
  CheckCircle2,
  Phone,
  MessageSquare,
  Clock,
  Calendar,
  AlertTriangle,
  Heart,
  Scale,
  Sparkles,
  Bed,
} from "lucide-react";
import { fetchPgDetails, PGDetailData } from "../../lib/api";
import { useShortlistStore } from "../../store/shortlistStore";

interface PGDetailModalProps {
  pgId: string | null;
  onClose: () => void;
}

export const PGDetailModal: React.FC<PGDetailModalProps> = ({ pgId, onClose }) => {
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [showPhone, setShowPhone] = useState(false);

  const { isShortlisted, toggleShortlist, isInCompare, toggleCompare } =
    useShortlistStore();

  const { data: pg, isLoading, error } = useQuery<PGDetailData>({
    queryKey: ["pg-detail", pgId],
    queryFn: () => fetchPgDetails(pgId!),
    enabled: Boolean(pgId),
  });

  if (!pgId) return null;

  const shortlisted = pg ? isShortlisted(pg.id) : false;
  const inCompare = pg ? isInCompare(pg.id) : false;

  return (
    <Dialog.Root open={Boolean(pgId)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 animate-fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-[#E7E5E4] z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#E7E5E4] flex items-center justify-between shrink-0 bg-white z-10">
            <div className="flex items-center gap-2 max-w-[70%]">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-black/80 text-white">
                {pg?.gender === "MEN" ? "Boys" : pg?.gender === "WOMEN" ? "Girls" : "Co-Living"}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-[#1C1917] truncate">
                {pg?.title || "Loading..."}
              </h2>
            </div>

            <div className="flex items-center gap-1.5">
              {pg && (
                <>
                  <button
                    type="button"
                    onClick={() => toggleShortlist(pg.id)}
                    className={`p-2 rounded-full border transition-colors ${
                      shortlisted
                        ? "bg-[#D9532F] text-white border-[#D9532F]"
                        : "bg-white text-[#78716C] border-[#E7E5E4] hover:text-[#D9532F]"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${shortlisted ? "fill-current" : ""}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleCompare(pg.id)}
                    className={`p-2 rounded-full border transition-colors ${
                      inCompare
                        ? "bg-[#1C1917] text-white border-[#1C1917]"
                        : "bg-white text-[#78716C] border-[#E7E5E4] hover:text-[#1C1917]"
                    }`}
                  >
                    <Scale className="w-4 h-4" />
                  </button>
                </>
              )}

              <Dialog.Close asChild>
                <button
                  type="button"
                  className="p-2 rounded-full text-[#78716C] hover:bg-[#F3F1EC] hover:text-[#1C1917]"
                >
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-8 h-8 rounded-full border-2 border-[#D9532F] border-t-transparent animate-spin mx-auto" />
                <p className="text-xs text-[#78716C]">Loading full accommodation details...</p>
              </div>
            ) : error || !pg ? (
              <div className="p-8 text-center text-red-600">
                Failed to load property details.
              </div>
            ) : (
              <div className="space-y-6 pb-6">
                {/* 1. Gallery Section */}
                <div className="relative aspect-16/9 bg-[#F3F1EC] overflow-hidden">
                  {pg.images[activeImageIdx] ? (
                    <img
                      src={pg.images[activeImageIdx]!.url}
                      alt={pg.images[activeImageIdx]!.altText || pg.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-[#78716C]">
                      No Image Available
                    </div>
                  )}

                  {/* Thumbnail Row */}
                  {pg.images.length > 1 && (
                    <div className="absolute bottom-3 inset-x-3 flex gap-2 overflow-x-auto p-1.5 bg-black/40 backdrop-blur-md rounded-xl">
                      {pg.images.map((img, idx) => (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => setActiveImageIdx(idx)}
                          className={`w-14 h-10 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                            idx === activeImageIdx ? "border-white scale-105" : "border-transparent opacity-60"
                          }`}
                        >
                          <img src={img.url} alt="thumbnail" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="px-5 sm:px-6 space-y-6">
                  {/* Address & Verified Status */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-[#78716C] flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-[#D9532F]" />
                        <span>{pg.address}</span>
                      </p>
                      <p className="text-xs text-[#1C1917] font-semibold mt-1">
                        Locality: {pg.locality?.name || "Hyderabad Corridor"}
                      </p>
                    </div>

                    {pg.isVerified && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 fill-current" /> Verified Property
                      </span>
                    )}
                  </div>

                  {/* 2. Room Sharing & Pricing Breakdown */}
                  <div>
                    <h3 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <Bed className="w-4 h-4 text-[#D9532F]" />
                      Room Sharing & Rent Options
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {pg.rooms.map((room) => (
                        <div
                          key={room.id}
                          className="p-3 rounded-xl border border-[#E7E5E4] bg-[#FAF9F6] flex flex-col justify-between"
                        >
                          <div>
                            <span className="text-xs font-bold text-[#1C1917]">
                              {room.sharingType === "SINGLE"
                                ? "Single Room (Private)"
                                : room.sharingType === "DOUBLE"
                                ? "2 Sharing"
                                : room.sharingType === "TRIPLE"
                                ? "3 Sharing"
                                : "4+ Sharing"}
                            </span>
                            <div className="text-base font-black font-display text-[#1C1917] mt-1">
                              ₹{Number(room.rentPerMonth).toLocaleString()}
                              <span className="text-[10px] text-[#78716C] font-normal"> /mo</span>
                            </div>
                          </div>

                          <div className="mt-2 pt-2 border-t border-[#E7E5E4] flex items-center justify-between text-[11px]">
                            <span className="text-[#78716C]">Available:</span>
                            <span className={`font-semibold ${room.availableBeds > 0 ? "text-emerald-700" : "text-red-600"}`}>
                              {room.availableBeds > 0 ? `${room.availableBeds} beds` : "Full"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. Fee & Deposit Transparency */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-[#FDEEE9]/40 border border-[#D9532F]/20">
                    <div>
                      <span className="text-[11px] text-[#78716C]">Security Deposit</span>
                      <p className="text-sm font-bold text-[#1C1917]">
                        ₹{Number(pg.depositAmount).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] text-[#78716C]">Monthly Maintenance</span>
                      <p className="text-sm font-bold text-[#1C1917]">
                        {Number(pg.maintenanceFee) > 0
                          ? `₹${Number(pg.maintenanceFee).toLocaleString()}`
                          : "Included in Rent"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] text-[#78716C]">Food Facility</span>
                      <p className="text-sm font-bold text-[#1C1917]">
                        {pg.isFoodIncluded
                          ? "Food Included (3 Times)"
                          : "Separate / Self-cook"}
                      </p>
                    </div>
                  </div>

                  {/* 4. Amenities Grid */}
                  <div>
                    <h3 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#D9532F]" />
                      Included Amenities
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {pg.amenities.map((a) => (
                        <div
                          key={a.amenity.id}
                          className="p-2.5 rounded-xl border border-[#E7E5E4] bg-white flex items-center gap-2 text-xs font-medium text-[#1C1917]"
                        >
                          <span className="w-2 h-2 rounded-full bg-[#D9532F]" />
                          <span>{a.amenity.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 5. House Rules & Notice */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl border border-[#E7E5E4] bg-[#FAF9F6]">
                      <span className="text-[11px] text-[#78716C] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#D9532F]" /> Curfew Time
                      </span>
                      <p className="text-sm font-bold text-[#1C1917] mt-0.5">
                        {pg.curfewTime || "No Curfew"}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl border border-[#E7E5E4] bg-[#FAF9F6]">
                      <span className="text-[11px] text-[#78716C] flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#D9532F]" /> Notice Period
                      </span>
                      <p className="text-sm font-bold text-[#1C1917] mt-0.5">
                        {pg.rulesNoticePeriod || "30 Days"}
                      </p>
                    </div>
                  </div>

                  {/* Safety Tip Alert */}
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>
                      <strong>Tenant Safety Tip:</strong> Never transfer deposit funds online before visiting the room in person and taking move-in inspection photos (use our Deposit Shield).
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Direct Contact Action */}
          {pg && (
            <div className="p-4 border-t border-[#E7E5E4] bg-white flex items-center justify-between gap-3 shrink-0">
              <div>
                <span className="text-[11px] text-[#78716C]">Starting from</span>
                <div className="text-lg font-black font-display text-[#1C1917]">
                  ₹{Number(pg.minRent).toLocaleString()}
                  <span className="text-xs font-normal text-[#78716C]">/mo</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {showPhone ? (
                  <a
                    href={`tel:${pg.contactPhone}`}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs"
                  >
                    <Phone className="w-4 h-4" />
                    <span>{pg.contactPhone}</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowPhone(true)}
                    className="px-4 py-2.5 rounded-xl bg-[#D9532F] hover:bg-[#BF4321] text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Contact Owner</span>
                  </button>
                )}

                <a
                  href={`https://wa.me/91${pg.contactPhone.replace(/\D/g, "")}?text=Hi,%20I%20found%20${encodeURIComponent(pg.title)}%20on%20Thikana.%20Is%20a%20room%20available?`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-[#E7E5E4] hover:bg-[#F3F1EC] text-emerald-600 font-semibold text-xs flex items-center justify-center transition-colors"
                  title="Chat on WhatsApp"
                >
                  <MessageSquare className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

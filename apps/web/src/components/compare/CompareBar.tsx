import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Scale, X, ArrowRight, Check, Minus } from "lucide-react";
import { useShortlistStore } from "../../store/shortlistStore";
import { useCommuteStore } from "../../store/commuteStore";
import type { CommutePGListing } from "@thikana/shared-types";

interface CompareBarProps {
  allPgs: CommutePGListing[];
}

export const CompareBar: React.FC<CompareBarProps> = ({ allPgs }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { compareIds, toggleCompare, clearCompare } = useShortlistStore();
  const { travelMode, destination } = useCommuteStore();

  if (compareIds.length === 0) return null;

  const comparedPgs = compareIds
    .map((id) => allPgs.find((p) => p.id === id))
    .filter(Boolean) as CommutePGListing[];

  const modeEmoji = travelMode === "bike" ? "🏍️" : travelMode === "car" ? "🚗" : "🚇";

  return (
    <>
      {/* Floating Compare Dock */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-[#0F172A] text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-stone-800 animate-slide-up">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#4F46E5] flex items-center justify-center text-xs">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold">
              Compare ({compareIds.length}/3 PGs)
            </span>
            <p className="text-[10px] text-stone-400">Side-by-side comparison</p>
          </div>
        </div>

        {/* Selected Thumbnails */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-stone-700">
          {comparedPgs.map((pg) => (
            <div key={pg.id} className="relative group">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-stone-800 border border-stone-700">
                {pg.coverImageUrl ? (
                  <img src={pg.coverImageUrl} alt={pg.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[8px]">PG</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => toggleCompare(pg.id)}
                className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-600 text-white flex items-center justify-center text-[9px]"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5 pl-2">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-xs flex items-center gap-1 transition-colors"
          >
            <span>Compare</span>
            <ArrowRight className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={clearCompare}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white text-xs"
            title="Clear all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Comparison Modal */}
      <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 animate-fade-in" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-[#E2E8F0] z-50 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC] shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <Dialog.Title className="text-base font-bold text-[#0F172A]">
                    Side-by-Side Accommodation Comparison
                  </Dialog.Title>
                  <p className="text-xs text-[#64748B]">
                    Commute calculated towards {destination.name.split(",")[0]}
                  </p>
                </div>
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

            {/* Comparison Matrix Table */}
            <div className="p-5 overflow-x-auto flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0]">
                    <th className="p-3 font-bold text-[#64748B] uppercase tracking-wider w-1/4">
                      Criteria
                    </th>
                    {comparedPgs.map((pg) => (
                      <th key={pg.id} className="p-3 font-bold text-[#0F172A] w-1/3">
                        <div className="space-y-1.5">
                          <div className="h-24 w-full rounded-xl overflow-hidden bg-[#F1F5F9]">
                            {pg.coverImageUrl && (
                              <img src={pg.coverImageUrl} alt={pg.title} className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="font-bold text-sm truncate">{pg.title}</div>
                          <div className="text-[11px] text-[#64748B] font-normal truncate">{pg.address}</div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {/* Commute Time */}
                  <tr className="bg-[#F8FAFC]">
                    <td className="p-3 font-bold text-[#0F172A]">Commute Time</td>
                    {comparedPgs.map((pg) => (
                      <td key={pg.id} className="p-3">
                        <span className="inline-flex items-center gap-1 font-bold text-xs text-[#4F46E5]">
                          {modeEmoji} {pg.estimatedCommuteMinutes} mins
                        </span>
                        <span className="text-[#64748B] text-[11px] block">{pg.distanceKm} km</span>
                      </td>
                    ))}
                  </tr>

                  {/* Monthly Rent */}
                  <tr>
                    <td className="p-3 font-bold text-[#0F172A]">Starting Rent</td>
                    {comparedPgs.map((pg) => (
                      <td key={pg.id} className="p-3 text-sm font-extrabold font-display text-[#0F172A]">
                        ₹{pg.minRent.toLocaleString()}/mo
                      </td>
                    ))}
                  </tr>

                  {/* Security Deposit */}
                  <tr>
                    <td className="p-3 font-bold text-[#0F172A]">Security Deposit</td>
                    {comparedPgs.map((pg) => (
                      <td key={pg.id} className="p-3 font-semibold text-[#0F172A]">
                        ₹{pg.depositAmount.toLocaleString()}
                      </td>
                    ))}
                  </tr>

                  {/* Gender */}
                  <tr>
                    <td className="p-3 font-bold text-[#0F172A]">Gender Type</td>
                    {comparedPgs.map((pg) => (
                      <td key={pg.id} className="p-3 font-semibold text-[#0F172A]">
                        {pg.gender === "MEN" ? "Boys" : pg.gender === "WOMEN" ? "Girls" : "Co-Living"}
                      </td>
                    ))}
                  </tr>

                  {/* Food Facility */}
                  <tr>
                    <td className="p-3 font-bold text-[#0F172A]">Food Included</td>
                    {comparedPgs.map((pg) => (
                      <td key={pg.id} className="p-3">
                        {pg.isFoodIncluded ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Yes ({pg.foodType})
                          </span>
                        ) : (
                          <span className="text-[#64748B] flex items-center gap-1">
                            <Minus className="w-3.5 h-3.5" /> No food
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Sharing Types */}
                  <tr>
                    <td className="p-3 font-bold text-[#0F172A]">Room Sharing</td>
                    {comparedPgs.map((pg) => (
                      <td key={pg.id} className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {pg.sharingTypes.map((s) => (
                            <span key={s} className="px-1.5 py-0.5 rounded text-[10px] bg-[#F8FAFC] border border-[#E2E8F0]">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
};

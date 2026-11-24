import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { APP_CONFIG } from "@thikana/shared-types";
import {
  Compass,
  Users,
  ShieldCheck,
  Clock,
  Info,
  SlidersHorizontal,
  Heart,
} from "lucide-react";
import { useCommuteStore } from "./store/commuteStore";
import { useShortlistStore } from "./store/shortlistStore";
import { searchPGsInCommuteZone } from "./lib/api";
import { CommuteMap } from "./components/map/CommuteMap";
import { CommuteControlBar } from "./components/commute/CommuteControlBar";
import { BottomSheet } from "./components/layout/BottomSheet";
import { PGCard } from "./components/listings/PGCard";
import { FilterModal } from "./components/filters/FilterModal";
import { PGDetailModal } from "./components/listings/PGDetailModal";
import { CompareBar } from "./components/compare/CompareBar";
import { HuntCopilotView } from "./components/hunt/HuntCopilotView";
import { LocalBuddiesView } from "./components/buddies/LocalBuddiesView";
import { DepositShieldView } from "./components/shield/DepositShieldView";

export default function App() {
  const [activeTab, setActiveTab] = useState<"commute" | "hunt" | "buddies" | "shield">(
    "commute"
  );
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [inspectingPgId, setInspectingPgId] = useState<string | null>(null);
  const [showOnlySaved, setShowOnlySaved] = useState(false);

  const {
    destination,
    arrivalTime,
    travelMode,
    maxMinutes,
    gender,
    maxBudget,
    sharingType,
    foodType,
    sortBy,
    selectedPgId,
    setSelectedPgId,
  } = useCommuteStore();

  const { shortlistedIds, isShortlisted } = useShortlistStore();

  // Fetch Commute Isochrone & PGs inside the zone via TanStack Query
  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      "commute-search",
      destination.lat,
      destination.lng,
      arrivalTime,
      travelMode,
      maxMinutes,
      gender,
      maxBudget,
      sharingType,
      foodType,
      sortBy,
    ],
    queryFn: () =>
      searchPGsInCommuteZone({
        destLat: destination.lat,
        destLng: destination.lng,
        arrivalTime,
        travelMode,
        maxMinutes,
        gender,
        maxBudget,
        sharingType,
        foodType,
        sortBy,
      }),
    staleTime: 1000 * 60 * 3, // 3 minutes
  });

  const rawPgs = data?.pgs || [];
  const isochrone = data?.isochrone || null;
  const totalCount = data?.total || 0;

  // Filter for saved PGs if user toggles heart tab
  const displayedPgs = showOnlySaved
    ? rawPgs.filter((p) => isShortlisted(p.id))
    : rawPgs;

  const activeFilterCount = [
    gender,
    maxBudget,
    sharingType,
    foodType,
    sortBy !== "commute" ? sortBy : undefined,
  ].filter(Boolean).length;

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#FAF9F6] flex flex-col font-sans">
      {/* ------------------------------------------------------------- */}
      {/* App Header Bar                                                */}
      {/* ------------------------------------------------------------- */}
      <header className="h-14 sm:h-16 shrink-0 bg-white border-b border-[#E7E5E4] px-4 sm:px-6 flex items-center justify-between z-30 shadow-xs">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#D9532F] flex items-center justify-center text-white shadow-sm font-bold text-lg sm:text-xl font-display">
            ठ
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-[#1C1917] font-display">
                {APP_CONFIG.name}
              </span>
              <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-[#FDEEE9] text-[#D9532F]">
                {APP_CONFIG.city}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation (Desktop & Tablet) */}
        <nav className="hidden sm:flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("commute")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeTab === "commute"
                ? "bg-[#D9532F] text-white shadow-xs"
                : "text-[#78716C] hover:bg-[#F3F1EC] hover:text-[#1C1917]"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Commute Map</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("hunt")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === "hunt"
                ? "bg-[#D9532F] text-white shadow-xs"
                : "text-[#78716C] hover:bg-[#F3F1EC] hover:text-[#1C1917]"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Hunt Copilot</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("buddies")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === "buddies"
                ? "bg-[#D9532F] text-white shadow-xs"
                : "text-[#78716C] hover:bg-[#F3F1EC] hover:text-[#1C1917]"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Buddies</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("shield")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === "shield"
                ? "bg-[#D9532F] text-white shadow-xs"
                : "text-[#78716C] hover:bg-[#F3F1EC] hover:text-[#1C1917]"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Deposit Shield</span>
          </button>
        </nav>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* Main View Area                                                */}
      {/* ------------------------------------------------------------- */}
      <main className="flex-1 relative overflow-hidden">
        {activeTab === "commute" ? (
          <>
            {/* MapLibre Immersive Base */}
            <div className="absolute inset-0 z-0">
              <CommuteMap
                isochrone={isochrone}
                pgs={displayedPgs}
                isLoading={isLoading}
              />
            </div>

            {/* Bottom Sheet on Mobile / Left Sidebar on Desktop */}
            <BottomSheet
              totalCount={displayedPgs.length}
              headerContent={
                <div className="space-y-3">
                  <CommuteControlBar
                    totalResults={totalCount}
                    isLoading={isLoading}
                  />

                  {/* Filter & Shortlist Toggle Row */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setIsFilterModalOpen(true)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        activeFilterCount > 0
                          ? "bg-[#1C1917] text-white border-[#1C1917]"
                          : "bg-white text-[#1C1917] border-[#E7E5E4] hover:bg-[#F3F1EC]"
                      }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#D9532F]" />
                      <span>Filters</span>
                      {activeFilterCount > 0 && (
                        <span className="w-4 h-4 rounded-full bg-[#D9532F] text-white text-[10px] flex items-center justify-center font-bold">
                          {activeFilterCount}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowOnlySaved(!showOnlySaved)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        showOnlySaved
                          ? "bg-[#D9532F] text-white border-[#D9532F]"
                          : "bg-white text-[#78716C] border-[#E7E5E4] hover:text-[#1C1917]"
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          showOnlySaved || shortlistedIds.length > 0 ? "fill-current" : ""
                        }`}
                      />
                      <span>Saved ({shortlistedIds.length})</span>
                    </button>
                  </div>
                </div>
              }
            >
              {/* Listings Stream */}
              {isLoading && !displayedPgs.length ? (
                <div className="space-y-3 p-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="bg-white rounded-2xl p-4 border border-[#E7E5E4] animate-pulse flex flex-col gap-3"
                    >
                      <div className="w-full aspect-16/10 bg-[#E7E5E4] rounded-xl" />
                      <div className="space-y-2">
                        <div className="h-4 bg-[#E7E5E4] rounded w-2/3" />
                        <div className="h-3 bg-[#E7E5E4] rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : isError ? (
                <div className="p-6 text-center bg-white rounded-xl border border-red-200">
                  <p className="text-sm font-semibold text-red-600">
                    Failed to fetch commute zone
                  </p>
                  <p className="text-xs text-[#78716C] mt-1">
                    {(error as Error)?.message || "Please check your network and try again."}
                  </p>
                </div>
              ) : displayedPgs.length === 0 ? (
                <div className="p-6 text-center bg-white rounded-xl border border-[#E7E5E4] space-y-2">
                  <Info className="w-8 h-8 text-[#D9532F] mx-auto opacity-70" />
                  <h4 className="text-sm font-bold text-[#1C1917]">
                    {showOnlySaved
                      ? "No saved PGs in this commute zone"
                      : `No PGs found within ${maxMinutes} minutes`}
                  </h4>
                  <p className="text-xs text-[#78716C] max-w-xs mx-auto">
                    {showOnlySaved
                      ? "Tap the heart icon on any PG card to save it to your shortlist."
                      : "Try sliding your commute time to 25 or 30 minutes, or adjust your budget filters."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between text-[11px] text-[#78716C] px-1 font-medium">
                    <span>
                      {showOnlySaved ? "Saved PGs" : "Sorted by fastest commute"}
                    </span>
                    <span>{displayedPgs.length} properties</span>
                  </div>

                  {displayedPgs.map((pg) => (
                    <PGCard
                      key={pg.id}
                      pg={pg}
                      isSelected={selectedPgId === pg.id}
                      onSelect={() => setSelectedPgId(pg.id)}
                      onOpenDetails={() => setInspectingPgId(pg.id)}
                    />
                  ))}
                </div>
              )}
            </BottomSheet>

            {/* Filter Modal */}
            <FilterModal
              isOpen={isFilterModalOpen}
              onClose={() => setIsFilterModalOpen(false)}
            />

            {/* Full PG Inspection Details Modal */}
            <PGDetailModal
              pgId={inspectingPgId}
              onClose={() => setInspectingPgId(null)}
            />

            {/* Floating Compare Dock */}
            <CompareBar allPgs={rawPgs} />
          </>
        ) : activeTab === "hunt" ? (
          <HuntCopilotView />
        ) : activeTab === "buddies" ? (
          <LocalBuddiesView />
        ) : (
          <DepositShieldView />
        )}
      </main>

      {/* ------------------------------------------------------------- */}
      {/* Mobile Bottom Navigation Bar (sm:hidden)                       */}
      {/* ------------------------------------------------------------- */}
      <nav className="sm:hidden h-14 bg-white/95 backdrop-blur-md border-t border-[#E7E5E4] px-2 flex items-center justify-around shrink-0 z-30 shadow-lg">
        <button
          type="button"
          onClick={() => setActiveTab("commute")}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-bold transition-colors ${
            activeTab === "commute" ? "text-[#D9532F]" : "text-[#78716C]"
          }`}
        >
          <Clock className="w-4 h-4 mb-0.5" />
          <span>Commute</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("hunt")}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-bold transition-colors ${
            activeTab === "hunt" ? "text-[#D9532F]" : "text-[#78716C]"
          }`}
        >
          <Compass className="w-4 h-4 mb-0.5" />
          <span>Copilot</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("buddies")}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-bold transition-colors ${
            activeTab === "buddies" ? "text-[#D9532F]" : "text-[#78716C]"
          }`}
        >
          <Users className="w-4 h-4 mb-0.5" />
          <span>Buddies</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("shield")}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-bold transition-colors ${
            activeTab === "shield" ? "text-[#D9532F]" : "text-[#78716C]"
          }`}
        >
          <ShieldCheck className="w-4 h-4 mb-0.5" />
          <span>Shield</span>
        </button>
      </nav>
    </div>
  );
}

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
    searchQuery,
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

  // Filter for search query (PG name or address)
  const filteredBySearch = searchQuery.trim()
    ? rawPgs.filter((p) => {
        const q = searchQuery.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q)
        );
      })
    : rawPgs;

  // Filter for saved PGs if user toggles heart tab
  const displayedPgs = showOnlySaved
    ? filteredBySearch.filter((p) => isShortlisted(p.id))
    : filteredBySearch;

  const activeFilterCount = [
    gender,
    maxBudget,
    sharingType,
    foodType,
    sortBy !== "commute" ? sortBy : undefined,
  ].filter(Boolean).length;

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#F8FAFC] flex flex-col font-sans">
      {/* ------------------------------------------------------------- */}
      {/* App Header Bar                                                */}
      {/* ------------------------------------------------------------- */}
      <header className="h-14 sm:h-16 shrink-0 bg-white border-b border-[#E2E8F0] px-4 sm:px-6 flex items-center justify-between z-30">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#4338CA] flex items-center justify-center text-white shadow-sm font-bold text-lg font-display">
            ठ
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xl tracking-tight text-[#0F172A] font-display">
              {APP_CONFIG.name}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#4F46E5] border border-[#4F46E5]/15">
              {APP_CONFIG.city}
            </span>
          </div>
        </div>

        {/* Segmented Pill Navigation (Desktop & Tablet) */}
        <nav className="hidden sm:flex items-center gap-1 p-1 rounded-full bg-[#F1F5F9] border border-[#E2E8F0]/80">
          {[
            { id: "commute" as const, label: "Commute Map", icon: Clock },
            { id: "hunt" as const, label: "Hunt Copilot", icon: Compass },
            { id: "buddies" as const, label: "Buddies", icon: Users },
            { id: "shield" as const, label: "Deposit Shield", icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 md:px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? "bg-white text-[#0F172A] shadow-xs"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? "text-[#4F46E5]" : ""}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
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
              headerContent={(panelControls) => (
                <CommuteControlBar
                  totalResults={totalCount}
                  isLoading={isLoading}
                  panelControls={panelControls}
                  quickActions={
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsFilterModalOpen(true)}
                        className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          activeFilterCount > 0
                            ? "bg-[#0F172A] text-white border-[#0F172A]"
                            : "bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0] hover:bg-stone-100"
                        }`}
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5 text-[#4F46E5]" />
                        <span>Filters</span>
                        {activeFilterCount > 0 && (
                          <span className="w-4 h-4 rounded-full bg-[#4F46E5] text-white text-[10px] flex items-center justify-center font-bold">
                            {activeFilterCount}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowOnlySaved(!showOnlySaved)}
                        className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          showOnlySaved
                            ? "bg-[#4F46E5] text-white border-[#4F46E5]"
                            : "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0] hover:text-[#0F172A]"
                        }`}
                        title="Show saved PGs only"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            showOnlySaved || shortlistedIds.length > 0 ? "fill-current text-[#4F46E5]" : ""
                          } ${showOnlySaved ? "text-white!" : ""}`}
                        />
                        <span>{shortlistedIds.length}</span>
                      </button>
                    </div>
                  }
                />
              )}
            >
              {(isDesktopExpanded) =>
                isLoading && !displayedPgs.length ? (
                  <div className="space-y-3 p-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="bg-white rounded-2xl p-4 border border-[#E2E8F0] animate-pulse flex flex-col gap-3"
                      >
                        <div className="w-full aspect-16/10 bg-[#E2E8F0] rounded-xl" />
                        <div className="space-y-2">
                          <div className="h-4 bg-[#E2E8F0] rounded w-2/3" />
                          <div className="h-3 bg-[#E2E8F0] rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : isError ? (
                  <div className="p-6 text-center bg-white rounded-xl border border-red-200">
                    <p className="text-sm font-semibold text-red-600">
                      Failed to fetch commute zone
                    </p>
                    <p className="text-xs text-[#64748B] mt-1">
                      {(error as Error)?.message || "Please check your network and try again."}
                    </p>
                  </div>
                ) : displayedPgs.length === 0 ? (
                  <div className="p-6 text-center bg-white rounded-xl border border-[#E2E8F0] space-y-2">
                    <Info className="w-8 h-8 text-[#4F46E5] mx-auto opacity-70" />
                    <h4 className="text-sm font-bold text-[#0F172A]">
                      {showOnlySaved
                        ? "No saved PGs in this commute zone"
                        : `No PGs found within ${maxMinutes} minutes`}
                    </h4>
                    <p className="text-xs text-[#64748B] max-w-xs mx-auto">
                      {showOnlySaved
                        ? "Tap the heart icon on any PG card to save it to your shortlist."
                        : "Try sliding your commute time to 25 or 30 minutes, or adjust your budget filters."}
                    </p>
                  </div>
                ) : (
                  <div
                    className={
                      isDesktopExpanded
                        ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                        : "space-y-3.5"
                    }
                  >
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
                )
              }
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
      <nav className="sm:hidden h-14 bg-white/95 backdrop-blur-md border-t border-[#E2E8F0] px-2 flex items-center justify-around shrink-0 z-30 shadow-lg">
        <button
          type="button"
          onClick={() => setActiveTab("commute")}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-bold transition-colors ${
            activeTab === "commute" ? "text-[#4F46E5]" : "text-[#64748B]"
          }`}
        >
          <Clock className="w-4 h-4 mb-0.5" />
          <span>Commute</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("hunt")}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-bold transition-colors ${
            activeTab === "hunt" ? "text-[#4F46E5]" : "text-[#64748B]"
          }`}
        >
          <Compass className="w-4 h-4 mb-0.5" />
          <span>Copilot</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("buddies")}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-bold transition-colors ${
            activeTab === "buddies" ? "text-[#4F46E5]" : "text-[#64748B]"
          }`}
        >
          <Users className="w-4 h-4 mb-0.5" />
          <span>Buddies</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("shield")}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-bold transition-colors ${
            activeTab === "shield" ? "text-[#4F46E5]" : "text-[#64748B]"
          }`}
        >
          <ShieldCheck className="w-4 h-4 mb-0.5" />
          <span>Shield</span>
        </button>
      </nav>
    </div>
  );
}

import React, { useState } from "react";
import { motion } from "motion/react";
import { ChevronUp, ChevronDown, List, Map as MapIcon } from "lucide-react";
import { useCommuteStore, BottomSheetSnap } from "../../store/commuteStore";

interface BottomSheetProps {
  children: React.ReactNode;
  headerContent?: React.ReactNode;
  totalCount: number;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  children,
  headerContent,
  totalCount,
}) => {
  const { bottomSheetSnap, setBottomSheetSnap } = useCommuteStore();
  const [isMobileListMode, setIsMobileListMode] = useState(false);

  // Height mappings for mobile drawer
  const snapHeights: Record<BottomSheetSnap, string> = {
    peek: "160px",
    half: "50vh",
    full: "88vh",
  };

  const toggleSnap = () => {
    if (bottomSheetSnap === "peek") setBottomSheetSnap("half");
    else if (bottomSheetSnap === "half") setBottomSheetSnap("full");
    else setBottomSheetSnap("half");
  };

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* DESKTOP SPLIT VIEW: Floating Left Panel (lg and above)        */}
      {/* ------------------------------------------------------------- */}
      <div className="hidden lg:flex flex-col absolute top-4 left-4 bottom-4 w-[430px] z-20 bg-[#FAF9F6]/95 backdrop-blur-md rounded-2xl shadow-xl border border-[#E7E5E4] overflow-hidden">
        {/* Panel Header & Commute Controls */}
        <div className="p-4 border-b border-[#E7E5E4] shrink-0 bg-white/70">
          {headerContent}
        </div>

        {/* Scrollable Listings / Results */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {children}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MOBILE BOTTOM SHEET (below lg)                                */}
      {/* ------------------------------------------------------------- */}
      <div className="lg:hidden">
        {/* Mobile View Toggle FAB */}
        <div className="fixed bottom-6 right-6 z-30">
          <button
            type="button"
            onClick={() => setIsMobileListMode(!isMobileListMode)}
            className="flex items-center gap-2 bg-[#1C1917] text-white px-4 py-2.5 rounded-full shadow-lg font-semibold text-xs tracking-wide active:scale-95 transition-transform"
          >
            {isMobileListMode ? (
              <>
                <MapIcon className="w-4 h-4 text-[#D9532F]" /> Map View
              </>
            ) : (
              <>
                <List className="w-4 h-4 text-[#D9532F]" /> List ({totalCount})
              </>
            )}
          </button>
        </div>

        {/* Draggable Drawer */}
        <motion.div
          animate={{
            height: isMobileListMode ? "90vh" : snapHeights[bottomSheetSnap],
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-0 inset-x-0 z-20 bg-[#FAF9F6] border-t border-[#E7E5E4] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Drawer Handle & Header */}
          <div
            onClick={toggleSnap}
            className="w-full pt-3 pb-2 px-4 flex flex-col items-center cursor-pointer bg-white border-b border-[#E7E5E4] shrink-0 select-none"
          >
            {/* Grab Bar */}
            <div className="w-12 h-1.5 rounded-full bg-[#D6D3D1] mb-2" />

            <div className="w-full flex items-center justify-between">
              <span className="text-xs font-bold text-[#1C1917]">
                {totalCount} PGs matching commute
              </span>

              <button
                type="button"
                className="p-1 rounded-full text-[#78716C] hover:text-[#1C1917]"
              >
                {bottomSheetSnap === "full" ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Controls Bar in Drawer */}
          <div className="p-3 bg-white border-b border-[#E7E5E4] shrink-0 max-h-[35vh] overflow-y-auto">
            {headerContent}
          </div>

          {/* Listings Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
            {children}
          </div>
        </motion.div>
      </div>
    </>
  );
};

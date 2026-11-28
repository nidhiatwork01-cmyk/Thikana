import React, { useState } from "react";
import * as Slider from "@radix-ui/react-slider";
import { motion } from "motion/react";
import {
  Bike,
  Car,
  Train,
  Clock,
  Navigation,
  Zap,
  ChevronUp,
  SlidersHorizontal,
  Search,
  X,
} from "lucide-react";
import { useCommuteStore, HYDERABAD_HUBS } from "../../store/commuteStore";
import type { TravelMode } from "@thikana/shared-types";

interface CommuteControlBarProps {
  totalResults: number;
  isLoading?: boolean;
  quickActions?: React.ReactNode;
  panelControls?: React.ReactNode;
}

export const CommuteControlBar: React.FC<CommuteControlBarProps> = ({
  totalResults,
  isLoading = false,
  quickActions,
  panelControls,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    destination,
    arrivalTime,
    travelMode,
    maxMinutes,
    gender,
    searchQuery,
    setDestination,
    setArrivalTime,
    setTravelMode,
    setMaxMinutes,
    setGender,
    setSearchQuery,
  } = useCommuteStore();

  // Traffic congestion badge indicator based on arrival time
  const isPeakHour = (() => {
    const [h, m] = arrivalTime.split(":").map(Number);
    const decimal = (h ?? 9) + (m ?? 0) / 60;
    return (decimal >= 8.0 && decimal <= 10.5) || (decimal >= 17.5 && decimal <= 20.0);
  })();

  const travelModes: Array<{ id: TravelMode; label: string; icon: any; tip: string }> = [
    { id: "bike", label: "Bike / 2W", icon: Bike, tip: "Fastest in traffic" },
    { id: "car", label: "Cab / Car", icon: Car, tip: "Subject to jams" },
    { id: "transit", label: "Metro / Walk", icon: Train, tip: "Predictable" },
  ];

  return (
    <div className="space-y-2.5">
      {/* Top Row: Hub Info + Commute Toggle + Panel Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center shrink-0">
            <Navigation className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs sm:text-sm font-bold text-[#0F172A] truncate">
                {destination.name.split(",")[0]}
              </p>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-700 shrink-0">
                {totalResults} PGs
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] flex items-center gap-1">
              <span>{maxMinutes} min</span>
              <span>Â· {travelMode === "bike" ? "Bike" : travelMode === "car" ? "Car" : "Metro"}</span>
              {isPeakHour && <span className="text-[#4F46E5] font-semibold">Â· Peak Traffic</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all border ${
              isExpanded
                ? "bg-[#0F172A] text-white border-[#0F172A]"
                : "bg-[#F8FAFC] text-[#4F46E5] border-[#E2E8F0] hover:border-[#4F46E5]/40 hover:bg-[#EEF2FF]"
            }`}
            title={isExpanded ? "Hide commute settings" : "Change workplace, time or travel mode"}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Done</span>
              </>
            ) : (
              <>
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Commute</span>
              </>
            )}
          </button>
          {panelControls}
        </div>
      </div>

      {/* Second Row: Search Input + Filters + Saved inline */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search PG or area..."
            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-8 pr-7 py-1.5 text-xs text-[#0F172A] placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-[#4F46E5] transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {quickActions}
      </div>

      {isExpanded && (
        <div className="space-y-3 pt-2 border-t border-[#F1F5F9] animate-in fade-in duration-200">
          {/* 1. Destination Hub Chips */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Select Workplace Hub
              </label>
              <span className="text-[10px] text-[#64748B]">
                Or click on map to drop pin
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {HYDERABAD_HUBS.map((hub) => {
                const isSelected =
                  Math.abs(hub.lat - destination.lat) < 0.001 &&
                  Math.abs(hub.lng - destination.lng) < 0.001;

                return (
                  <button
                    key={hub.name}
                    type="button"
                    onClick={() =>
                      setDestination({ lat: hub.lat, lng: hub.lng, name: hub.name })
                    }
                    className={`whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-[#4F46E5] text-white shadow-sm ring-2 ring-[#4F46E5]/20"
                        : "bg-[#F8FAFC] text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] border border-[#E2E8F0]"
                    }`}
                  >
                    {hub.shortName}
                  </button>
                );
              })}
            </div>
          </div>

      {/* 2. Signature Animated Commute Slider */}
      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#0F172A]">Max Commute Time</span>
            {isLoading && (
              <span className="inline-block w-2 h-2 rounded-full bg-[#4F46E5] animate-pulse" />
            )}
          </div>
          <div className="flex items-baseline gap-1">
            <motion.span
              key={maxMinutes}
              initial={{ scale: 1.2, color: "#4F46E5" }}
              animate={{ scale: 1, color: "#0F172A" }}
              className="text-2xl font-black font-display text-[#0F172A]"
            >
              {maxMinutes}
            </motion.span>
            <span className="text-xs font-semibold text-[#64748B]">minutes</span>
          </div>
        </div>

        {/* Radix Accessible Slider */}
        <Slider.Root
          className="relative flex items-center select-none touch-none w-full h-6 cursor-pointer"
          value={[maxMinutes]}
          min={10}
          max={60}
          step={5}
          onValueChange={(val) => setMaxMinutes(val[0] ?? 30)}
        >
          <Slider.Track className="bg-[#E2E8F0] relative grow rounded-full h-2.5 overflow-hidden">
            <Slider.Range className="absolute bg-[#4F46E5] h-full" />
          </Slider.Track>
          <Slider.Thumb
            className="block w-6 h-6 bg-white border-3 border-[#4F46E5] shadow-lg rounded-full hover:scale-110 focus:outline-none focus:ring-4 focus:ring-[#4F46E5]/25 transition-transform"
            aria-label="Commute cutoff in minutes"
          />
        </Slider.Root>

        {/* Reach Hint */}
        <div className="flex justify-between items-center text-[11px] text-[#64748B] mt-2 font-medium">
          <span>10m (Walking / Hyperlocal)</span>
          <span className="hidden sm:inline">30m (Target Workzone)</span>
          <span>60m (Outer Ring Road)</span>
        </div>
      </div>

      {/* 3. Mode & Time Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Mode Selector */}
        <div>
          <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">
            Commute Mode
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {travelModes.map((mode) => {
              const isSelected = travelMode === mode.id;
              const Icon = mode.icon;

              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setTravelMode(mode.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-[#EEF2FF] text-[#4F46E5] border-[#4F46E5] shadow-sm font-semibold"
                      : "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                  }`}
                >
                  <Icon className="w-4 h-4 mb-1" />
                  <span className="text-[11px]">{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Arrival Time */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Arrival Time
            </label>
            {isPeakHour ? (
              <span className="text-[10px] font-bold text-[#4F46E5] flex items-center gap-0.5 bg-[#EEF2FF] px-1.5 py-0.5 rounded">
                <Zap className="w-3 h-3 fill-current" /> Peak Traffic
              </span>
            ) : (
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                Normal Flow
              </span>
            )}
          </div>

          <div className="flex gap-1.5">
            {["08:30", "09:00", "09:30", "10:00"].map((timeStr) => (
              <button
                key={timeStr}
                type="button"
                onClick={() => setArrivalTime(timeStr)}
                className={`flex-1 py-2 px-1 text-xs rounded-xl border font-medium text-center transition-all ${
                  arrivalTime === timeStr
                    ? "bg-[#0F172A] text-white border-[#0F172A]"
                    : "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0] hover:bg-[#F1F5F9]"
                }`}
              >
                {timeStr}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Results Bar & Quick Filters */}
      <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0] text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[#0F172A]">{totalResults} PGs</span>
          <span className="text-[#64748B]">found within {maxMinutes} mins</span>
        </div>

        {/* Quick Gender Chips */}
        <div className="flex items-center gap-1">
          {(["MEN", "WOMEN", "CO_LIVING"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(gender === g ? undefined : g)}
              className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                gender === g
                  ? "bg-[#4F46E5] text-white border-[#4F46E5]"
                  : "bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F8FAFC]"
              }`}
            >
              {g === "MEN" ? "Boys" : g === "WOMEN" ? "Girls" : "Co-living"}
            </button>
          ))}
        </div>
      </div>
    </div>
  )}
</div>
  );
};

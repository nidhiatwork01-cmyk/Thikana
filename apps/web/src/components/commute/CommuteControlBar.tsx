import React from "react";
import * as Slider from "@radix-ui/react-slider";
import { motion } from "motion/react";
import { Bike, Car, Train, Clock, Navigation, Zap } from "lucide-react";
import { useCommuteStore, HYDERABAD_HUBS } from "../../store/commuteStore";
import type { TravelMode } from "@thikana/shared-types";

interface CommuteControlBarProps {
  totalResults: number;
  isLoading?: boolean;
}

export const CommuteControlBar: React.FC<CommuteControlBarProps> = ({
  totalResults,
  isLoading = false,
}) => {
  const {
    destination,
    arrivalTime,
    travelMode,
    maxMinutes,
    gender,
    setDestination,
    setArrivalTime,
    setTravelMode,
    setMaxMinutes,
    setGender,
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
    <div className="bg-white/95 backdrop-blur-md border border-[#E7E5E4] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* 1. Destination Hub Chips */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-[#1C1917] uppercase tracking-wider flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-[#D9532F]" />
            Workplace / College
          </label>
          <span className="text-xs text-[#78716C] truncate max-w-[200px]">
            {destination.name}
          </span>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
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
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
                  isSelected
                    ? "bg-[#D9532F] text-white shadow-sm ring-2 ring-[#D9532F]/20"
                    : "bg-[#FAF9F6] text-[#78716C] hover:bg-[#F3F1EC] hover:text-[#1C1917] border border-[#E7E5E4]"
                }`}
              >
                {hub.shortName}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Signature Animated Commute Slider */}
      <div className="bg-[#FAF9F6] border border-[#E7E5E4] rounded-xl p-3.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#1C1917]">Max Commute Time</span>
            {isLoading && (
              <span className="inline-block w-2 h-2 rounded-full bg-[#D9532F] animate-pulse" />
            )}
          </div>
          <div className="flex items-baseline gap-1">
            <motion.span
              key={maxMinutes}
              initial={{ scale: 1.2, color: "#D9532F" }}
              animate={{ scale: 1, color: "#1C1917" }}
              className="text-2xl font-black font-display text-[#1C1917]"
            >
              {maxMinutes}
            </motion.span>
            <span className="text-xs font-semibold text-[#78716C]">minutes</span>
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
          <Slider.Track className="bg-[#E7E5E4] relative grow rounded-full h-2.5 overflow-hidden">
            <Slider.Range className="absolute bg-[#D9532F] h-full" />
          </Slider.Track>
          <Slider.Thumb
            className="block w-6 h-6 bg-white border-3 border-[#D9532F] shadow-lg rounded-full hover:scale-110 focus:outline-none focus:ring-4 focus:ring-[#D9532F]/25 transition-transform"
            aria-label="Commute cutoff in minutes"
          />
        </Slider.Root>

        {/* Reach Hint */}
        <div className="flex justify-between items-center text-[11px] text-[#78716C] mt-2 font-medium">
          <span>10m (Walking / Hyperlocal)</span>
          <span className="hidden sm:inline">30m (Target Workzone)</span>
          <span>60m (Outer Ring Road)</span>
        </div>
      </div>

      {/* 3. Mode & Time Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Mode Selector */}
        <div>
          <label className="block text-[11px] font-bold text-[#78716C] uppercase tracking-wider mb-1.5">
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
                      ? "bg-[#FDEEE9] text-[#D9532F] border-[#D9532F] shadow-sm font-semibold"
                      : "bg-[#FAF9F6] text-[#78716C] border-[#E7E5E4] hover:bg-[#F3F1EC] hover:text-[#1C1917]"
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
            <label className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Arrival Time
            </label>
            {isPeakHour ? (
              <span className="text-[10px] font-bold text-[#D9532F] flex items-center gap-0.5 bg-[#FDEEE9] px-1.5 py-0.5 rounded">
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
                    ? "bg-[#1C1917] text-white border-[#1C1917]"
                    : "bg-[#FAF9F6] text-[#78716C] border-[#E7E5E4] hover:bg-[#F3F1EC]"
                }`}
              >
                {timeStr}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Results Bar & Quick Filters */}
      <div className="flex items-center justify-between pt-2 border-t border-[#E7E5E4] text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[#1C1917]">{totalResults} PGs</span>
          <span className="text-[#78716C]">found within {maxMinutes} mins</span>
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
                  ? "bg-[#D9532F] text-white border-[#D9532F]"
                  : "bg-white text-[#78716C] border-[#E7E5E4] hover:bg-[#FAF9F6]"
              }`}
            >
              {g === "MEN" ? "Boys" : g === "WOMEN" ? "Girls" : "Co-living"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

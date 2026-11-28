import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Slider from "@radix-ui/react-slider";
import { X, SlidersHorizontal, RotateCcw } from "lucide-react";
import { useCommuteStore } from "../../store/commuteStore";

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({ isOpen, onClose }) => {
  const {
    gender,
    maxBudget,
    sharingType,
    foodType,
    sortBy,
    setGender,
    setMaxBudget,
    setSharingType,
    setFoodType,
    setSortBy,
  } = useCommuteStore();

  const resetFilters = () => {
    setGender(undefined);
    setMaxBudget(undefined);
    setSharingType(undefined);
    setFoodType(undefined);
    setSortBy("commute");
  };

  const activeFilterCount = [
    gender,
    maxBudget,
    sharingType,
    foodType,
    sortBy !== "commute" ? sortBy : undefined,
  ].filter(Boolean).length;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 animate-fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-[#E2E8F0] z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex items-center justify-between shrink-0 bg-[#F8FAFC]">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div>
                <Dialog.Title className="text-base font-bold text-[#0F172A]">
                  Filter Accommodations
                </Dialog.Title>
                <p className="text-xs text-[#64748B]">
                  {activeFilterCount > 0
                    ? `${activeFilterCount} active filters applied`
                    : "Tune your search criteria"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-semibold text-[#4F46E5] hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              )}
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="p-2 rounded-full text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                >
                  <X className="w-4 h-4" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="p-5 overflow-y-auto space-y-6 flex-1">
            {/* 1. Monthly Budget Range */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  Monthly Budget Limit
                </label>
                <span className="text-sm font-extrabold text-[#4F46E5] font-display">
                  {maxBudget ? `Up to â‚¹${maxBudget.toLocaleString()}` : "Any Budget"}
                </span>
              </div>

              <Slider.Root
                className="relative flex items-center select-none touch-none w-full h-6 cursor-pointer"
                value={[maxBudget || 30000]}
                min={6000}
                max={30000}
                step={1000}
                onValueChange={(val) => setMaxBudget(val[0])}
              >
                <Slider.Track className="bg-[#E2E8F0] relative grow rounded-full h-2">
                  <Slider.Range className="absolute bg-[#4F46E5] h-full rounded-full" />
                </Slider.Track>
                <Slider.Thumb className="block w-5 h-5 bg-white border-2 border-[#4F46E5] shadow-md rounded-full focus:outline-none" />
              </Slider.Root>

              <div className="flex justify-between text-[11px] text-[#64748B] mt-2">
                <span>â‚¹6,000</span>
                <span>â‚¹15,000</span>
                <span>â‚¹30,000+</span>
              </div>
            </div>

            {/* 2. Gender Preference */}
            <div>
              <label className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-2">
                Gender Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "MEN", label: "Boys Only" },
                  { id: "WOMEN", label: "Girls Only" },
                  { id: "CO_LIVING", label: "Co-Living / Any" },
                ].map((item) => {
                  const isSelected = gender === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setGender(isSelected ? undefined : (item.id as any))
                      }
                      className={`p-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                        isSelected
                          ? "bg-[#4F46E5] text-white border-[#4F46E5] shadow-xs"
                          : "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0] hover:bg-[#F1F5F9]"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Room Sharing Type */}
            <div>
              <label className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-2">
                Room Sharing Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "SINGLE", label: "Single (Private)" },
                  { id: "DOUBLE", label: "2 Sharing" },
                  { id: "TRIPLE", label: "3 Sharing" },
                  { id: "FOUR_PLUS", label: "4+ Sharing" },
                ].map((item) => {
                  const isSelected = sharingType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setSharingType(isSelected ? undefined : (item.id as any))
                      }
                      className={`p-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                        isSelected
                          ? "bg-[#4F46E5] text-white border-[#4F46E5] shadow-xs"
                          : "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0] hover:bg-[#F1F5F9]"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Food Preferences */}
            <div>
              <label className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-2">
                Food Facility
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "BOTH", label: "Veg & Non-Veg Food" },
                  { id: "VEG", label: "Pure Veg Only" },
                  { id: "NONE", label: "No Food (Self Cook)" },
                ].map((item) => {
                  const isSelected = foodType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setFoodType(isSelected ? undefined : (item.id as any))
                      }
                      className={`p-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                        isSelected
                          ? "bg-[#4F46E5] text-white border-[#4F46E5] shadow-xs"
                          : "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0] hover:bg-[#F1F5F9]"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Sort By */}
            <div>
              <label className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-2">
                Sort Order
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "commute", label: "âš¡ Fastest Commute Time" },
                  { id: "price", label: "ðŸ’° Lowest Price" },
                  { id: "newest", label: "âœ¨ Newest Added" },
                  { id: "rating", label: "â­ Top Rated" },
                ].map((item) => {
                  const isSelected = sortBy === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSortBy(item.id as any)}
                      className={`p-2.5 rounded-xl text-xs font-semibold border transition-all text-left ${
                        isSelected
                          ? "bg-[#0F172A] text-white border-[#0F172A] shadow-xs"
                          : "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0] hover:bg-[#F1F5F9]"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="p-4 border-t border-[#E2E8F0] bg-white shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-sm shadow-md transition-all active:scale-98"
            >
              Show Results
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

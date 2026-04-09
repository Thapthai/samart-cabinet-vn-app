"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
  subLabel?: string;
}

interface SearchableSelectProps {
  label: string;
  placeholder?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  loading?: boolean;
  required?: boolean;
  onSearch?: (keyword: string) => void;
  searchPlaceholder?: string;
  initialDisplay?: { label: string; subLabel?: string };
  disabled?: boolean;
  /** ส่ง ref ของ container ใน modal เพื่อให้ dropdown ไปโผล่ด้านนอก (scroll ได้ปกติ) */
  portalTargetRef?: React.RefObject<HTMLElement | null>;
}

export default function SearchableSelect({
  label,
  placeholder = "เลือก...",
  value,
  onValueChange,
  options,
  loading = false,
  required = false,
  onSearch,
  searchPlaceholder = "ค้นหา...",
  initialDisplay,
  disabled = false,
  portalTargetRef,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  type PositionState = {
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    isFixed?: boolean;
    /** ในโหมด portal: จำกัดความสูง + inset จากขอบ modal */
    maxHeight?: number;
  };
  const [position, setPosition] = useState<PositionState | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const initialLoadDone = useRef(false);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const tr = triggerRef.current.getBoundingClientRect();
    if (portalTargetRef?.current) {
      const cr = portalTargetRef.current.getBoundingClientRect();
      const inset = 12;
      const gap = 6;
      const relLeft = tr.left - cr.left;
      let width = Math.min(tr.width, cr.width - inset * 2);
      let left = relLeft;
      if (left + width > cr.width - inset) {
        left = Math.max(inset, cr.width - inset - width);
      }
      if (left < inset) {
        left = inset;
      }
      width = Math.min(width, cr.width - left - inset);
      const top = tr.bottom - cr.top + gap;
      const spaceBelow = cr.bottom - tr.bottom - gap - inset;
      const maxHeight = Math.max(160, Math.min(300, spaceBelow));
      setPosition({
        top,
        left,
        width,
        maxHeight,
      });
      return;
    }
    const spaceAbove = tr.top;
    const spaceBelow = window.innerHeight - tr.bottom;
    const openAbove = spaceAbove >= spaceBelow;
    const gap = 4;
    if (openAbove) {
      setPosition({
        bottom: window.innerHeight - tr.top + gap,
        left: tr.left,
        width: tr.width,
        isFixed: true,
      });
    } else {
      setPosition({
        top: tr.bottom + gap,
        left: tr.left,
        width: tr.width,
        isFixed: true,
      });
    }
  };

  useLayoutEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }
    updatePosition();
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inTrigger = dropdownRef.current?.contains(target);
      const inPortal = portalRef.current?.contains(target);
      if (!inTrigger && !inPortal) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset initial load flag when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      initialLoadDone.current = false;
    }
  }, [isOpen]);

  // Load initial data immediately when dropdown opens, then handle search with debounce
  useEffect(() => {
    if (!isOpen || !onSearch) return;

    // First time opening dropdown - load immediately without debounce
    if (!initialLoadDone.current) {
      onSearch("");
      initialLoadDone.current = true;
      return;
    }

    // Subsequent searches - use debounce
    const debounce = setTimeout(() => {
      onSearch(searchTerm);
    }, 300);
    
    return () => clearTimeout(debounce);
  }, [searchTerm, isOpen]); // ลบ onSearch ออกจาก dependencies

  // Filter options locally if no onSearch provided
  const filteredOptions = onSearch
    ? options
    : options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          opt.subLabel?.toLowerCase().includes(searchTerm.toLowerCase())
      );

  const selectedOption = options.find((opt) => opt.value === value);
  
  // Use initialDisplay if value exists but not found in options yet
  const displayValue = selectedOption || (value && initialDisplay ? initialDisplay : null);

  const panelMaxHeight = position?.maxHeight ?? 300;
  const listMaxHeight =
    position?.maxHeight != null ? Math.max(72, panelMaxHeight - 56) : 240;

  const dropdownContent = position ? (
    <div
      ref={portalRef}
      className={cn(
        "z-[9999] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg",
        position.maxHeight == null && "max-h-[300px]",
      )}
      style={{
        position: position.isFixed ? "fixed" : "absolute",
        left: position.left,
        width: position.width,
        minWidth: 200,
        maxHeight: panelMaxHeight,
        ...(position.isFixed && position.bottom != null
          ? { bottom: position.bottom }
          : { top: position.top ?? 0 }),
      }}
    >
      <div className="border-b border-slate-100 bg-slate-50/50 p-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 border-slate-200 bg-white pl-8 text-sm"
            autoFocus
          />
        </div>
      </div>
      <div
        className="overflow-y-auto overscroll-contain"
        style={{ maxHeight: listMaxHeight }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
            <span className="ml-2 text-sm text-slate-500">กำลังโหลด...</span>
          </div>
        ) : filteredOptions.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-500">ไม่พบข้อมูล</div>
        ) : (
          filteredOptions.map((option, idx) => (
            <button
              key={`opt-${option.value}-${idx}`}
              type="button"
              onClick={() => {
                onValueChange(option.value);
                setIsOpen(false);
                setSearchTerm("");
              }}
              className={cn(
                "w-full text-left px-3 py-2.5 text-sm transition-colors border-b border-slate-50 last:border-0",
                "hover:bg-slate-50 focus:bg-slate-50 focus:outline-none",
                option.value === value && "bg-blue-50 text-blue-700 font-medium"
              )}
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{option.label || "—"}</span>
                {option.subLabel != null && option.subLabel !== "" && (
                  <span className="text-xs text-slate-500">{option.subLabel}</span>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="min-w-0 w-full space-y-2" ref={dropdownRef}>
      <Label>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative" ref={triggerRef}>
        {/* Trigger Button */}
        <button
          type="button"
          onClick={() => {
            if (disabled) return;
            setIsOpen(!isOpen);
            if (!isOpen) {
              setSearchTerm(""); // Reset search when opening
            }
          }}
          disabled={disabled}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 text-sm border rounded-md bg-white transition-colors",
            disabled 
              ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
              : "hover:bg-gray-50",
            !displayValue && !disabled && "text-gray-500"
          )}
        >
          <span className="truncate">
            {displayValue ? (
              <span>
                {displayValue.label || "—"}
                {displayValue.subLabel != null && displayValue.subLabel !== "" && (
                  <span className="text-slate-500 ml-2">- {displayValue.subLabel}</span>
                )}
              </span>
            ) : (
              placeholder
            )}
          </span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "transform rotate-180")} />
        </button>

        {/* Dropdown: portal ไป body (overlay ลอยเหนือทุกอย่าง) หรือไป container ใน modal */}
        {dropdownContent &&
          typeof document !== "undefined" &&
          (() => {
            const target = position?.isFixed ? document.body : portalTargetRef?.current;
            return target ? createPortal(dropdownContent, target) : null;
          })()}
      </div>
    </div>
  );
}

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { ChevronUp, ChevronDown, Minus } from 'lucide-react';

export type SheetSnap = 'small' | 'medium' | 'large';

interface BottomSheetProps {
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerRight?: React.ReactNode;
  fixedFooter?: React.ReactNode;
  showBackdrop?: boolean;
  onBackdropClick?: () => void;
  className?: string;
  allowDrag?: boolean;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  snap,
  onSnapChange,
  children,
  title,
  subtitle,
  headerRight,
  fixedFooter,
  showBackdrop = false,
  onBackdropClick,
  className = '',
  allowDrag = true,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // Height configurations corresponding to snaps
  const snapHeights: Record<SheetSnap, string> = {
    small: 'max-h-[220px] sm:max-h-[240px] h-auto min-h-[160px]',
    medium: 'h-[58vh] sm:h-[55vh]',
    large: 'h-[88vh] sm:h-[86vh]',
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const offset = info.offset.y;
    const velocity = info.velocity.y;

    if (offset < -50 || velocity < -300) {
      // Dragging UP
      if (snap === 'small') onSnapChange('medium');
      else if (snap === 'medium') onSnapChange('large');
    } else if (offset > 50 || velocity > 300) {
      // Dragging DOWN
      if (snap === 'large') onSnapChange('medium');
      else if (snap === 'medium') onSnapChange('small');
    }
  };

  const cycleSnap = () => {
    if (snap === 'small') onSnapChange('medium');
    else if (snap === 'medium') onSnapChange('large');
    else onSnapChange('small');
  };

  return (
    <>
      {/* Optional Modal Backdrop Overlay */}
      <AnimatePresence>
        {showBackdrop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onBackdropClick}
            className="fixed inset-0 bg-black/50 z-30 backdrop-blur-xs cursor-pointer lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* The Bottom Sheet Container */}
      <motion.div
        layout
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 30, stiffness: 350 }}
        className={`fixed lg:relative inset-x-0 bottom-0 lg:inset-auto z-40 lg:z-auto max-w-3xl lg:max-w-none mx-auto lg:mx-0 flex flex-col bg-white lg:bg-transparent dark:bg-neutral-900 lg:dark:bg-transparent rounded-t-[24px] lg:rounded-none shadow-[0_-4px_16px_rgba(0,0,0,0.5)] lg:shadow-none border-t border-slate-200/80 dark:border-neutral-800 lg:border-none transition-[height] lg:transition-none duration-300 ease-out overflow-hidden lg:overflow-visible select-none lg:select-auto ${snapHeights[snap]} lg:!h-auto lg:!max-h-none ${className}`}
      >
        {/* Top Drag Handle Header Bar */}
        <div
          onClick={cycleSnap}
          className="lg:hidden w-full pt-2.5 pb-1.5 px-6 flex flex-col items-center justify-center shrink-0 cursor-grab active:cursor-grabbing hover:bg-slate-50/75 dark:hover:bg-neutral-800/40 transition-colors"
          title="Drag or click to resize bottom sheet"
        >
          {/* Centered Light Gray Drag Indicator Pill */}
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-neutral-600 rounded-full mx-auto mb-2 transition-colors hover:bg-slate-400 dark:hover:bg-neutral-500" />

          {/* Optional Title row when header is provided */}
          {(title || headerRight) && (
            <div className="w-full flex items-center justify-between gap-3 pt-0.5 pb-1">
              <div className="min-w-0 flex-1 text-left">
                {typeof title === 'string' ? (
                  <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-white truncate">
                    {title}
                  </h3>
                ) : (
                  title
                )}
                {subtitle && (
                  <p className="text-xs text-slate-500 dark:text-neutral-400 truncate">
                    {subtitle}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {headerRight}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    cycleSnap();
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  title={snap === 'large' ? 'Collapse sheet' : 'Expand sheet'}
                >
                  {snap === 'large' ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Sheet Content Body */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto lg:overflow-visible overflow-x-hidden px-4 sm:px-6 lg:px-0 pb-4 lg:pb-0 pt-1 lg:pt-0 space-y-4 overscroll-contain"
        >
          {children}
        </div>

        {/* Fixed CTA Footer at the bottom of the Sheet (if provided) */}
        {fixedFooter && (
          <div className="shrink-0 p-4 sm:px-6 bg-white dark:bg-neutral-900 border-t border-slate-150 dark:border-neutral-800">
            {fixedFooter}
          </div>
        )}
      </motion.div>
    </>
  );
};

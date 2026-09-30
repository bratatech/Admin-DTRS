'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { ArrowRight, X, Menu } from 'lucide-react';

export interface Navigation12Props {
  brandName?: string;
  items?: string[];
  activeItem?: string;
  onItemSelect?: (item: string) => void;
  ctaText?: string;
  onCtaClick?: () => void;
}

const defaultItems = ['Overview', 'Product', 'Customers', 'Pricing'];

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.08,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50 dark:focus-visible:ring-white dark:focus-visible:ring-offset-neutral-950';

export default function Navigation12({
  brandName = 'Arc',
  items = defaultItems,
  activeItem,
  onItemSelect,
  ctaText = 'Start free',
  onCtaClick,
}: Navigation12Props) {
  const [internalActive, setInternalActive] = useState(items[0] || 'Overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentActive = activeItem !== undefined ? activeItem : internalActive;

  const handleSelect = (item: string) => {
    setInternalActive(item);
    if (onItemSelect) onItemSelect(item);
  };

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  return (
    <header className="w-full bg-white px-4 py-6 dark:bg-neutral-950 sm:py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1400px]">
        <motion.nav
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex h-16 items-center justify-between gap-3 rounded-full border border-neutral-200/80 bg-white/80 pl-5 pr-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-900/80"
          aria-label="Primary"
        >
          {/* Brand */}
          <a
            href="#"
            className={`flex items-center gap-2.5 rounded-full text-neutral-900 dark:text-white ${focusRing}`}
          >
            <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 dark:bg-white">
              <span className="absolute h-3 w-3 rounded-full border-[1.5px] border-white dark:border-neutral-900" />
              <span className="absolute right-1 top-1 h-1 w-1 rounded-full bg-white dark:bg-neutral-900" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">{brandName}</span>
          </a>

          {/* Desktop Nav Items */}
          <div className="hidden items-center md:flex">
            {items.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handleSelect(item)}
                aria-current={currentActive === item ? 'page' : undefined}
                className={`relative cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 ${focusRing} ${
                  currentActive === item
                    ? 'text-neutral-900 dark:text-white'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                }`}
              >
                {currentActive === item && (
                  <motion.span
                    layoutId="nav12-active"
                    className="absolute inset-0 rounded-full bg-neutral-100 dark:bg-neutral-800"
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
                <span className="relative">{item}</span>
              </button>
            ))}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1.5">
            <a
              href="#"
              className={`hidden rounded-full px-4 py-2 text-sm font-medium text-neutral-600 transition-colors duration-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white md:inline-flex ${focusRing}`}
            >
              Sign in
            </a>
            <button
              type="button"
              onClick={onCtaClick}
              className={`hidden items-center gap-1.5 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 md:inline-flex ${focusRing}`}
            >
              <span>{ctaText}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-controls="nav12-mobile-menu"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-neutral-900 transition-colors duration-200 hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800 md:hidden ${focusRing}`}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </motion.nav>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              id="nav12-mobile-menu"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden md:hidden"
            >
              <motion.nav
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="mt-3 rounded-3xl border border-neutral-200/80 bg-white/90 p-2 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-900/90"
                aria-label="Mobile"
              >
                {items.map((item) => (
                  <motion.button
                    key={item}
                    type="button"
                    variants={itemVariants}
                    onClick={() => {
                      handleSelect(item);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-2xl px-4 py-3.5 text-left text-[15px] font-medium transition-colors duration-200 ${focusRing} ${
                      currentActive === item
                        ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white'
                        : 'text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-800/50'
                    }`}
                  >
                    <span>{item}</span>
                    {currentActive === item && (
                      <span className="h-1.5 w-1.5 rounded-full bg-neutral-900 dark:bg-white" />
                    )}
                  </motion.button>
                ))}

                <motion.div
                  variants={itemVariants}
                  className="mt-2 grid gap-2 border-t border-neutral-200 px-2 pb-2 pt-3 dark:border-neutral-800"
                >
                  <a
                    href="#"
                    className={`rounded-full border border-neutral-300 px-5 py-3 text-center text-sm font-medium text-neutral-900 transition-colors duration-200 hover:bg-neutral-50 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-800 ${focusRing}`}
                  >
                    Sign in
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onCtaClick) onCtaClick();
                    }}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 ${focusRing}`}
                  >
                    <span>{ctaText}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              </motion.nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

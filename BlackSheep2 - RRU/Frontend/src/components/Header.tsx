'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  Train,
  Database,
  Clock,
  RefreshCw,
  Zap,
  Route,
  Compass,
  Landmark,
  Menu,
  X,
  Bot,
  ChevronLeft,
  ChevronRight,
  Radio,
  BellRing,
  Megaphone,
} from 'lucide-react';
import { DbSimulationStatus, TrainInfo } from '@/types';

export type NavTabType = 'engine' | 'corridors' | 'borders' | 'assistant' | 'broadcast';
export type AgentSpecialty = 'crew' | 'platform' | 'tracks' | 'resource';

export interface HeaderProps {
  onComputeClick: () => void;
  dbStatus: DbSimulationStatus | null;
  onRefreshDbStatus: () => void;
  activeTab?: NavTabType;
  onSelectTab?: (tab: NavTabType) => void;
  trainInfo?: TrainInfo | null;
  selectedTrainNo?: string;
  onSearchSelect?: (trainNo: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  selectedAssistantAgent?: AgentSpecialty;
  onSelectAssistantAgent?: (agentId: AgentSpecialty) => void;
}

export interface AssistantNavItem {
  id: AgentSpecialty;
  letter: 'D' | 'T' | 'R' | 'S';
  name: string;
  tag: string;
  badgeBg: string;
  textColor: string;
  accentBorder: string;
  bgLight: string;
}

export const DTRS_ASSISTANTS: AssistantNavItem[] = [
  {
    id: 'crew',
    letter: 'D',
    name: 'Diya',
    tag: 'Crew Assistant',
    badgeBg: 'bg-amber-500 text-white',
    textColor: 'text-amber-800',
    accentBorder: 'border-amber-400',
    bgLight: 'bg-amber-50',
  },
  {
    id: 'platform',
    letter: 'T',
    name: 'Tripti',
    tag: 'Platform Assistant',
    badgeBg: 'bg-sky-600 text-white',
    textColor: 'text-sky-800',
    accentBorder: 'border-sky-400',
    bgLight: 'bg-sky-50',
  },
  {
    id: 'tracks',
    letter: 'R',
    name: 'Riya',
    tag: 'Block Assistant',
    badgeBg: 'bg-rose-600 text-white',
    textColor: 'text-rose-800',
    accentBorder: 'border-rose-400',
    bgLight: 'bg-rose-50',
  },
  {
    id: 'resource',
    letter: 'S',
    name: 'Smita',
    tag: 'Rolling Stock Assistant',
    badgeBg: 'bg-emerald-600 text-white',
    textColor: 'text-emerald-800',
    accentBorder: 'border-emerald-400',
    bgLight: 'bg-emerald-50',
  },
];

interface NavItemConfig {
  id: NavTabType;
  label: string;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'engine',
    label: 'Delay Engine & Segments',
    icon: Route,
  },
  {
    id: 'corridors',
    label: 'Corridors (7)',
    icon: Compass,
  },
  {
    id: 'borders',
    label: 'State Borders (29)',
    icon: Landmark,
  },
  {
    id: 'broadcast',
    label: 'Broadcast Portal',
    icon: Radio,
    badge: 'LIVE',
  },
  {
    id: 'assistant',
    label: 'AI Agent',
    icon: Bot,
    badge: '4 DTRS',
  },
];

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-irctc-blue focus-visible:ring-offset-2';

export const Header: React.FC<HeaderProps> = ({
  onComputeClick,
  dbStatus,
  onRefreshDbStatus,
  activeTab = 'engine',
  onSelectTab,
  trainInfo,
  selectedTrainNo,
  isCollapsed: controlledCollapsed,
  onToggleCollapse: controlledToggleCollapse,
  selectedAssistantAgent = 'crew',
  onSelectAssistantAgent,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const toggleCollapse = () => {
    if (controlledToggleCollapse) {
      controlledToggleCollapse();
    } else {
      setInternalCollapsed((prev) => !prev);
    }
  };

  const handleAssistantClick = (agentId: AgentSpecialty) => {
    if (onSelectTab) onSelectTab('assistant');
    if (onSelectAssistantAgent) onSelectAssistantAgent(agentId);
    setMobileMenuOpen(false);
  };

  const [istTime, setIstTime] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      };
      const dateOptions: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      };
      const timeStr = new Intl.DateTimeFormat('en-IN', options).format(now);
      const dateStr = new Intl.DateTimeFormat('en-IN', dateOptions).format(now);
      setIstTime(`${dateStr} | ${timeStr} IST`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Escape key closes mobile menu
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefreshDbStatus();
    setTimeout(() => setIsRefreshing(false), 700);
  };

  const handleTabClick = (tabId: NavTabType) => {
    if (onSelectTab) {
      onSelectTab(tabId);
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* 1. Top Official Portal Sub-bar (Government / CRIS / Clock) */}
      <div className="bg-irctc-blue-dark text-slate-200 text-[11px] sm:text-xs px-4 sm:px-6 py-1.5 flex flex-wrap justify-between items-center border-b border-irctc-blue-muted/30 sticky top-0 z-30 w-full shadow-xs">
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="font-semibold tracking-wider text-slate-200 uppercase">
            GOVERNMENT OF INDIA &bull; MINISTRY OF RAILWAYS
          </span>
          <span className="hidden sm:inline text-slate-400">|</span>
          <span className="hidden md:inline text-amber-300 font-semibold tracking-wide">
            CENTRE FOR RAILWAY INFORMATION SYSTEMS (CRIS)
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-300 font-mono text-[11px]">
          <Clock className="w-3.5 h-3.5 text-irctc-orange" />
          <span>{istTime || 'Loading IST...'}</span>
        </div>
      </div>

      {/* 2. Mobile Top Navigation Bar (Visible on mobile/tablet screens < md) */}
      <div className="md:hidden bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-2.5 flex items-center justify-between sticky top-[31px] z-20 shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100"
            aria-label="Open sidebar menu"
          >
            <Menu className="w-5 h-5 text-irctc-blue" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-irctc-blue flex items-center justify-center p-1 border border-irctc-orange/80">
              <Train className="w-4 h-4 text-irctc-orange" />
            </div>
            <div>
              <span className="font-black text-xs text-irctc-blue leading-none block">DTRS SYSTEM</span>
              <span className="text-[9px] text-slate-500 font-medium">DISPATCH ENGINE</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onComputeClick}
          className="bg-irctc-orange hover:bg-irctc-orange-dark text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm"
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>Compute</span>
        </button>
      </div>

      {/* 3. Mobile Backdrop Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            {/* Slide-out Panel */}
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col justify-between z-10"
            >
              {/* Drawer Top */}
              <div>
                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-irctc-blue flex items-center justify-center p-1.5 border border-irctc-orange">
                      <Train className="w-5 h-5 text-irctc-orange" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black text-irctc-blue">DTRS SYSTEM</span>
                        <span className="bg-irctc-orange text-white text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase">
                          AI
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium">Compound Delay Engine</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Drawer Nav Items */}
                <div className="p-3 space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
                    Operational Modules
                  </div>
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <div key={item.id} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => handleTabClick(item.id)}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors ${
                            isActive
                              ? 'bg-irctc-blue text-white shadow-sm'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </span>
                          {item.badge && (
                            <span
                              className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-black ${
                                isActive
                                  ? 'bg-irctc-orange text-white'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>

                        {/* DTRS Assistants nested sub-list in mobile drawer */}
                        {item.id === 'assistant' && (
                          <div className="ml-3 pl-3 border-l-2 border-slate-200 space-y-1.5 py-1">
                            {DTRS_ASSISTANTS.map((asst) => {
                              const isAsstActive = activeTab === 'assistant' && selectedAssistantAgent === asst.id;
                              return (
                                <button
                                  key={asst.id}
                                  type="button"
                                  onClick={() => handleAssistantClick(asst.id)}
                                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all ${
                                    isAsstActive
                                      ? `${asst.bgLight} ${asst.accentBorder} border shadow-2xs font-bold`
                                      : 'hover:bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span
                                      className={`w-6 h-6 rounded-md flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${asst.badgeBg}`}
                                    >
                                      {asst.letter}
                                    </span>
                                    <div className="min-w-0">
                                      <span className={`text-xs font-bold block leading-none truncate ${isAsstActive ? asst.textColor : 'text-slate-800'}`}>
                                        {asst.name}
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-semibold block leading-tight mt-0.5 truncate">
                                        {asst.tag}
                                      </span>
                                    </div>
                                  </div>
                                  {isAsstActive && (
                                    <span className="w-2 h-2 rounded-full bg-irctc-blue shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Drawer Bottom Controls */}
              <div className="p-4 pb-8 border-t border-slate-200 space-y-3 bg-slate-50">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onComputeClick();
                  }}
                  className="w-full py-2.5 rounded-xl bg-irctc-orange hover:bg-irctc-orange-dark text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Compute Compound ETA</span>
                </button>

                {trainInfo && trainInfo.train_name && (
                  <div className="bg-white border border-blue-200/80 p-2.5 rounded-xl text-xs shadow-2xs">
                    <div className="text-[9px] uppercase font-bold text-slate-400 mb-1">Active Train</div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] bg-irctc-blue text-white px-1.5 py-0.5 rounded font-bold">
                        {trainInfo.train_no}
                      </span>
                      <span className="text-[11px] font-bold text-irctc-blue truncate">
                        {trainInfo.train_name}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs">
                  <div className="flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-emerald-600" />
                    <div className="text-[10px] leading-tight">
                      <div className="text-slate-400 font-bold">SYSTEM DB</div>
                      <div className={`font-bold ${dbStatus?.is_pristine ? 'text-emerald-700' : 'text-amber-600'}`}>
                        {dbStatus?.is_pristine ? 'ACTIVE BASELINE' : 'MODIFIED'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRefreshClick}
                    className="p-1 text-slate-400 hover:text-irctc-blue"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Desktop Collapsible Sidebar (Persistent on md+ screens) */}
      <aside
        className={`hidden md:flex flex-col justify-between fixed top-[31px] bottom-0 left-0 bg-white border-r border-slate-200 z-30 transition-all duration-300 ease-in-out shadow-sm ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Top: Branding & Collapse Toggle */}
        <div>
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-3 py-3.5 border-b border-slate-100">
              <div className="w-9 h-9 rounded-full bg-irctc-blue flex items-center justify-center shadow-sm p-1.5 border border-irctc-orange shrink-0">
                <Train className="w-4 h-4 text-irctc-orange" />
              </div>
              <button
                type="button"
                onClick={toggleCollapse}
                title="Expand sidebar"
                className="p-1.5 rounded-lg text-slate-400 hover:text-irctc-blue hover:bg-slate-100 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="border-b border-slate-100 p-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-full bg-irctc-blue flex items-center justify-center shadow-sm p-1.5 border-2 border-irctc-orange shrink-0">
                  <Train className="w-5 h-5 text-irctc-orange" />
                </div>
                <button
                  type="button"
                  onClick={toggleCollapse}
                  title="Collapse sidebar"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-irctc-blue hover:bg-slate-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              {/* Project Name and Subtitle SHIFTED BELOW LOGO */}
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-base font-black tracking-tight text-irctc-blue leading-none">
                    DTRS SYSTEM
                  </span>
                  <span className="bg-irctc-orange text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                    DISPATCH
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium leading-tight mt-1.5">
                  Compound Delay &amp; Segment Engine
                </p>
              </div>
            </div>
          )}

          {/* Section Label (when expanded) */}
          {!isCollapsed && (
            <div className="px-4 pt-4 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Operational Views
            </div>
          )}

          {/* Navigation Items */}
          <nav className="p-2 space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <div key={item.id} className="space-y-1">
                  {/* Main Nav Item Button + Tooltip (scoped to group/main) */}
                  <div className="relative group/main">
                    <button
                      type="button"
                      onClick={() => handleTabClick(item.id)}
                      className={`w-full flex items-center rounded-xl transition-all duration-200 ${focusRing} ${
                        isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'
                      } ${
                        isActive
                          ? 'bg-irctc-blue text-white shadow-sm font-bold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-irctc-blue font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-600'}`} />
                        {!isCollapsed && <span className="text-xs truncate">{item.label}</span>}
                      </div>

                      {!isCollapsed && item.badge && (
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-black tracking-wider uppercase ${
                            isActive
                              ? 'bg-irctc-orange text-white'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>

                    {/* Floating Tooltip when Collapsed (only triggers when main button is hovered) */}
                    {isCollapsed && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 hidden group-hover/main:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none">
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="text-[9px] bg-irctc-orange text-white px-1.5 py-0.2 rounded-full uppercase font-black">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* DTRS Sub-assistants in Desktop Sidebar (Expanded) */}
                  {item.id === 'assistant' && !isCollapsed && (
                    <div className="mt-1.5 ml-3 pl-2.5 border-l-2 border-slate-200 space-y-1">
                      {DTRS_ASSISTANTS.map((asst) => {
                        const isAsstActive = activeTab === 'assistant' && selectedAssistantAgent === asst.id;
                        return (
                          <button
                            key={asst.id}
                            type="button"
                            onClick={() => handleAssistantClick(asst.id)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                              isAsstActive
                                ? `${asst.bgLight} ${asst.accentBorder} border shadow-2xs font-bold`
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-5 h-5 rounded flex items-center justify-center font-black text-[11px] shrink-0 shadow-2xs ${asst.badgeBg}`}
                              >
                                {asst.letter}
                              </span>
                              <div className="min-w-0">
                                <span className={`text-[11px] font-bold block leading-none truncate ${isAsstActive ? asst.textColor : 'text-slate-800'}`}>
                                  {asst.name}
                                </span>
                                <span className="text-[9px] text-slate-500 font-medium block leading-tight mt-0.5 truncate">
                                  {asst.tag}
                                </span>
                              </div>
                            </div>
                            {isAsstActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-irctc-blue shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* DTRS Sub-assistants in Desktop Sidebar (Collapsed) */}
                  {item.id === 'assistant' && isCollapsed && (
                    <div className="flex flex-col items-center gap-1 mt-1.5 pt-1.5 border-t border-slate-100">
                      {DTRS_ASSISTANTS.map((asst) => {
                        const isAsstActive = activeTab === 'assistant' && selectedAssistantAgent === asst.id;
                        return (
                          <div key={asst.id} className="relative group/asst">
                            <button
                              type="button"
                              onClick={() => handleAssistantClick(asst.id)}
                              className={`w-6 h-6 rounded flex items-center justify-center font-black text-[10px] transition-all cursor-pointer ${
                                isAsstActive
                                  ? `${asst.badgeBg} ring-2 ring-irctc-blue shadow-sm scale-110`
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              {asst.letter}
                            </button>
                            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 hidden group-hover/asst:flex flex-col px-2.5 py-1.5 bg-slate-900 text-white text-[11px] font-semibold rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none">
                              <span className="font-bold text-amber-300">{asst.name} ({asst.letter})</span>
                              <span className="text-[9px] text-slate-300">{asst.tag}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Live Broadcast & Section Alerts Status Card in Desktop Sidebar - Commented out as requested */}
          {/* {!isCollapsed && (
            <div className="mx-2 mt-2 p-2.5 rounded-xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-900/60 shadow-xs space-y-1.5 font-sans">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                  <span className="text-[10px] font-mono font-bold tracking-wider text-rose-300 uppercase">
                    Live Broadcast
                  </span>
                </div>
                <span className="text-[9px] font-mono bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded border border-rose-500/30 font-bold">
                  3 Alerts
                </span>
              </div>

              <div className="text-[10px] text-slate-300 leading-snug line-clamp-2">
                <strong className="text-amber-300">VHF 161.15 MHz:</strong> S-105 Red Overlap hold active &bull; Speed wave active
              </div>

              <button
                type="button"
                onClick={() => handleTabClick('broadcast')}
                className={`w-full py-1 px-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                  activeTab === 'broadcast'
                    ? 'bg-rose-600 text-white shadow-rose-900/50'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                <Radio className="w-3 h-3 text-rose-300" />
                <span>Open Broadcast Portal</span>
              </button>
            </div>
          )} */}
        </div>

        {/* Bottom Section: Compute CTA pulled UPWARDS, followed by Active Train & DB Status with generous bottom padding */}
        <div className="p-3 pb-8 border-t border-slate-100 space-y-2.5 bg-slate-50/80">
          {/* 1. Compute CTA Button (Pulled upwards!) */}
          <div className="relative group">
            {!isCollapsed ? (
              <button
                type="button"
                onClick={onComputeClick}
                className={`w-full flex items-center justify-center gap-2 rounded-xl bg-irctc-orange hover:bg-irctc-orange-dark text-white font-extrabold text-xs px-4 py-2.5 shadow-md hover:shadow-lg transition-all transform active:scale-95 shrink-0 ${focusRing}`}
              >
                <Zap className="w-4 h-4 text-amber-100 fill-amber-100" />
                <span>Compute Compound ETA</span>
              </button>
            ) : (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={onComputeClick}
                  title="Compute Compound ETA"
                  className={`w-11 h-11 flex items-center justify-center rounded-xl bg-irctc-orange hover:bg-irctc-orange-dark text-white shadow-md hover:shadow-lg transition-all transform active:scale-95 ${focusRing}`}
                >
                  <Zap className="w-5 h-5 text-amber-100 fill-amber-100" />
                </button>
              </div>
            )}

            {/* Collapsed Tooltip */}
            {isCollapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 hidden group-hover:flex items-center px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none">
                Compute Compound ETA
              </div>
            )}
          </div>

          {/* 2. Active Train */}
          {trainInfo && trainInfo.train_name && (
            <div className="relative group">
              {!isCollapsed ? (
                <div className="bg-white border border-blue-200/80 p-2.5 rounded-xl text-xs shadow-2xs">
                  <div className="text-[9px] uppercase font-bold text-slate-400 mb-0.5">Active Train</div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] bg-irctc-blue text-white px-1.5 py-0.5 rounded font-bold shrink-0">
                      {trainInfo.train_no}
                    </span>
                    <span className="text-[11px] font-bold text-irctc-blue truncate" title={trainInfo.train_name}>
                      {trainInfo.train_name}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center">
                  <div className="bg-irctc-blue text-white font-mono text-[10px] font-bold px-2 py-1 rounded-lg shadow-xs cursor-default">
                    {trainInfo.train_no}
                  </div>
                </div>
              )}

              {/* Collapsed Tooltip */}
              {isCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 hidden group-hover:flex flex-col px-2.5 py-1.5 bg-slate-900 text-white text-xs rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none">
                  <span className="text-[10px] text-slate-400 uppercase">Active Train</span>
                  <span className="font-bold">
                    {trainInfo.train_no} • {trainInfo.train_name}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 3. System DB Status */}
          <div className="relative group">
            {!isCollapsed ? (
              <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs shadow-2xs">
                <div className="flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <div className="text-[10px] leading-tight">
                    <div className="text-slate-400 font-bold uppercase tracking-wider">SYSTEM STATUS</div>
                    <div
                      className={`font-bold ${
                        dbStatus?.is_pristine ? 'text-emerald-700' : 'text-amber-600'
                      }`}
                    >
                      {dbStatus?.is_pristine
                        ? 'ACTIVE BASELINE'
                        : `SIM ACTIVE (${dbStatus?.modifications_count || 0})`}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRefreshClick}
                  title="Refresh DB Status"
                  className="text-slate-400 hover:text-irctc-blue p-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-irctc-blue' : ''}`} />
                </button>
              </div>
            ) : (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleRefreshClick}
                  title="Refresh Database Status"
                  className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-irctc-blue transition-colors relative"
                >
                  <Database className="w-4 h-4 text-emerald-600" />
                  <span
                    className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                      dbStatus?.is_pristine ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                </button>
              </div>
            )}

            {/* Collapsed Tooltip */}
            {isCollapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 hidden group-hover:flex flex-col px-2.5 py-1.5 bg-slate-900 text-white text-xs rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none">
                <span className="text-[10px] text-slate-400">Database Status (click to refresh)</span>
                <span className="font-bold">
                  {dbStatus?.is_pristine
                    ? 'ACTIVE BASELINE'
                    : `SIMULATION ACTIVE (${dbStatus?.modifications_count || 0} MODS)`}
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

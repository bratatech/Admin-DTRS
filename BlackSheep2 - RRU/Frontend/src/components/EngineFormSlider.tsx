'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Train,
  Sliders,
  Route,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Zap,
  Radio,
  RotateCcw,
} from 'lucide-react';
import { TrainSearch } from './TrainSearch';
import { LiveGpsTracker } from './LiveGpsTracker';
import { OperationalControls } from './OperationalControls';
import { SegmentationControls } from './SegmentationControls';
import { MultiSegmentCircumstances } from './MultiSegmentCircumstances';
import { ResultsDashboard } from './ResultsDashboard';
import { DelayExplanation } from './DelayExplanation';
import { CascadedDelays } from './CascadedDelays';
import {
  TrainInfo,
  OperationalCases,
  RouteSegment,
  DbSimulationStatus,
  LiveMatchResponse,
  PredictionResult,
  StationCircumstance,
} from '@/types';

export type StepIndex = 1 | 2 | 3 | 4;

interface EngineFormSliderProps {
  selectedTrainNo: string;
  trainInfo: TrainInfo | null;
  onSelectTrain: (trainNo: string) => void;
  isLoading: boolean;
  onTrackLiveGps: (trainNo: string, sectionDelay?: number, customSegment?: string, speedupRecovery?: number, multiInjections?: StationCircumstance[]) => void;
  liveGpsData: LiveMatchResponse | null;
  isTrackingLiveGps: boolean;
  isFrozen: boolean;
  onToggleFreeze: () => void;
  cases: OperationalCases;
  onChangeCase: (field: keyof OperationalCases, value: string) => void;
  onResetCases: () => void;
  onApplyPreset: (presetName: string) => void;
  corridor: string;
  onChangeCorridor: (c: string) => void;
  borderCrossing: string;
  onChangeBorderCrossing: (bc: string) => void;
  selectedSegment: string;
  onChangeSegment: (seg: string) => void;
  segments: RouteSegment[];
  dbStatus: DbSimulationStatus | null;
  onPushToDb: () => void;
  onResetDb: () => void;
  isPushing: boolean;
  isResetting: boolean;
  toastMessage: { text: string; isSuccess: boolean } | null;
  onCalculate: () => void;
  predictionResult: PredictionResult | null;
  currentStep?: StepIndex;
  onStepChange?: (step: StepIndex) => void;
  sectionDelayMins?: number;
  onUpdateSectionDelay?: (mins: number, segNo?: string) => void;
  speedupRecoveryMins?: number;
  onUpdateSpeedupRecovery?: (mins: number) => void;
  multiStationInjections?: StationCircumstance[];
  onUpdateMultiStationInjections?: (injections: StationCircumstance[]) => void;
}

const STEPS_CONFIG = [
  {
    step: 1 as StepIndex,
    title: '1. Train & Timetable Lookup',
    shortTitle: '1. Train Search',
    description: 'Auto-pick Working Timetable & Slack ($EA$)',
    icon: Train,
  },
  {
    step: 2 as StepIndex,
    title: '2. Operational Disturbance Cases',
    shortTitle: '2. Disturbances',
    description: '10 Cascade Conditions & Headways',
    icon: Sliders,
  },
  {
    step: 3 as StepIndex,
    title: '3. Corridor Route & State Segmentation',
    shortTitle: '3. Corridor Routing',
    description: 'Spatial Hops & Simulation Sandbox',
    icon: Route,
  },
  {
    step: 4 as StepIndex,
    title: '4. Simulation Output & Mathematical Derivation',
    shortTitle: '4. Output Details',
    description: '5-Stage Derivation, Buffer & Cascades',
    icon: Sparkles,
  },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 120 : -120,
    opacity: 0,
    scale: 0.985,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      x: { type: 'spring' as const, stiffness: 300, damping: 28 },
      opacity: { duration: 0.25 },
      scale: { duration: 0.25 },
    },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -120 : 120,
    opacity: 0,
    scale: 0.985,
    transition: {
      x: { type: 'spring' as const, stiffness: 300, damping: 28 },
      opacity: { duration: 0.2 },
      scale: { duration: 0.2 },
    },
  }),
};

export const EngineFormSlider: React.FC<EngineFormSliderProps> = ({
  selectedTrainNo,
  trainInfo,
  onSelectTrain,
  isLoading,
  onTrackLiveGps,
  liveGpsData,
  isTrackingLiveGps,
  isFrozen,
  onToggleFreeze,
  cases,
  onChangeCase,
  onResetCases,
  onApplyPreset,
  corridor,
  onChangeCorridor,
  borderCrossing,
  onChangeBorderCrossing,
  selectedSegment,
  onChangeSegment,
  segments,
  dbStatus,
  onPushToDb,
  onResetDb,
  isPushing,
  isResetting,
  toastMessage,
  onCalculate,
  predictionResult,
  currentStep: controlledStep,
  onStepChange,
  sectionDelayMins,
  onUpdateSectionDelay,
  speedupRecoveryMins,
  onUpdateSpeedupRecovery,
  multiStationInjections,
  onUpdateMultiStationInjections,
}) => {
  const [internalStep, setInternalStep] = useState<StepIndex>(1);
  const [direction, setDirection] = useState<number>(1);
  const [showLiveGps, setShowLiveGps] = useState<boolean>(false);
  const [autoAdvanceNotice, setAutoAdvanceNotice] = useState<string | null>(null);
  const [telemetryCountdown, setTelemetryCountdown] = useState<number | null>(null);
  const lastFetchedDataRef = useRef<any>(null);

  const activeStep: StepIndex = controlledStep !== undefined ? controlledStep : internalStep;

  const goToStep = (step: StepIndex) => {
    if (step === activeStep) return;
    setTelemetryCountdown(null);
    setDirection(step > activeStep ? 1 : -1);
    if (onStepChange) {
      onStepChange(step);
    } else {
      setInternalStep(step);
    }
    setAutoAdvanceNotice(null);
  };

  // Trigger 6-second display and auto-advance to Step 2 when live telemetry is fetched
  useEffect(() => {
    if (
      activeStep === 1 &&
      liveGpsData &&
      liveGpsData !== lastFetchedDataRef.current &&
      !isTrackingLiveGps
    ) {
      lastFetchedDataRef.current = liveGpsData;
      setShowLiveGps(true);
      setTelemetryCountdown(6);
    }
  }, [liveGpsData, isTrackingLiveGps, activeStep]);

  // Tick the 6-second countdown down to 0, then automatically advance to Step 2 (Operational Disturbances)
  useEffect(() => {
    if (telemetryCountdown === null) return;

    if (telemetryCountdown <= 0) {
      setTelemetryCountdown(null);
      goToStep(2);
      return;
    }

    const timer = setTimeout(() => {
      setTelemetryCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [telemetryCountdown]);

  const nextStep = () => {
    if (activeStep < 4) {
      goToStep(((activeStep + 1) as StepIndex));
    }
  };

  const prevStep = () => {
    if (activeStep > 1) {
      goToStep(((activeStep - 1) as StepIndex));
    }
  };

  // Wrapped train selection with smooth horizontal slide to Step 2
  const handleTrainSelectedWithSlider = (trainNo: string) => {
    onSelectTrain(trainNo);
    setAutoAdvanceNotice(`Train ${trainNo} selected! Sliding to Step 2...`);
    const timer = setTimeout(() => {
      goToStep(2);
      setAutoAdvanceNotice(null);
    }, 700);
    return () => clearTimeout(timer);
  };

  // Trigger calculation and slide directly to Step 4 (Output Page)
  const handleCalculateAndSlide = () => {
    onCalculate();
    goToStep(4);
  };

  return (
    <div className="w-full mb-6">
      {/* Stepper Progress Bar & Mode Toggle */}
      <div className="irctc-card p-3.5 sm:p-4 mb-4 bg-white/90 shadow-sm border border-slate-200/80 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-irctc-blue text-white text-xs font-black">
              {activeStep}
            </span>
            <h2 className="text-sm font-extrabold text-irctc-blue tracking-tight">
              DTRS SYSTEM Progressive Prediction Flow
            </h2>
            <span className="text-[11px] font-semibold text-slate-500 hidden md:inline">
              &bull; Step 1: Train &rarr; Step 2: Disturbances &rarr; Step 3: Corridor &rarr; Step 4: Output Details
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Output status badge */}
            {predictionResult && (
              <button
                type="button"
                onClick={() => goToStep(4)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold transition-all border shadow-2xs ${
                  activeStep === 4
                    ? 'bg-emerald-700 text-white border-emerald-800'
                    : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-emerald-300'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Output Active for {selectedTrainNo} &bull; Step 4 &rarr;</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Step Interactive Slider Tabs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {STEPS_CONFIG.map((s) => {
            const Icon = s.icon;
            const isActive = activeStep === s.step;
            const isCompleted =
              s.step === 1
                ? Boolean(trainInfo)
                : s.step === 2
                ? Boolean(cases.train_tier)
                : s.step === 3
                ? Boolean(selectedSegment || corridor)
                : Boolean(predictionResult);

            return (
              <button
                key={s.step}
                type="button"
                onClick={() => goToStep(s.step)}
                className={`relative flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all border ${
                  isActive
                    ? 'bg-irctc-blue text-white border-irctc-blue shadow-md'
                    : isCompleted
                    ? 'bg-emerald-50/70 text-slate-800 border-emerald-200 hover:border-emerald-300'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                {/* Step number badge */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-extrabold text-xs transition-colors ${
                    isActive
                      ? 'bg-irctc-orange text-white shadow-xs'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {isCompleted && !isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.step}
                </div>

                {/* Step description */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-xs font-extrabold truncate ${
                        isActive ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {s.shortTitle}
                    </span>
                    {isActive && (
                      <span className="text-[8.5px] bg-white/20 text-white uppercase font-black px-1.5 py-0.2 rounded-full">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-[10.5px] truncate leading-tight mt-0.5 ${
                      isActive ? 'text-blue-100' : 'text-slate-500'
                    }`}
                  >
                    {s.step === 1 && trainInfo
                      ? `${trainInfo.train_no} • ${trainInfo.train_tier}`
                      : s.step === 2
                      ? `${cases.weather} • TSR: ${cases.tsr_level}`
                      : s.step === 3
                      ? `${corridor} • ${selectedSegment || 'Auto Segment'}`
                      : s.step === 4 && predictionResult
                      ? `${predictionResult.math_resolution.Arrival_Status} (${predictionResult.math_resolution.Predicted_ETA})`
                      : s.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Auto-advance notification toast */}
        {autoAdvanceNotice && (
          <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-between animate-pulse">
            <span>{autoAdvanceNotice}</span>
            <button
              type="button"
              onClick={() => goToStep(2)}
              className="text-[11px] underline font-extrabold ml-2"
            >
              Go to Step 2 Now &rarr;
            </button>
          </div>
        )}
      </div>

      {/* Slider View (Progressive horizontal animated slides) */}
      <div className="relative overflow-hidden w-full">
          <AnimatePresence mode="wait" custom={direction}>
            {/* Slide 1: Train Search & Schedule Lookup */}
            {activeStep === 1 && (
              <motion.div
                key="step-1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full"
              >
                <div className="space-y-4">
                  {/* Step 1 Main Form */}
                  <TrainSearch
                    selectedTrainNo={selectedTrainNo}
                    trainInfo={trainInfo}
                    onSelectTrain={handleTrainSelectedWithSlider}
                    isLoading={isLoading}
                  />

                  {/* Optional Live GPS Telemetry Accordion inside Step 1 */}
                  <div className="irctc-card p-3 bg-white/70 border border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => setShowLiveGps((prev) => !prev)}
                      className="w-full flex items-center justify-between text-xs font-extrabold text-irctc-blue hover:text-irctc-orange transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Radio className="w-4 h-4 text-irctc-orange animate-pulse" />
                        <span>Optional: Live GPS Location &amp; Ground Truth Synchronization</span>
                      </div>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200">
                        {showLiveGps ? 'Collapse GPS Tracker ▲' : 'Open Live Telemetry GPS ▼'}
                      </span>
                    </button>

                    {showLiveGps && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <LiveGpsTracker
                          selectedTrainNo={selectedTrainNo}
                          onTrackTrain={onTrackLiveGps}
                          liveGpsData={liveGpsData}
                          isLoading={isTrackingLiveGps}
                          isFrozen={isFrozen}
                          onToggleFreeze={onToggleFreeze}
                          trainInfo={trainInfo}
                          segments={segments}
                          selectedSegment={selectedSegment}
                          onChangeSegment={onChangeSegment}
                          sectionDelayMins={sectionDelayMins}
                          onUpdateSectionDelay={onUpdateSectionDelay}
                          speedupRecoveryMins={speedupRecoveryMins}
                          onUpdateSpeedupRecovery={onUpdateSpeedupRecovery}
                          multiStationInjections={multiStationInjections}
                          onUpdateMultiStationInjections={onUpdateMultiStationInjections}
                          countdownSeconds={telemetryCountdown}
                          onAdvanceToDisturbances={() => goToStep(2)}
                          onCancelCountdown={() => setTelemetryCountdown(null)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Step 1 Centered Floating Action Dock */}
                  <div className="flex items-center justify-center my-6">
                    <div className="inline-flex flex-wrap items-center justify-center gap-3 p-2 sm:p-2.5 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-full shadow-lg">
                      <div className="flex items-center gap-2 px-3 py-1 text-xs font-semibold text-slate-600">
                        <span className="font-mono bg-blue-50 text-irctc-blue px-2.5 py-0.5 rounded-full border border-blue-200 font-bold">
                          Step 1 of 3
                        </span>
                        <span>
                          {trainInfo
                            ? `Train ${trainInfo.train_no} (${trainInfo.train_tier})`
                            : 'Pick a Train'}
                        </span>
                      </div>

                      <div className="hidden sm:block h-6 w-px bg-slate-200" />

                      <button
                        type="button"
                        onClick={nextStep}
                        className="inline-flex items-center gap-2 rounded-full bg-irctc-blue hover:bg-irctc-blue-dark text-white font-extrabold text-xs sm:text-sm px-6 py-2.5 shadow-md hover:shadow-lg transition-all transform active:scale-95 cursor-pointer"
                      >
                        <span>Continue to Operational Disturbances (Step 2)</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Slide 2: Operational Disturbance Matrix */}
            {activeStep === 2 && (
              <motion.div
                key="step-2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full"
              >
                <div className="space-y-4">
                  {/* Step 2 Main Form */}
                  <OperationalControls
                    cases={cases}
                    onChangeCase={onChangeCase}
                    onResetCases={onResetCases}
                    onApplyPreset={onApplyPreset}
                    isFrozen={isFrozen}
                    lockReason={liveGpsData?.frozen_controls?.lock_reason}
                    onToggleFreeze={onToggleFreeze}
                    trainInfo={trainInfo}
                    selectedTrainNo={selectedTrainNo}
                    segments={segments}
                    selectedSegment={selectedSegment}
                    onChangeSegment={onChangeSegment}
                    sectionDelayMins={sectionDelayMins}
                    onUpdateSectionDelay={onUpdateSectionDelay}
                    speedupRecoveryMins={speedupRecoveryMins}
                    onUpdateSpeedupRecovery={onUpdateSpeedupRecovery}
                    multiStationInjections={multiStationInjections}
                    onUpdateMultiStationInjections={onUpdateMultiStationInjections}
                  />

                  {/* Step 2 Centered Floating Action Dock */}
                  <div className="flex items-center justify-center my-6">
                    <div className="inline-flex flex-wrap items-center justify-center gap-3 p-2 sm:p-2.5 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-full shadow-lg">
                      <button
                        type="button"
                        onClick={prevStep}
                        className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Step 1</span>
                      </button>

                      <div className="hidden sm:block h-6 w-px bg-slate-200" />

                      <button
                        type="button"
                        onClick={nextStep}
                        className="inline-flex items-center gap-2 rounded-full bg-irctc-blue hover:bg-irctc-blue-dark text-white font-extrabold text-xs sm:text-sm px-6 py-2.5 shadow-md hover:shadow-lg transition-all transform active:scale-95 cursor-pointer"
                      >
                        <span>Continue to Corridor Routing (Step 3)</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Slide 3: Corridor Route & State Segmentation */}
            {activeStep === 3 && (
              <motion.div
                key="step-3"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full"
              >
                <div className="space-y-4">
                  {/* Step 3 Main Form */}
                  <SegmentationControls
                    corridor={corridor}
                    onChangeCorridor={onChangeCorridor}
                    borderCrossing={borderCrossing}
                    onChangeBorderCrossing={onChangeBorderCrossing}
                    selectedSegment={selectedSegment}
                    onChangeSegment={onChangeSegment}
                    segments={segments}
                    dbStatus={dbStatus}
                    onPushToDb={onPushToDb}
                    onResetDb={onResetDb}
                    isPushing={isPushing}
                    isResetting={isResetting}
                    toastMessage={toastMessage}
                    isFrozen={isFrozen}
                    lockReason={liveGpsData?.frozen_controls?.lock_reason}
                  />

                  {/* Multi-Segment Disturbance Circumstances with "+ Add More" */}
                  <MultiSegmentCircumstances
                    trainInfo={trainInfo}
                    segments={segments}
                    multiStationInjections={multiStationInjections || []}
                    onUpdateMultiStationInjections={onUpdateMultiStationInjections || (() => {})}
                    isFrozen={isFrozen}
                    lockReason={liveGpsData?.frozen_controls?.lock_reason}
                  />

                  {/* Step 3 Centered Floating Action Dock */}
                  <div className="flex items-center justify-center my-6">
                    <div className="inline-flex flex-wrap items-center justify-center gap-3 p-2 sm:p-2.5 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-full shadow-lg">
                      <button
                        type="button"
                        onClick={prevStep}
                        className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Step 2</span>
                      </button>

                      <div className="hidden sm:block h-6 w-px bg-slate-200" />

                      <button
                        type="button"
                        onClick={handleCalculateAndSlide}
                        disabled={isLoading}
                        className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-irctc-orange via-orange-500 to-amber-500 hover:from-irctc-orange-dark hover:to-orange-600 text-white font-black text-xs sm:text-sm px-7 py-3 shadow-md hover:shadow-orange-500/30 transition-all transform active:scale-95 disabled:opacity-75 cursor-pointer"
                      >
                        <Zap className={`w-4 h-4 text-amber-100 fill-amber-100 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>
                          {isLoading
                            ? 'CALCULATING DERIVATION...'
                            : 'CALCULATE COMPOUND DELAY & CASCADE'}
                        </span>
                        <ArrowRight className="w-4 h-4 text-amber-100" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Slide 4: Simulation Output & Mathematical Derivation (THE DETAILS PAGE) */}
            {activeStep === 4 && (
              <motion.div
                key="step-4"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full"
              >
                <div className="space-y-5">
                  {/* Top Bar for Output Page */}
                  <div className="irctc-card p-4 bg-white flex flex-wrap items-center justify-between gap-3 shadow-sm border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => goToStep(3)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2 transition-all"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Corridor Routing</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => goToStep(1)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs px-3.5 py-2 transition-all"
                      >
                        <span>Step 1: Train Search</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500">
                        Showing output for:
                      </span>
                      <span className="text-xs font-mono font-bold bg-blue-50 text-irctc-blue border border-blue-200 px-2.5 py-1 rounded-full">
                        Train {selectedTrainNo} &bull; {trainInfo?.train_name || 'Selected'}
                      </span>
                      <button
                        type="button"
                        onClick={onCalculate}
                        disabled={isLoading}
                        className="inline-flex items-center gap-1.5 rounded-full bg-irctc-orange hover:bg-irctc-orange-dark text-white font-bold text-xs px-4 py-2 transition-all shadow-xs"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>Re-calculate</span>
                      </button>
                    </div>
                  </div>

                  {/* Loading State or Full Derivation Details */}
                  {isLoading ? (
                    <div className="irctc-card p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                      <div className="w-12 h-12 mx-auto mb-4 border-4 border-irctc-blue border-t-transparent rounded-full animate-spin" />
                      <h3 className="text-base font-extrabold text-irctc-blue mb-1">
                        Computing 5-Stage Mathematical Derivation...
                      </h3>
                      <p className="text-xs text-slate-500">
                        Evaluating operational scenarios, calculating safe headway, single-track conflicts, and slack absorption for Train {selectedTrainNo}.
                      </p>
                    </div>
                  ) : predictionResult ? (
                    <>
                      {/* Results Dashboard Card with KPI metrics & 5-stage derivation table */}
                      <ResultsDashboard result={predictionResult} isLoading={isLoading} />

                      {/* Dispatch Explanation Card (Kinetic, Network Precedence, Buffer Recovery) */}
                      <DelayExplanation explanation={predictionResult.explanation || null} />

                      {/* Cascaded Delays & Temporal Overlays Table */}
                      <CascadedDelays cascaded={predictionResult.cascaded_delays || null} />
                    </>
                  ) : (
                    <div className="irctc-card p-8 text-center bg-white rounded-xl border border-slate-200">
                      <p className="text-sm font-bold text-slate-700 mb-3">
                        No simulation output loaded for Train {selectedTrainNo} yet.
                      </p>
                      <button
                        type="button"
                        onClick={onCalculate}
                        className="inline-flex items-center gap-2 rounded-full bg-irctc-orange text-white font-bold text-xs px-5 py-2.5 shadow-md"
                      >
                        <Zap className="w-4 h-4 text-amber-100" />
                        <span>Calculate Compound Delay Now</span>
                      </button>
                    </div>
                  )}

                  {/* Bottom Navigation for Output Page - Centered Floating Dock */}
                  <div className="flex items-center justify-center my-6">
                    <div className="inline-flex flex-wrap items-center justify-center gap-3 p-2 sm:p-2.5 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-full shadow-lg">
                      <button
                        type="button"
                        onClick={() => goToStep(3)}
                        className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Step 3: Corridor Routing</span>
                      </button>

                      <div className="hidden sm:block h-6 w-px bg-slate-200" />

                      <button
                        type="button"
                        onClick={() => goToStep(1)}
                        className="inline-flex items-center gap-2 rounded-full bg-irctc-blue hover:bg-irctc-blue-dark text-white font-extrabold text-xs sm:text-sm px-6 py-2.5 shadow-md hover:shadow-lg transition-all transform active:scale-95 cursor-pointer"
                      >
                        <Train className="w-4 h-4" />
                        <span>Search Another Train (Step 1)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
    </div>
  );
};

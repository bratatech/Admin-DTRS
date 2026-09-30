'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { TrainSearch } from '@/components/TrainSearch';
import { OperationalControls } from '@/components/OperationalControls';
import { SegmentationControls } from '@/components/SegmentationControls';
import { ResultsDashboard } from '@/components/ResultsDashboard';
import { DelayExplanation } from '@/components/DelayExplanation';
import { CascadedDelays } from '@/components/CascadedDelays';
import { CorridorsExplorer } from '@/components/CorridorsExplorer';
import { StateBordersExplorer } from '@/components/StateBordersExplorer';
import { NavTabType } from '@/components/Header';
import {
  TrainInfo,
  OperationalCases,
  RouteSegment,
  PredictionResult,
  DbSimulationStatus,
} from '@/types';
import { Zap, ShieldCheck } from 'lucide-react';

const INITIAL_CASES: OperationalCases = {
  train_tier: 'T1_PREMIUM',
  weather: 'Clear',
  tsr_level: 'None',
  priority_congestion: 'None',
  treta_block_occupancy: 'Track_Clear',
  crossing_conflict: 'Double_Quad_Track',
  alarm_chain_pulling: '0_Events',
  engine_failure: 'Nominal',
  terminal_platform_hold: 'Platform_Available',
  crew_duty_status: 'Duty_Valid',
  treta_segment_number: '',
};

export default function Home() {
  const [selectedTrainNo, setSelectedTrainNo] = useState<string>('12001');
  const [trainInfo, setTrainInfo] = useState<TrainInfo | null>(null);
  const [cases, setCases] = useState<OperationalCases>(INITIAL_CASES);
  const [corridor, setCorridor] = useState<string>('ALL');
  const [borderCrossing, setBorderCrossing] = useState<string>('ALL');
  const [selectedSegment, setSelectedSegment] = useState<string>('');
  const [segments, setSegments] = useState<RouteSegment[]>([]);
  const [dbStatus, setDbStatus] = useState<DbSimulationStatus | null>(null);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; isSuccess: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<NavTabType>('engine');

  const showToast = (text: string, isSuccess: boolean = true) => {
    setToastMessage({ text, isSuccess });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleSelectCorridorFromExplorer = (corrSlug: string) => {
    handleChangeCorridor(corrSlug);
    setActiveTab('engine');
    showToast(`Filtered Corridor: ${corrSlug}. Switched to Compound Delay Engine.`, true);
  };


  // 1. Fetch DB Status
  const fetchDbStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/simulation/status');
      if (res.ok) {
        const data: DbSimulationStatus = await res.json();
        setDbStatus(data);
      }
    } catch (e) {
      console.warn('Failed to fetch DB status:', e);
    }
  }, []);

  // 2. Fetch Segments list
  const fetchSegments = useCallback(
    async (corr: string, crossing: string, tNo: string) => {
      try {
        const params = new URLSearchParams();
        if (corr && corr !== 'ALL') params.append('corridor_slug', corr);
        if (crossing !== 'ALL') params.append('is_border_crossing', crossing);
        if (tNo) params.append('train_no', tNo);
        params.append('limit', '300');

        const res = await fetch(`/api/segments?${params.toString()}`);
        if (res.ok) {
          const data: RouteSegment[] = await res.json();
          setSegments(data);
        }
      } catch (e) {
        console.error('Failed to fetch segments:', e);
      }
    },
    []
  );

  // 3. Predict Compound Delay
  const calculatePrediction = useCallback(
    async (currentCases: OperationalCases, tNo: string, segNo: string) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          train_no: tNo,
          train_tier: currentCases.train_tier,
          weather: currentCases.weather,
          congestion: currentCases.priority_congestion,
          tsr: currentCases.tsr_level,
          treta_block_occupancy: currentCases.treta_block_occupancy,
          crossing_conflict: currentCases.crossing_conflict,
          chain_pulling: currentCases.alarm_chain_pulling,
          engine_failure: currentCases.engine_failure,
          terminal_platform_hold: currentCases.terminal_platform_hold,
          crew_duty_status: currentCases.crew_duty_status,
        });

        if (segNo) {
          params.append('treta_segment_number', segNo);
        }

        const res = await fetch(`/api/predict?${params.toString()}`);
        if (res.ok) {
          const data: PredictionResult = await res.json();
          setPredictionResult(data);
        }
      } catch (e) {
        console.error('Prediction calculation failed:', e);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // 4. Select and Auto-Pickup Train
  const handleSelectTrain = useCallback(
    async (tNo: string) => {
      setSelectedTrainNo(tNo);
      setSelectedSegment('');
      try {
        const res = await fetch(`/api/train_info?train_no=${encodeURIComponent(tNo)}`);
        if (res.ok) {
          const data: TrainInfo = await res.json();
          if (!data.error) {
            setTrainInfo(data);
            const nextCases: OperationalCases = {
              ...INITIAL_CASES,
              train_tier: data.train_tier || 'T1_PREMIUM',
              treta_segment_number: '',
            };
            setCases(nextCases);

            // Fetch segments for this train
            if (data.segments && data.segments.length > 0) {
              setSegments(data.segments);
              setCorridor(data.relevant_corridor_slug || 'ALL');
            } else {
              fetchSegments('ALL', 'ALL', tNo);
            }

            calculatePrediction(nextCases, tNo, '');
          }
        }
      } catch (e) {
        console.error('Failed to auto-pickup train info:', e);
      }
    },
    [fetchSegments, calculatePrediction]
  );

  // Initial Load - runs only once on mount
  useEffect(() => {
    fetchDbStatus();
    handleSelectTrain('12001');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Case Field Change
  const handleChangeCase = (field: keyof OperationalCases, value: string) => {
    const updated = { ...cases, [field]: value };
    setCases(updated);
    calculatePrediction(updated, selectedTrainNo, selectedSegment);
  };

  // Handle Corridor Change
  const handleChangeCorridor = (newCorridor: string) => {
    setCorridor(newCorridor);
    fetchSegments(newCorridor, borderCrossing, selectedTrainNo);
  };

  // Handle Border Crossing Filter Change
  const handleChangeBorderCrossing = (newCrossing: string) => {
    setBorderCrossing(newCrossing);
    fetchSegments(corridor, newCrossing, selectedTrainNo);
  };

  // Handle Segment Change
  const handleChangeSegment = (segNum: string) => {
    setSelectedSegment(segNum);
    const updatedCases = { ...cases, treta_segment_number: segNum };
    setCases(updatedCases);
    calculatePrediction(updatedCases, selectedTrainNo, segNum);
  };

  // Reset to Ideal Baseline
  const handleResetCases = () => {
    const reset = {
      ...INITIAL_CASES,
      train_tier: trainInfo?.train_tier || 'T1_PREMIUM',
      treta_segment_number: selectedSegment,
    };
    setCases(reset);
    calculatePrediction(reset, selectedTrainNo, selectedSegment);
    showToast('Reset operational cases to ideal baseline (±0m disturbance).', true);
  };

  // Quick Preset Scenarios
  const handleApplyPreset = (presetName: string) => {
    let presetCases: OperationalCases = {
      ...cases,
      train_tier: trainInfo?.train_tier || cases.train_tier,
    };

    switch (presetName) {
      case 'ideal':
        presetCases = {
          ...presetCases,
          weather: 'Clear',
          tsr_level: 'None',
          priority_congestion: 'None',
          treta_block_occupancy: 'Track_Clear',
          crossing_conflict: 'Double_Quad_Track',
          alarm_chain_pulling: '0_Events',
          engine_failure: 'Nominal',
          terminal_platform_hold: 'Platform_Available',
          crew_duty_status: 'Duty_Valid',
        };
        break;
      case 'fog':
        presetCases = {
          ...presetCases,
          weather: 'Fog',
          tsr_level: 'Minor',
          priority_congestion: 'High',
          treta_block_occupancy: 'Preceding_Delayed_Minor',
        };
        break;
      case 'monsoon':
        presetCases = {
          ...presetCases,
          weather: 'Heavy_Rain',
          crossing_conflict: 'Minor_Crossing_Wait',
          priority_congestion: 'Low',
          tsr_level: 'Minor',
        };
        break;
      case 'breakdown':
        presetCases = {
          ...presetCases,
          engine_failure: 'Failure',
          alarm_chain_pulling: '1_Event',
          treta_block_occupancy: 'Preceding_Delayed_Moderate',
        };
        break;
      case 'border':
        presetCases = {
          ...presetCases,
          priority_congestion: 'High',
          crew_duty_status: 'Duty_Exceeded',
          crossing_conflict: 'Major_Crossing_Wait',
        };
        break;
    }

    setCases(presetCases);
    calculatePrediction(presetCases, selectedTrainNo, selectedSegment);
    showToast(`Applied preset scenario: ${presetName.toUpperCase()}`, true);
  };

  // Push to DB Sandbox
  const handlePushToDb = async () => {
    if (!predictionResult) return;
    setIsPushing(true);
    try {
      const payload = {
        train_no: selectedTrainNo,
        treta_segment_number: selectedSegment || null,
        net_delay_mins: predictionResult.math_resolution.NetDelay,
        predicted_eta: predictionResult.math_resolution.Predicted_ETA,
        status: predictionResult.math_resolution.Arrival_Status,
        cascaded_trains: predictionResult.cascaded_delays.overlaid_trains,
      };

      const res = await fetch('/api/simulation/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        fetchDbStatus();
        showToast(
          `Successfully pushed to simulation sandbox! ${data.records_updated} records updated. Master WIN.db untouched.`,
          true
        );
      } else {
        showToast('Failed to push to simulation database.', false);
      }
    } catch (e) {
      showToast('Network error pushing to simulation database.', false);
    } finally {
      setIsPushing(false);
    }
  };

  // Reset DB Sandbox
  const handleResetDb = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/simulation/reset', { method: 'POST' });
      if (res.ok) {
        fetchDbStatus();
        showToast('Simulation sandbox restored to pristine baseline from WIN.db master.', true);
      } else {
        showToast('Failed to reset simulation database.', false);
      }
    } catch (e) {
      showToast('Error resetting simulation database.', false);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen pb-16">
      {/* IRCTC Official Style Header */}
      <Header
        onComputeClick={() => {
          setActiveTab('engine');
          calculatePrediction(cases, selectedTrainNo, selectedSegment);
        }}
        dbStatus={dbStatus}
        onRefreshDbStatus={fetchDbStatus}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      {/* Main Container */}
      <main className="max-w-[1160px] mx-auto px-4 sm:px-6">
        {activeTab === 'corridors' && (
          <CorridorsExplorer onSelectCorridor={handleSelectCorridorFromExplorer} />
        )}

        {activeTab === 'borders' && (
          <StateBordersExplorer />
        )}

        {activeTab === 'engine' && (
          <>
            {/* Train Search & Auto-Pickup */}
            <TrainSearch
              selectedTrainNo={selectedTrainNo}
              trainInfo={trainInfo}
              onSelectTrain={handleSelectTrain}
              isLoading={isLoading}
            />

            {/* 10 Disturbance Attributes */}
            <OperationalControls
              cases={cases}
              onChangeCase={handleChangeCase}
              onResetCases={handleResetCases}
              onApplyPreset={handleApplyPreset}
            />

            {/* Segmentation & Corridor Routing */}
            <SegmentationControls
              corridor={corridor}
              onChangeCorridor={handleChangeCorridor}
              borderCrossing={borderCrossing}
              onChangeBorderCrossing={handleChangeBorderCrossing}
              selectedSegment={selectedSegment}
              onChangeSegment={handleChangeSegment}
              segments={segments}
              dbStatus={dbStatus}
              onPushToDb={handlePushToDb}
              onResetDb={handleResetDb}
              isPushing={isPushing}
              isResetting={isResetting}
              toastMessage={toastMessage}
            />

            {/* Calculate Button Toolbar */}
            <div className="irctc-card p-4 mb-5 flex flex-wrap items-center justify-between gap-4 bg-white">
              <button
                type="button"
                onClick={() => calculatePrediction(cases, selectedTrainNo, selectedSegment)}
                className="bg-irctc-orange hover:bg-irctc-orange-dark text-white font-extrabold text-sm px-6 py-3 rounded-lg shadow-md transition-all transform active:scale-95 flex items-center gap-2"
              >
                <Zap className="w-5 h-5 text-amber-100 fill-amber-100" />
                <span>CALCULATE / RECOMPUTE COMPOUND DELAY</span>
              </button>
              <div className="text-xs text-slate-500 font-medium">
                Evaluates against <strong>38,880 MasterPnC Scenarios</strong> &amp;{' '}
                <strong>857 Corridor Segments</strong> in <strong>Database WIN</strong>
              </div>
            </div>

            {/* Results & 5-Stage Derivation */}
            <ResultsDashboard result={predictionResult} isLoading={isLoading} />

            {/* Delay Explanation Attribute */}
            <DelayExplanation explanation={predictionResult?.explanation || null} />

            {/* Cascaded Delays & Overlays Attribute */}
            <CascadedDelays cascaded={predictionResult?.cascaded_delays || null} />
          </>
        )}
      </main>


      {/* IRCTC Styled Footer */}
      <footer className="max-w-[1160px] mx-auto px-4 mt-8 pt-6 border-t border-slate-300 text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-700">
          Indian Railways Compound Delay &amp; Corridor Segment Engine &bull; Database WIN Matrix
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          CRIS Timetable Integration &bull; 5-Stage Mathematical Verification &bull; Simulation Sandbox Protection
        </p>
      </footer>
    </div>
  );
}

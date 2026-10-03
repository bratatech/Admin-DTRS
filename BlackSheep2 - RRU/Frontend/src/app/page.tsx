'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { CorridorsExplorer } from '@/components/CorridorsExplorer';
import { StateBordersExplorer } from '@/components/StateBordersExplorer';
import { EngineFormSlider } from '@/components/EngineFormSlider';
import { AssistantDashboard } from '@/components/AssistantDashboard';
import { BroadcastPortal } from '@/components/BroadcastPortal';
import { NavTabType } from '@/components/Header';
import {
  TrainInfo,
  OperationalCases,
  RouteSegment,
  PredictionResult,
  DbSimulationStatus,
  LiveMatchResponse,
  StationCircumstance,
} from '@/types';

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
  const [selectedAssistantAgent, setSelectedAssistantAgent] = useState<'crew' | 'platform' | 'tracks' | 'resource'>('crew');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [liveGpsData, setLiveGpsData] = useState<LiveMatchResponse | null>(null);
  const [isFrozen, setIsFrozen] = useState<boolean>(false);
  const [isTrackingLiveGps, setIsTrackingLiveGps] = useState<boolean>(false);
  const [sliderStep, setSliderStep] = useState<1 | 2 | 3 | 4>(1);
  const [sectionDelayMins, setSectionDelayMins] = useState<number>(0);
  const [speedupRecoveryMins, setSpeedupRecoveryMins] = useState<number>(0);
  const [multiStationInjections, setMultiStationInjections] = useState<StationCircumstance[]>([]);

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
    async (
      currentCases: OperationalCases,
      tNo: string,
      segNo: string,
      secDelayOverride?: number,
      speedupOverride?: number,
      multiInjOverride?: StationCircumstance[]
    ) => {
      setIsLoading(true);
      try {
        const secMins = secDelayOverride !== undefined ? secDelayOverride : (currentCases.section_delay_mins ?? sectionDelayMins ?? 0);
        const speedup = speedupOverride !== undefined ? speedupOverride : speedupRecoveryMins;
        const multiInj = multiInjOverride !== undefined ? multiInjOverride : multiStationInjections;

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
          section_delay_mins: String(secMins),
          speedup_recovery_mins: String(speedup),
        });

        if (segNo) {
          params.append('treta_segment_number', segNo);
        }
        if (multiInj && multiInj.length > 0) {
          params.append('multi_station_injections', JSON.stringify(multiInj));
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
    [sectionDelayMins, speedupRecoveryMins, multiStationInjections]
  );

  // 4. Select and Auto-Pickup Train
  const handleSelectTrain = useCallback(
    async (tNo: string, shouldCalculate: boolean = false) => {
      setSelectedTrainNo(tNo);
      setSelectedSegment('');
      setPredictionResult(null);
      try {
        const res = await fetch(`/api/train_info?train_no=${encodeURIComponent(tNo)}`);
        if (res.ok) {
          const data: TrainInfo = await res.json();
          if (!data.error) {
            const tier = data.train_tier || 'T1_PREMIUM';
            const autoSpeedup = typeof data.default_speedup_recovery_mins === 'number'
              ? data.default_speedup_recovery_mins
              : (tier.startsWith('T1') ? 20 : (tier.startsWith('T2') ? 15 : 10));
            setSpeedupRecoveryMins(autoSpeedup);

            const nextCases: OperationalCases = {
              ...INITIAL_CASES,
              train_tier: tier,
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

            if (shouldCalculate) {
              calculatePrediction(nextCases, tNo, '');
            }
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
    handleSelectTrain('12001', false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Explicit execute calculate handler (triggered on clicking compound delay and cascade in Step 3 or navbar)
  const handleExecuteCalculate = async () => {
    setSliderStep(4);
    await calculatePrediction(cases, selectedTrainNo, selectedSegment);
  };

  // Handle Case Field Change
  const handleChangeCase = (field: keyof OperationalCases, value: string) => {
    const updated = { ...cases, [field]: value };
    setCases(updated);
    if (sliderStep === 4) {
      calculatePrediction(updated, selectedTrainNo, selectedSegment);
    }
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
    if (sliderStep === 4) {
      calculatePrediction(updatedCases, selectedTrainNo, segNum);
    }
  };

  // Reset to Ideal Baseline
  const handleResetCases = () => {
    const reset = {
      ...INITIAL_CASES,
      train_tier: trainInfo?.train_tier || 'T1_PREMIUM',
      treta_segment_number: selectedSegment,
    };
    setCases(reset);
    if (sliderStep === 4) {
      calculatePrediction(reset, selectedTrainNo, selectedSegment);
    }
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
    if (sliderStep === 4) {
      calculatePrediction(presetCases, selectedTrainNo, selectedSegment);
    }
    showToast(`Applied preset scenario: ${presetName.toUpperCase()}`, true);
  };


  // Track Live Location with GPS Telemetry API & Auto-Freeze in Engine
  const handleTrackLiveGps = async (
    trainNo: string,
    sectionDelay?: number,
    customSegment?: string,
    speedupRecovery?: number,
    multiInjections?: StationCircumstance[]
  ) => {
    setIsTrackingLiveGps(true);
    try {
      const secDelay = typeof sectionDelay === 'number' ? sectionDelay : sectionDelayMins;
      const targetSeg = customSegment !== undefined ? customSegment : selectedSegment;
      const speedup = typeof speedupRecovery === 'number' ? speedupRecovery : speedupRecoveryMins;
      const multiInj = multiInjections !== undefined ? multiInjections : multiStationInjections;

      const params = new URLSearchParams({
        train_no: trainNo,
        section_delay_mins: String(secDelay),
        speedup_recovery_mins: String(speedup),
      });
      if (targetSeg) {
        params.append('treta_segment_number', targetSeg);
      }
      if (multiInj && multiInj.length > 0) {
        params.append('multi_station_injections', JSON.stringify(multiInj));
      }

      const storedKey = typeof window !== 'undefined'
        ? (localStorage.getItem('LIVE_API_KEY') || localStorage.getItem('RAILRADAR_API_KEY') || '')
        : '';
      if (storedKey) {
        params.append('api_key', storedKey);
      }
      const liveHeaders: Record<string, string> = {};
      if (storedKey) {
        liveHeaders['x-api-key'] = storedKey;
      }

      // Fetch live telemetry and full TrainInfo metadata concurrently
      const [resLiveTelemetry, resTrainInfo] = await Promise.all([
        fetch(`/api/railradar/auto_fetch_and_freeze?${params.toString()}`, { headers: liveHeaders }),
        fetch(`/api/train_info?train_no=${encodeURIComponent(trainNo)}`)
      ]);

      if (!resLiveTelemetry.ok) throw new Error('Failed to fetch live telemetry');
      const data: LiveMatchResponse = await resLiveTelemetry.json();

      if (resTrainInfo.ok) {
        const infoData: TrainInfo = await resTrainInfo.json();
        if (!infoData.error) {
          setTrainInfo(infoData);
          if (infoData.segments && infoData.segments.length > 0) {
            setSegments(infoData.segments);
          }
          if (infoData.relevant_corridor_slug) {
            setCorridor(infoData.relevant_corridor_slug);
          }
          const tier = infoData.train_tier || 'T1_PREMIUM';
          setCases((prev) => ({
            ...prev,
            train_tier: tier,
          }));
          const autoSpeedup = typeof infoData.default_speedup_recovery_mins === 'number'
            ? infoData.default_speedup_recovery_mins
            : (tier.startsWith('T1') ? 20 : (tier.startsWith('T2') ? 15 : 10));
          setSpeedupRecoveryMins(autoSpeedup);
        }
      }

      setLiveGpsData(data);
      const effectiveTrainNo = data.train_no || trainNo;
      setSelectedTrainNo(effectiveTrainNo);
      if (typeof sectionDelay === 'number') {
        setSectionDelayMins(sectionDelay);
      }
      if (typeof speedupRecovery === 'number') {
        setSpeedupRecoveryMins(speedupRecovery);
      }
      if (multiInjections !== undefined) {
        setMultiStationInjections(multiInjections);
      }

      if (data.frozen_controls) {
        setCorridor(data.frozen_controls.corridor);
        setBorderCrossing(data.frozen_controls.border_crossing);
        setSelectedSegment(data.frozen_controls.selected_segment);
        setCases(data.frozen_controls.cases);
      }

      if (data.prediction) {
        setPredictionResult(data.prediction);
      }

      const rawObj = data.raw_telemetry || (data as any)[['rail', 'radar', '_raw'].join('')];
      const isLive = Boolean(rawObj?.isLive);
      setIsFrozen(isLive);
      fetchDbStatus();
      if (isLive) {
        showToast(
          `📡 [LIVE SYNC] Live ground truth for ${data.train_name} synchronized. Baseline Scenario #${data.matched_combination.combination_id} auto-fetched & frozen!`,
          true
        );
      } else {
        showToast(
          `ℹ️ [LIVE SYNC] Loaded Train ${data.train_no} (${data.train_name}). Operational baseline active.`,
          true
        );
      }
    } catch (e: any) {
      showToast(e.message || 'Error tracking live location', false);
    } finally {
      setIsTrackingLiveGps(false);
    }
  };

  const handleUpdateSectionDelay = (mins: number, segNo?: string) => {
    const targetSeg = segNo !== undefined ? segNo : selectedSegment;
    setSectionDelayMins(mins);
    if (segNo !== undefined) setSelectedSegment(segNo);

    if (liveGpsData) {
      handleTrackLiveGps(selectedTrainNo, mins, targetSeg, speedupRecoveryMins, multiStationInjections);
    } else {
      const updated = { ...cases, treta_segment_number: targetSeg, section_delay_mins: mins };
      setCases(updated);
      calculatePrediction(updated, selectedTrainNo, targetSeg, mins, speedupRecoveryMins, multiStationInjections);
    }
    showToast(`Injected +${mins}m section delay on ${targetSeg || 'route hop'}.`, true);
  };

  const handleUpdateSpeedupRecovery = (mins: number) => {
    setSpeedupRecoveryMins(mins);
    if (liveGpsData) {
      handleTrackLiveGps(selectedTrainNo, sectionDelayMins, selectedSegment, mins, multiStationInjections);
    } else {
      calculatePrediction(cases, selectedTrainNo, selectedSegment, sectionDelayMins, mins, multiStationInjections);
    }
    showToast(mins > 0 ? `Set Maximum Speed Recovery: -${mins}m cover-up on clear stretches.` : `Reset Speed Recovery to 0m.`, true);
  };

  const handleUpdateMultiStationInjections = (injections: StationCircumstance[]) => {
    setMultiStationInjections(injections);
    if (liveGpsData) {
      handleTrackLiveGps(selectedTrainNo, sectionDelayMins, selectedSegment, speedupRecoveryMins, injections);
    } else {
      calculatePrediction(cases, selectedTrainNo, selectedSegment, sectionDelayMins, speedupRecoveryMins, injections);
    }
    showToast(`Updated multi-station circumstance injections (${injections.length} active).`, true);
  };

  const handleToggleFreeze = () => {
    const next = !isFrozen;
    setIsFrozen(next);
    showToast(
      next
        ? '🔒 Live ground truth re-frozen into operational controls.'
        : '🔓 Controls unlocked! You can now test manual what-if modifications.',
      true
    );
  };

  // Push to DB Sandbox
  const handlePushToDb = async () => {
    if (!predictionResult) return;
    setIsPushing(true);
    try {
      const payload = {
        train_no: selectedTrainNo,
        treta_segment_number: selectedSegment || null,
        sim_proposed_delay: predictionResult.math_resolution?.NetDelay ?? 0,
        sim_new_eta: predictionResult.math_resolution?.Predicted_ETA ?? '',
        sim_status: predictionResult.math_resolution?.Arrival_Status ?? 'ON_TIME',
        user_notes: `Manual Simulation Push: ${cases.weather} / TSR: ${cases.tsr_level} / Congestion: ${cases.priority_congestion}`,
      };

      const res = await fetch('/api/simulation/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(`Successfully saved what-if scenario to isolated Simulation Sandbox.`, true);
        fetchDbStatus();
      } else {
        showToast('Failed to push simulation to database.', false);
      }
    } catch (e) {
      showToast('Network error while pushing to simulation database.', false);
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
        showToast('Successfully restored Simulation Sandbox from Production baseline.', true);
        fetchDbStatus();
        calculatePrediction(cases, selectedTrainNo, selectedSegment);
      } else {
        showToast('Failed to reset simulation database.', false);
      }
    } catch (e) {
      showToast('Network error while resetting simulation database.', false);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12 font-sans selection:bg-irctc-orange/20 selection:text-irctc-orange flex flex-col">
      {/* Top Bar & Collapsible Sidebar */}
      <Header
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        trainInfo={trainInfo}
        selectedTrainNo={selectedTrainNo}
        onSearchSelect={(tNo) => {
          handleSelectTrain(tNo, true);
          setActiveTab('engine');
          handleExecuteCalculate();
        }}
        dbStatus={dbStatus}
        onRefreshDbStatus={fetchDbStatus}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        selectedAssistantAgent={selectedAssistantAgent}
        onSelectAssistantAgent={setSelectedAssistantAgent}
        onComputeClick={() => {
          setActiveTab('engine');
          handleExecuteCalculate();
        }}
      />

      {/* Main Content Area: dynamic margin offset based on sidebar state */}
      <div className={`transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
        <main className="max-w-[1360px] mx-auto px-4 sm:px-6 pt-5">
        {activeTab === 'corridors' && (
          <CorridorsExplorer onSelectCorridor={handleSelectCorridorFromExplorer} />
        )}

        {activeTab === 'borders' && (
          <StateBordersExplorer />
        )}

        {activeTab === 'assistant' && (
          <AssistantDashboard
            trainInfo={trainInfo}
            selectedTrainNo={selectedTrainNo}
            cases={cases}
            segments={segments}
            onSelectTrain={(tNo) => handleSelectTrain(tNo, false)}
            selectedAgent={selectedAssistantAgent}
            onSelectAgent={setSelectedAssistantAgent}
          />
        )}

        {activeTab === 'broadcast' && (
          <BroadcastPortal />
        )}

        {activeTab === 'engine' && (
          <EngineFormSlider
            selectedTrainNo={selectedTrainNo}
            trainInfo={trainInfo}
            onSelectTrain={(tNo) => handleSelectTrain(tNo, false)}
            isLoading={isLoading}
            onTrackLiveGps={handleTrackLiveGps}
            liveGpsData={liveGpsData}
            isTrackingLiveGps={isTrackingLiveGps}
            isFrozen={isFrozen}
            onToggleFreeze={handleToggleFreeze}
            cases={cases}
            onChangeCase={handleChangeCase}
            onResetCases={handleResetCases}
            onApplyPreset={handleApplyPreset}
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
            onCalculate={handleExecuteCalculate}
            predictionResult={predictionResult}
            currentStep={sliderStep}
            onStepChange={setSliderStep}
            sectionDelayMins={sectionDelayMins}
            onUpdateSectionDelay={handleUpdateSectionDelay}
            speedupRecoveryMins={speedupRecoveryMins}
            onUpdateSpeedupRecovery={handleUpdateSpeedupRecovery}
            multiStationInjections={multiStationInjections}
            onUpdateMultiStationInjections={handleUpdateMultiStationInjections}
          />
        )}
      </main>

        {/* DTRS SYSTEM Styled Footer */}
        <footer className="max-w-[1360px] mx-auto px-4 mt-8 pt-6 border-t border-slate-300 text-center text-xs text-slate-500">
          <p className="font-semibold text-slate-700">
            DTRS SYSTEM Compound Delay &amp; Corridor Segment Engine &bull; Operational Matrix
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            CRIS Timetable Integration &bull; 5-Stage Mathematical Verification &bull; Simulation Sandbox Protection
          </p>
        </footer>
      </div>
    </div>
  );
}

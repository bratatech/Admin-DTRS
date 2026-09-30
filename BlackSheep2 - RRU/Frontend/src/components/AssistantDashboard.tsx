'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  BrainCircuit,
  Radio,
  Train,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Split,
  Sliders,
  Layers,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Send,
  Zap,
  Users,
  Database,
  Compass,
  CornerDownRight,
  Maximize2,
  Activity,
  AlertOctagon,
  ChevronRight,
  Lightbulb,
  CloudFog,
  Eye,
  EyeOff,
  Volume2,
  Search,
  TrendingDown,
  TrendingUp,
  GitBranch,
  SlidersHorizontal,
  Timer,
  CheckSquare,
  Square,
  ArrowUpRight,
  BarChart3,
  FastForward,
} from 'lucide-react';
import { TrainInfo, OperationalCases, RouteSegment } from '@/types';

export type AgentSpecialty = 'crew' | 'platform' | 'tracks' | 'resource';

interface AssistantDashboardProps {
  trainInfo: TrainInfo | null;
  selectedTrainNo: string;
  cases: OperationalCases;
  segments: RouteSegment[];
  onSelectTrain?: (trainNo: string) => void;
  selectedAgent?: AgentSpecialty;
  onSelectAgent?: (agent: AgentSpecialty) => void;
}

interface AgentProfile {
  id: AgentSpecialty;
  letter: 'D' | 'T' | 'R' | 'S';
  name: string;
  codename: string;
  role: string;
  color: string;
  borderColor: string;
  badgeBg: string;
  accentBg: string;
  letterBg: string;
  description: string;
}

// Named AI Agents in strict DTRS order: Diya, Tripti, Riya, Smita
const AGENTS: AgentProfile[] = [
  {
    id: 'crew',
    letter: 'D',
    name: 'Diya',
    codename: 'AGENT-DIYA-CREW',
    role: 'Crew Assistant',
    color: 'text-amber-800',
    borderColor: 'border-amber-300',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
    accentBg: 'bg-amber-50/80',
    letterBg: 'bg-amber-500 text-white',
    description: 'Enforces 10h statutory driving limit, crew lobby relief buffers, rest compliance & deadheading swaps.',
  },
  {
    id: 'platform',
    letter: 'T',
    name: 'Tripti',
    codename: 'AGENT-TRIPTI-PLATFORM',
    role: 'Platform Assistant',
    color: 'text-sky-800',
    borderColor: 'border-sky-300',
    badgeBg: 'bg-sky-100 text-sky-900 border-sky-300',
    accentBg: 'bg-sky-50/80',
    letterBg: 'bg-sky-600 text-white',
    description: 'Manages platform dwell locks, 15m outer signal holds, rake turnaround windows & coaching yard evictions.',
  },
  {
    id: 'tracks',
    letter: 'R',
    name: 'Riya',
    codename: 'AGENT-RIYA-BLOCK',
    role: 'Block Assistant',
    color: 'text-rose-800',
    borderColor: 'border-rose-300',
    badgeBg: 'bg-rose-100 text-rose-900 border-rose-300',
    accentBg: 'bg-rose-50/80',
    letterBg: 'bg-rose-600 text-white',
    description: 'Tracks headway compression, 4-aspect signal cascades, dense fog speed caps & safe braking distance curves.',
  },
  {
    id: 'resource',
    letter: 'S',
    name: 'Smita',
    codename: 'AGENT-SMITA-ROLLING',
    role: 'Rolling Stock Assistant',
    color: 'text-emerald-800',
    borderColor: 'border-emerald-300',
    badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    accentBg: 'bg-emerald-50/80',
    letterBg: 'bg-emerald-600 text-white',
    description: 'Calculates WAP-7 tractive effort curves, TSR speed restrictions, regenerative braking & MPS recovery cover-up.',
  },
];

const PRESET_TRAIN_LIST = [
  { no: '12001', name: 'NDLS Shatabdi (New Delhi → Bhopal)' },
  { no: '12952', name: 'Tejas Rajdhani (New Delhi → Mumbai)' },
  { no: '12919', name: 'Malwa Express (Dr. Ambedkar Nagar → SMVD)' },
  { no: '12626', name: 'Kerala Express (New Delhi → Trivandrum)' },
  { no: '22436', name: 'Vande Bharat Express (NDLS → Varanasi)' },
  { no: '12260', name: 'Sealdah AC Duronto (Bikaner → Sealdah)' },
];

// Presets for parametric questions (1 or 2 variables)
const PRESET_QUESTIONS = {
  crew: [
    {
      id: 'q-crew-1',
      title: 'Duty Limit Expiry & Relief Swap',
      prompt: 'What is the ripple impact if Loco Crew duty exceeds statutory 10-hour limit?',
      var1Label: 'Target Train',
      var1Key: 'train',
      var1Options: [
        { label: '12001 NDLS Shatabdi (T1 Premium)', value: '12001' },
        { label: '12952 Tejas Rajdhani (T1 Premium)', value: '12952' },
        { label: '12919 Malwa Express (T2 Superfast)', value: '12919' },
        { label: '12626 Kerala Express (T2 Superfast)', value: '12626' },
      ],
      var2Label: 'Nearest Crew Lobby',
      var2Key: 'lobby',
      var2Options: [
        { label: 'Mathura Jn (MTJ) • KM 141', value: 'MTJ' },
        { label: 'Vadodara Jn (BRC) • KM 991', value: 'BRC' },
        { label: 'Kanpur Central (CNB) • KM 435', value: 'CNB' },
        { label: 'Itarsi Jn (ET) • KM 745', value: 'ET' },
        { label: 'Ratlam Jn (RTM) • KM 730', value: 'RTM' },
      ],
    },
    {
      id: 'q-crew-2',
      title: 'Night Driving HOER Fatigue Margin',
      prompt: 'Assess duty extension feasibility for late-night running into secondary division',
      var1Label: 'Target Train',
      var1Key: 'train',
      var1Options: [
        { label: '12952 Tejas Rajdhani', value: '12952' },
        { label: '12919 Malwa Express', value: '12919' },
      ],
      var2Label: 'Duty Hours Elapsed',
      var2Key: 'elapsed',
      var2Options: [
        { label: '7h 30m Elapsed (Approaching 9h warning)', value: '7.5' },
        { label: '9h 15m Elapsed (Critical Overtime Warning)', value: '9.25' },
        { label: '10h 30m Elapsed (Statutory Breach • Relief Mandatory)', value: '10.5' },
      ],
    },
  ],
  platform: [
    {
      id: 'q-plat-1',
      title: 'Terminal Platform Dwell Lock & Eviction',
      prompt: 'Simulate terminal platform lock and determine rake eviction priority',
      var1Label: 'Terminal Station',
      var1Key: 'station',
      var1Options: [
        { label: 'New Delhi (NDLS) • 16 Platforms', value: 'NDLS' },
        { label: 'Mumbai Central (MMCT) • 5 Platforms', value: 'MMCT' },
        { label: 'Hazrat Nizamuddin (NZM) • 7 Platforms', value: 'NZM' },
        { label: 'Howrah Jn (HWH) • 23 Platforms', value: 'HWH' },
      ],
      var2Label: 'Dwell Detention Duration',
      var2Key: 'detention',
      var2Options: [
        { label: '+15 mins (Buffer Slack Absorption)', value: '15' },
        { label: '+30 mins (Severe Outer Holding Triggered)', value: '30' },
        { label: '+45 mins (Platform Eviction Required)', value: '45' },
      ],
    },
    {
      id: 'q-plat-2',
      title: 'Loop Line Holding vs Main Line Clearance',
      prompt: 'Determine platform precedence between arriving premium service and trailing express',
      var1Label: 'Priority Train',
      var1Key: 'train',
      var1Options: [
        { label: '12001 NDLS Shatabdi (T1)', value: '12001' },
        { label: '12952 Tejas Rajdhani (T1)', value: '12952' },
      ],
      var2Label: 'Platform Availability',
      var2Key: 'platState',
      var2Options: [
        { label: 'Platform 1 Available (Clear Path)', value: 'P1_OK' },
        { label: 'Platform 1 Occupied by Stalled Freight', value: 'P1_BLOCKED' },
        { label: 'Coaching Rake Turnaround Delayed', value: 'RAKE_LATE' },
      ],
    },
  ],
  tracks: [
    {
      id: 'q-track-1',
      title: 'Headway Compression, Fog Sighting & Overlap',
      prompt: 'Evaluate braking curve overlap & collision risk under fog and trailing traffic',
      var1Label: 'Preceding Train Occupancy',
      var1Key: 'preceding',
      var1Options: [
        { label: 'Track Clear (Nominal 12m Headway)', value: 'Track_Clear' },
        { label: 'Preceding Delayed Minor (+5.0m Headway)', value: 'Preceding_Delayed_Minor' },
        { label: 'Preceding Delayed Moderate (+10.0m Headway)', value: 'Preceding_Delayed_Moderate' },
        { label: 'Preceding Delayed Severe (+20.0m Headway)', value: 'Preceding_Delayed_Severe' },
      ],
      var2Label: 'Atmospheric Visibility / Fog',
      var2Key: 'fog',
      var2Options: [
        { label: 'Clear Weather (Full Sighting • 130 km/h MPS)', value: 'CLEAR' },
        { label: 'Moderate Fog (Fog Pass Active • 60 km/h Cap)', value: 'MODERATE_FOG' },
        { label: 'Dense Blind Fog (<50m Sighting • 30 km/h • Detonators)', value: 'DENSE_FOG' },
      ],
    },
    {
      id: 'q-track-2',
      title: 'Scissor Crossover Switch & Route Lock',
      prompt: 'Simulate route lock throw from Up Main to Loop Line 1 to avert collision',
      var1Label: 'Crossover Route',
      var1Key: 'crossover',
      var1Options: [
        { label: 'Normal Main Line (130 km/h Straight)', value: 'MAIN_NORMAL' },
        { label: 'Loop 1 Turnout 1-in-12 (50 km/h)', value: 'LOOP_1_TURNOUT' },
        { label: 'Loop 2 Turnout 1-in-8.5 (30 km/h)', value: 'LOOP_2_TURNOUT' },
      ],
      var2Label: 'Fouling Mark Margin',
      var2Key: 'fouling',
      var2Options: [
        { label: 'Full 180m Overlap Clear (Interlocked)', value: 'CLEAR_180M' },
        { label: 'Overlap Marginal 60m (Braking Risk)', value: 'RISK_60M' },
        { label: 'Fouling Mark Breached by Stabling Loco', value: 'BREACHED' },
      ],
    },
  ],
  resource: [
    {
      id: 'q-res-1',
      title: 'TSR Restriction Friction & Speed Recovery',
      prompt: 'Calculate tractive drag penalty and speed recovery cover-up under caution order',
      var1Label: 'TSR Caution Level',
      var1Key: 'tsr',
      var1Options: [
        { label: 'None (Full MPS 130 km/h)', value: 'None' },
        { label: 'Minor Caution Order (30 km/h • +10.0m)', value: 'Minor' },
        { label: 'Major Engineering Block (±24.0m Drag)', value: 'Major' },
      ],
      var2Label: 'Locomotive Traction State',
      var2Key: 'engine',
      var2Options: [
        { label: 'Nominal WAP-7 (Full 6000 HP Traction)', value: 'Nominal' },
        { label: 'Traction Drag (Auxiliary Converter Snag)', value: 'Minor_Failure' },
        { label: 'Loco Fail (+12.5m Headway Ripple)', value: 'Major_Failure' },
      ],
    },
    {
      id: 'q-res-2',
      title: 'Regenerative Braking & MPS Section Slack',
      prompt: 'Assess maximum speedup recovery potential on downhill section gradient',
      var1Label: 'Target Corridor Segment',
      var1Key: 'segment',
      var1Options: [
        { label: 'NDLS → MTJ (Corridor 1 • Flat 130 km/h)', value: 'NDLS-MTJ' },
        { label: 'BPL → ET (Corridor 3 • Ghat Section 80 km/h)', value: 'BPL-ET' },
        { label: 'BRC → ST (Corridor 2 • Quad Track 130 km/h)', value: 'BRC-ST' },
      ],
      var2Label: 'Driver Recovery Authority',
      var2Key: 'speedup',
      var2Options: [
        { label: 'Standard Schedule (0 min recovery)', value: '0' },
        { label: 'Aggressive Cover-Up (-10 mins MPS push)', value: '10' },
        { label: 'Maximum T1 Buffer (-20 mins MPS recovery)', value: '20' },
      ],
    },
  ],
};

export const AssistantDashboard: React.FC<AssistantDashboardProps> = ({
  trainInfo,
  selectedTrainNo,
  cases,
  segments,
  onSelectTrain,
  selectedAgent: controlledAgent,
  onSelectAgent,
}) => {
  const [internalAgent, setInternalAgent] = useState<AgentSpecialty>('crew');
  const selectedAgent = controlledAgent !== undefined ? controlledAgent : internalAgent;

  const handleSelectAgent = (ag: AgentSpecialty) => {
    if (onSelectAgent) {
      onSelectAgent(ag);
    } else {
      setInternalAgent(ag);
    }
    setActiveQuestionIndex(0);
  };

  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [lastAnalysis, setLastAnalysis] = useState<any | null>(null);

  // Train selector right on page
  const [pageTrainNo, setPageTrainNo] = useState<string>(selectedTrainNo || '12001');
  const [customInputTrain, setCustomInputTrain] = useState<string>('');

  // Track Topology & Fog Simulation State
  const [trainPosition, setTrainPosition] = useState<number>(24); // 0 to 100%
  const [precedingTrainPos, setPrecedingTrainPos] = useState<number>(68);
  const [switchState, setSwitchState] = useState<'MAIN' | 'LOOP1' | 'LOOP2'>('MAIN');
  const [fogLevel, setFogLevel] = useState<'CLEAR' | 'MODERATE' | 'DENSE'>('CLEAR');
  const [simulationSpeed, setSimulationSpeed] = useState<'NORMAL' | 'FAST' | 'PAUSED'>('NORMAL');

  // Interactive Signal Telemetry & Manual Override State
  const [selectedSignalId, setSelectedSignalId] = useState<string>('S-105');
  const [signalOverrides, setSignalOverrides] = useState<Record<string, 'AUTO' | 'GREEN' | 'DOUBLE_YELLOW' | 'YELLOW' | 'RED'>>({
    'S-101': 'AUTO',
    'S-103': 'AUTO',
    'S-105': 'AUTO',
    'S-107': 'AUTO',
  });

  // Diya (Crew Assistant) Simulation State
  const [diyaDutyElapsed, setDiyaDutyElapsed] = useState<number>(7.4);
  const [diyaNightShift, setDiyaNightShift] = useState<boolean>(false);
  const [diyaCMSCallSlip, setDiyaCMSCallSlip] = useState<string | null>(null);

  // Tripti (Platform Assistant) Simulation State
  const [triptiStation, setTriptiStation] = useState<string>('NDLS');
  const [triptiDwellExtension, setTriptiDwellExtension] = useState<number>(15);
  const [triptiSelectedPlatform, setTriptiSelectedPlatform] = useState<string>('PF 1');

  // Riya (Block Assistant) Simulation State
  const [riyaApproachSpeed, setRiyaApproachSpeed] = useState<number>(110);
  const [riyaGradient, setRiyaGradient] = useState<number>(0); // ‰
  const [riyaAdhesion, setRiyaAdhesion] = useState<'DRY' | 'WET' | 'FOG'>('DRY');
  const [riyaHeadwayDistance, setRiyaHeadwayDistance] = useState<number>(2200);

  // Riya Cascading Delay Propagation & Mitigation State
  const [riyaIncidentDelay, setRiyaIncidentDelay] = useState<number>(30); // 10 to 60 mins on primary train
  const [riyaMitigationStrategy, setRiyaMitigationStrategy] = useState<'LOOP_DIVERT' | 'SPEED_REGULATION' | 'KAVACH_ATP' | 'UNMANAGED_FIFO'>('LOOP_DIVERT');
  const [riyaEnforcedOrders, setRiyaEnforcedOrders] = useState<Record<string, boolean>>({
    '12919': true,
    '12424': true,
    '12138': true,
    '12616': false,
    '22692': true,
    'BOXN-4021': true,
  });
  const [riyaActiveTab, setRiyaActiveTab] = useState<'CASCADING_SUITE' | 'TIME_DISTANCE_GRAPH' | 'EBD_BRAKING'>('CASCADING_SUITE');

  // Riya Cascading Delay Train Model & Real-time Mitigation Logic
  const riyaCascadingData = useMemo(() => {
    const rawTrains = [
      {
        no: '12001',
        name: 'NDLS Bhopal Shatabdi',
        category: 'P1 Premium Shatabdi',
        block: 'Block 3 (Km 5.2)',
        speedKmph: 0,
        distanceBehindKm: 0.0,
        unmanagedRatio: 1.0,
        isOrigin: true,
        rootCause: 'Traction Motor Thermal Warning & OHE Voltage Drop at Km 5.2',
        directives: {
          LOOP_DIVERT: 'Primary incident train. Coast into Emergency Refuge siding at 15 km/h to free Up Main corridor.',
          SPEED_REGULATION: 'Emergency coasting to Station B yard loop; isolate faulty pantograph 2.',
          KAVACH_ATP: 'Kavach target speed override 15 km/h into refuge siding.',
          UNMANAGED_FIFO: 'Stopped dead on Up Main Line. All trailing signals locked at Red (Danger).',
        },
        loopCandidate: false,
      },
      {
        no: '12919',
        name: 'Malwa Express',
        category: 'P2 Superfast Mail/Exp',
        block: 'Block 2 (Km 2.8)',
        speedKmph: 42,
        distanceBehindKm: 2.4,
        unmanagedRatio: 0.86,
        isOrigin: false,
        rootCause: 'Headway Compression behind #12001; S-103 IBS Red Aspect encounter',
        directives: {
          LOOP_DIVERT: 'Divert to Loop Line 1 at Km 3.2. Hold 6 mins to grant Up Main priority to #12424 Rajdhani overtake.',
          SPEED_REGULATION: 'Regulate speed to 40 km/h from Km 1.5; absorb headway spacing without coming to a complete dead halt.',
          KAVACH_ATP: 'Dynamic Kavach distance-to-go curve active; maintain 500m moving block buffer.',
          UNMANAGED_FIFO: 'Dead halt at Red Signal S-103. Engine idling detention: 26 mins + restart brake release penalty.',
        },
        loopCandidate: true,
        mitigatedDelayMap: {
          LOOP_DIVERT: 4,
          SPEED_REGULATION: 9,
          KAVACH_ATP: 6,
          UNMANAGED_FIFO: 26,
        },
      },
      {
        no: '12424',
        name: 'Dibrugarh Rajdhani',
        category: 'P1 Premium Superfast',
        block: 'Block 1 Entry (Km 0.8)',
        speedKmph: 85,
        distanceBehindKm: 4.4,
        unmanagedRatio: 0.73,
        isOrigin: false,
        rootCause: 'Queued Behind #12919; Approaching S-101 Advance Starter Red',
        directives: {
          LOOP_DIVERT: 'Granted priority green corridor over Up Main Line at MPS 130 km/h while Malwa is looped.',
          SPEED_REGULATION: 'Throttle speed to 65 km/h; avoid full emergency pneumatic brake application at S-101.',
          KAVACH_ATP: 'Continuous cabin Movement Authority (MA) extension to Km 5.0 clearance.',
          UNMANAGED_FIFO: 'Detained at S-101 Advance Starter behind Malwa Express. Severe passenger delay penalty.',
        },
        loopCandidate: false,
        mitigatedDelayMap: {
          LOOP_DIVERT: 2,
          SPEED_REGULATION: 6,
          KAVACH_ATP: 3,
          UNMANAGED_FIFO: 22,
        },
      },
      {
        no: '12138',
        name: 'Punjab Mail',
        category: 'P3 Express',
        block: 'Outer Approach (Km -1.8)',
        speedKmph: 52,
        distanceBehindKm: 7.0,
        unmanagedRatio: 0.56,
        isOrigin: false,
        rootCause: 'Bunched at Outer Signal S-99 Approach under Double Yellow aspect',
        directives: {
          LOOP_DIVERT: 'Temporary Speed Restriction (TSR 50 km/h) advisory across outer approach to maintain smooth flow.',
          SPEED_REGULATION: 'Coasting guidance enforced; reduces tractive energy by 22% while absorbing signal delay.',
          KAVACH_ATP: 'Dynamic profile spacing; target arrival at S-101 timed to match green aspect wave.',
          UNMANAGED_FIFO: 'Stop-and-go headway bunching at outer home; 17 mins lost in brake/re-acceleration cycles.',
        },
        loopCandidate: true,
        mitigatedDelayMap: {
          LOOP_DIVERT: 5,
          SPEED_REGULATION: 5,
          KAVACH_ATP: 4,
          UNMANAGED_FIFO: 17,
        },
      },
      {
        no: '12616',
        name: 'Grand Trunk Express',
        category: 'P3 Express',
        block: 'Rear Corridor (Km -4.2)',
        speedKmph: 70,
        distanceBehindKm: 9.4,
        unmanagedRatio: 0.40,
        isOrigin: false,
        rootCause: 'Ripple Reach: Reduced Headway Clearance at Palwal Junction',
        directives: {
          LOOP_DIVERT: 'Hold at Palwal Jn Starter for 2 mins to re-align slot departure with main line corridor clearance.',
          SPEED_REGULATION: 'MPS cap of 90 km/h advised; avoids bunching behind #12138.',
          KAVACH_ATP: 'Speed profile synchronized with corridor headway clearing schedule.',
          UNMANAGED_FIFO: 'Cascading domino ripple reaches Palwal Jn; secondary section entry delayed 12 mins.',
        },
        loopCandidate: true,
        mitigatedDelayMap: {
          LOOP_DIVERT: 2,
          SPEED_REGULATION: 3,
          KAVACH_ATP: 2,
          UNMANAGED_FIFO: 12,
        },
      },
      {
        no: '22692',
        name: 'Bengaluru Rajdhani',
        category: 'P1 Premium Rajdhani',
        block: 'Feeder Trunk (Km -7.5)',
        speedKmph: 115,
        distanceBehindKm: 12.7,
        unmanagedRatio: 0.26,
        isOrigin: false,
        rootCause: 'Corridor Inflow Queuing Risk at Junction Outer',
        directives: {
          LOOP_DIVERT: 'Green wave established. Maintain scheduled 130 km/h MPS. 0 min detention guaranteed.',
          SPEED_REGULATION: 'Nominal 120 km/h cruise; 1 min buffer absorbed before section entry.',
          KAVACH_ATP: 'Full speed movement authority cleared through Section 1 to 4.',
          UNMANAGED_FIFO: 'Junction outer caution aspect causes 8 min deceleration/acceleration ripple.',
        },
        loopCandidate: false,
        mitigatedDelayMap: {
          LOOP_DIVERT: 0,
          SPEED_REGULATION: 1,
          KAVACH_ATP: 0,
          UNMANAGED_FIFO: 8,
        },
      },
      {
        no: 'BOXN-4021',
        name: 'Container Freight Rake',
        category: 'P4 Freight Container',
        block: 'Container Siding (Km -10.0)',
        speedKmph: 0,
        distanceBehindKm: 15.2,
        unmanagedRatio: 0.65,
        isOrigin: false,
        rootCause: 'Heavy Tonnage (4800T) Freight Blockage on Main Trunk',
        directives: {
          LOOP_DIVERT: 'Hold in Container Siding until Rajdhani and Shatabdi platoons clear Section 4.',
          SPEED_REGULATION: 'Regulate speed to 25 km/h on dedicated goods loop.',
          KAVACH_ATP: 'Freight electronic interlock holding at goods departure home.',
          UNMANAGED_FIFO: 'Freight rake spilled onto Up Main Line; complete corridor paralysis for 35+ mins.',
        },
        loopCandidate: true,
        mitigatedDelayMap: {
          LOOP_DIVERT: 12,
          SPEED_REGULATION: 14,
          KAVACH_ATP: 10,
          UNMANAGED_FIFO: 35,
        },
      },
    ];

    const trains = rawTrains.map((t) => {
      const unmanagedDelay = t.isOrigin
        ? riyaIncidentDelay
        : Math.round(riyaIncidentDelay * t.unmanagedRatio);

      const isEnforced = t.isOrigin || !!riyaEnforcedOrders[t.no];

      let theoreticalMitigated = 0;
      if (t.isOrigin) {
        theoreticalMitigated = Math.round(riyaIncidentDelay * 0.7);
      } else if (riyaMitigationStrategy === 'UNMANAGED_FIFO') {
        theoreticalMitigated = unmanagedDelay;
      } else {
        const baseMapVal = t.mitigatedDelayMap ? (t.mitigatedDelayMap as any)[riyaMitigationStrategy] : 0;
        theoreticalMitigated = Math.round((baseMapVal / 30) * riyaIncidentDelay);
      }

      const effectiveDelay = isEnforced ? theoreticalMitigated : unmanagedDelay;
      const delaySaved = Math.max(0, unmanagedDelay - effectiveDelay);

      return {
        ...t,
        unmanagedDelay,
        mitigatedDelay: effectiveDelay,
        delaySaved,
        isEnforced,
        directive: (t.directives as any)[riyaMitigationStrategy] || t.directives.LOOP_DIVERT,
      };
    });

    const totalUnmanaged = trains.reduce((acc, t) => acc + t.unmanagedDelay, 0);
    const totalMitigated = trains.reduce((acc, t) => acc + t.mitigatedDelay, 0);
    const totalSaved = Math.max(0, totalUnmanaged - totalMitigated);
    const unmanagedImpactedCount = trains.filter((t) => !t.isOrigin && t.unmanagedDelay >= 5).length;
    const mitigatedImpactedCount = trains.filter((t) => !t.isOrigin && t.mitigatedDelay >= 5).length;
    const recoveryPct = Math.round((totalSaved / (totalUnmanaged || 1)) * 100);

    return {
      trains,
      totalUnmanaged,
      totalMitigated,
      totalSaved,
      unmanagedImpactedCount,
      mitigatedImpactedCount,
      recoveryPct,
    };
  }, [riyaIncidentDelay, riyaMitigationStrategy, riyaEnforcedOrders]);

  // Smita (Rolling Stock Assistant) Simulation State
  const [smitaLocoType, setSmitaLocoType] = useState<'WAP7' | 'WAP5' | 'WAG9'>('WAP7');
  const [smitaTsrSpeed, setSmitaTsrSpeed] = useState<number>(30);
  const [smitaTsrLengthKm, setSmitaTsrLengthKm] = useState<number>(1.5);

  // Interactive Variable State for active question
  const [var1Val, setVar1Val] = useState<string>('12001');
  const [var2Val, setVar2Val] = useState<string>('MTJ');

  const currentAgent = useMemo(() => {
    return AGENTS.find((a) => a.id === selectedAgent) || AGENTS[0];
  }, [selectedAgent]);

  const currentQuestions = useMemo(() => {
    return PRESET_QUESTIONS[selectedAgent] || PRESET_QUESTIONS.crew;
  }, [selectedAgent]);

  const activeQuestion = useMemo(() => {
    return currentQuestions[activeQuestionIndex] || currentQuestions[0];
  }, [currentQuestions, activeQuestionIndex]);

  // Sync when active question changes
  useEffect(() => {
    if (activeQuestion.var1Options && activeQuestion.var1Options[0]) {
      setVar1Val(activeQuestion.var1Options[0].value);
    }
    if (activeQuestion.var2Options && activeQuestion.var2Options[0]) {
      setVar2Val(activeQuestion.var2Options[0].value);
    }
  }, [activeQuestion]);

  // Handle train change directly on page
  const handleTrainChange = (trainNo: string) => {
    setPageTrainNo(trainNo);
    if (onSelectTrain) {
      onSelectTrain(trainNo);
    }
  };

  // Live Train Motion Simulation Loop
  useEffect(() => {
    if (simulationSpeed === 'PAUSED') return;
    const intervalTime = simulationSpeed === 'FAST' ? 700 : 1300;

    const timer = setInterval(() => {
      // If dense fog, train moves slower
      const speedMultiplier = fogLevel === 'DENSE' ? 0.35 : (fogLevel === 'MODERATE' ? 0.6 : 1.0);
      const step = (simulationSpeed === 'FAST' ? 3.5 : 1.8) * speedMultiplier;

      setTrainPosition((prev) => {
        const next = prev + step;
        return next > 95 ? 5 : next;
      });

      setPrecedingTrainPos((prev) => {
        const next = prev + (simulationSpeed === 'FAST' ? 2.5 : 1.4) * speedMultiplier;
        return next > 96 ? 55 : next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [simulationSpeed, fogLevel]);

  // 4-Aspect Signals - Directly correlated with physical block sections & train positions
  // Block 1: 0% to 25% (Protected by S-101 Advance Starter)
  // Block 2: 25% to 50% (Protected by S-103 Intermediate Block Signal)
  // Block 3: 50% to 75% (Protected by S-105 Home Signal)
  // Block 4: 75% to 100% (Protected by S-107 Starter / Routing Signal)
  const correlatedSignals = useMemo(() => {
    // Determine which block preceding train is occupying
    const pBlock = precedingTrainPos < 25 ? 1 : (precedingTrainPos < 50 ? 2 : (precedingTrainPos < 75 ? 3 : 4));
    // Determine which block target train is occupying
    const tBlock = trainPosition < 25 ? 1 : (trainPosition < 50 ? 2 : (trainPosition < 75 ? 3 : 4));

    // Calculate aspect & telemetry for a signal given its block index (1 to 4)
    const getAspect = (sigId: string, sigBlock: number, kmVal: number) => {
      // Dynamic Proximity Calculation (8.0 km corridor)
      const currentTrainKm = (trainPosition / 100) * 8.0;
      const deltaKm = kmVal - currentTrainKm;
      const deltaMeters = Math.round(deltaKm * 1000);

      // Track Circuit Telemetry
      const tcName = `${sigBlock}0${sigBlock}TC`;
      const isOccupiedByTarget = tBlock === sigBlock;
      const isOccupiedByPreceding = pBlock === sigBlock;
      const isTcOccupied = isOccupiedByTarget || isOccupiedByPreceding;
      const tcVoltage = isTcOccupied ? '0.04V' : '1.85V';

      const approachText =
        deltaMeters > 0
          ? `${deltaMeters}m away`
          : deltaMeters > -400
          ? 'Train in Block'
          : `Passed ${Math.abs(deltaMeters)}m ago`;

      // Check user manual override
      const override = signalOverrides[sigId];
      if (override && override !== 'AUTO') {
        const meaningMap: Record<string, string> = {
          RED: 'Manual Danger (Stop at Mast Enforced)',
          YELLOW: 'Manual Caution (Be prepared to stop at next signal)',
          DOUBLE_YELLOW: 'Manual Attention (Speed restricted to 50 km/h)',
          GREEN: 'Manual Clear (Next 2+ Blocks Unoccupied)',
        };
        const speedMap: Record<string, string> = {
          RED: '0 km/h',
          YELLOW: '30 km/h',
          DOUBLE_YELLOW: '50 km/h',
          GREEN: '130 km/h (MPS)',
        };
        const etaSeconds = deltaMeters > 0 ? Math.round(deltaMeters / (parseFloat(speedMap[override]) > 0 ? parseFloat(speedMap[override]) * 0.28 : 20)) : 0;

        return {
          aspect: override,
          meaning: meaningMap[override] || 'Manual Aspect Active',
          speed: speedMap[override] || 'Restricted',
          isOverridden: true,
          tcName,
          tcVoltage,
          isTcOccupied,
          deltaMeters,
          approachText,
          etaSeconds,
        };
      }

      let aspect: 'GREEN' | 'DOUBLE_YELLOW' | 'YELLOW' | 'RED' = 'GREEN';
      let meaning = 'Clear (Next 2+ Blocks Unoccupied)';
      let speed = '130 km/h (MPS)';

      // If preceding train is in this block, signal is RED (Danger)
      if (pBlock === sigBlock) {
        aspect = 'RED';
        meaning = 'Danger (Stop at Mast)';
        speed = '0 km/h';
      } else if (pBlock === sigBlock + 1) {
        aspect = 'YELLOW';
        meaning = 'Caution (Be prepared to stop at next signal)';
        speed = '30 km/h';
      } else if (pBlock === sigBlock + 2) {
        aspect = 'DOUBLE_YELLOW';
        meaning = 'Attention (Pass at restricted speed)';
        speed = '50 km/h';
      } else if (sigBlock === 4 && switchState === 'LOOP1') {
        aspect = 'DOUBLE_YELLOW';
        meaning = 'Turnout Divert to Loop 1 (1-in-12 Points)';
        speed = '50 km/h';
      } else if (sigBlock === 4 && switchState === 'LOOP2') {
        aspect = 'YELLOW';
        meaning = 'Turnout Divert to Loop 2 (1-in-8.5 Points)';
        speed = '30 km/h';
      }

      const etaSeconds = deltaMeters > 0 ? Math.round(deltaMeters / (parseFloat(speed) > 0 ? parseFloat(speed) * 0.28 : 20)) : 0;

      return {
        aspect,
        meaning,
        speed,
        isOverridden: false,
        tcName,
        tcVoltage,
        isTcOccupied,
        deltaMeters,
        approachText,
        etaSeconds,
      };
    };

    const s101 = getAspect('S-101', 1, 0.0);
    const s103 = getAspect('S-103', 2, 2.5);
    const s105 = getAspect('S-105', 3, 5.2);
    const s107 = getAspect('S-107', 4, 7.8);

    return [
      { id: 'S-101', name: 'Advance Starter', km: '0.0 km', kmVal: 0.0, blockRange: 'Block 1 (0-25%)', ...s101, xPercent: 12 },
      { id: 'S-103', name: 'Intermediate Block (IBS)', km: '2.5 km', kmVal: 2.5, blockRange: 'Block 2 (25-50%)', ...s103, xPercent: 36 },
      { id: 'S-105', name: 'Home Signal (Approach)', km: '5.2 km', kmVal: 5.2, blockRange: 'Block 3 (50-75%)', ...s105, xPercent: 62 },
      { id: 'S-107', name: 'Turnout / Starter', km: '7.8 km', kmVal: 7.8, blockRange: 'Block 4 (75-100%)', ...s107, xPercent: 86 },
    ];
  }, [trainPosition, precedingTrainPos, switchState, signalOverrides]);

  // Compute collision / overlap risk
  const overlapConflict = useMemo(() => {
    const headway = precedingTrainPos - trainPosition;
    if (headway <= 0) {
      return {
        level: 'COLLISION_AVERTED',
        text: 'EMERGENCY BRAKING ACTIVATED (AUTOMATIC SAFETY INTERLOCK ENFORCED)',
        color: 'bg-rose-600 text-white border-rose-700',
      };
    }
    if (headway < 15 && switchState === 'MAIN') {
      return {
        level: 'DANGER',
        text: `CRITICAL HEADWAY COMPRESSION: Only ${headway.toFixed(1)}% spacing! Divert to Loop 1 recommended.`,
        color: 'bg-rose-100 border-rose-400 text-rose-950 font-bold',
      };
    }
    if (fogLevel === 'DENSE') {
      return {
        level: 'FOG_ACTIVE',
        text: 'SEVERE FOG ALERT: Visibility <50m. FOG-PASS Device active. Audio detonator placed 270m before S-105.',
        color: 'bg-amber-100 border-amber-400 text-amber-950 font-bold',
      };
    }
    if (headway < 28) {
      return {
        level: 'CAUTION',
        text: `APPROACH CAUTION: Headway spacing ${headway.toFixed(1)}%. Double Yellow aspect enforced.`,
        color: 'bg-amber-100 border-amber-400 text-amber-950 font-bold',
      };
    }
    return {
      level: 'CLEAR',
      text: `TRACK BLOCK CLEAR: Nominal Headway ${headway.toFixed(1)}% (>4.2 km buffer). 130 km/h MPS clear.`,
      color: 'bg-emerald-100 border-emerald-400 text-emerald-950 font-bold',
    };
  }, [trainPosition, precedingTrainPos, switchState, fogLevel]);

  // Generate self-contained AI Agent Reasoning from Database & Operational Logic
  const handleExecuteAnalysis = () => {
    setIsSynthesizing(true);

    setTimeout(() => {
      let result: any = null;

      if (selectedAgent === 'crew') {
        const train = var1Val;
        const lobby = var2Val;
        const isBreached = var2Val === '10.5' || activeQuestionIndex === 0;

        result = {
          agent: currentAgent,
          verdict: isBreached ? 'SCHEDULE RELIEF CREW AT ONCE' : 'AUTHORIZED TO CONTINUE (ROSTER VALID)',
          verdictClass: isBreached ? 'bg-rose-700 text-white' : 'bg-emerald-700 text-white',
          netDelayImpactMins: isBreached ? 45.0 : 0.0,
          primaryMetricTitle: 'Statutory HOER Clock',
          primaryMetricValue: isBreached ? '10h 32m (BREACHED)' : '7h 14m (VALID)',
          primaryMetricSub: 'Section 130 Railway Act (10h Max)',
          secondaryMetricTitle: 'Relief Lobby Station',
          secondaryMetricValue: `${lobby} Lobby`,
          secondaryMetricSub: '3 Standby Loco Crews Available',
          trailingDominoImpact: isBreached ? '+32.4 mins cascading ripple to 3 trailing trains' : '0.0 min ripple on main line corridor',
          chainOfThought: [
            `Diya audited Train #${train} locomotive crew against Section 130 of the Railway Act (HOER compliance).`,
            isBreached
              ? `Continuous driving duty has breached the 10.0-hour statutory limit. Loco Pilot cannot legally operate past ${lobby} without mandatory 8-hour rest.`
              : `Continuous driving duty is currently 7h 14m. Locomotive crew has 2h 46m remaining headroom before reaching cautionary 10-hour ceiling.`,
            `Relief crew roster at ${lobby} confirmed: 3 qualified WAP-7 3-Phase AC electric crews available on immediate call.`,
            isBreached
              ? `Calculated crew relief swap penalty: +45.0 minutes handover buffer + brake continuity test (BPC re-endorsement).`
              : `Authorized to proceed through ${lobby} at MPS. No deadheading crew replacement necessary.`,
          ],
          recommendedDirectives: [
            isBreached ? `Issue urgent telegraphic memo to Sr. DEE (TRS) ${lobby} for immediate platform crew relief.` : `Maintain planned schedule; next mandatory crew relief point will be secondary division junction.`,
            isBreached ? `Hold Train #${train} at Platform 2 of ${lobby} to prevent blocking High-Speed Up Main Line.` : `Notify Section Controller to retain Green aspect on S-105 through ${lobby}.`,
            `Verify onboard crew vigilance control (VCD) timer verification status.`,
          ],
          databaseCrossReference: `WIN.db table 'CrewLobbyRoster' & 'CrewDutyCases' #4401`,
        };
      } else if (selectedAgent === 'platform') {
        const station = var1Val;
        const detention = Number(var2Val) || 30;

        result = {
          agent: currentAgent,
          verdict: detention >= 30 ? 'EVICT RAKE TO COACHING YARD' : 'ABSORB IN TERMINAL DWELL BUFFER',
          verdictClass: detention >= 30 ? 'bg-amber-600 text-white' : 'bg-emerald-700 text-white',
          netDelayImpactMins: detention >= 30 ? 15.0 : 0.0,
          primaryMetricTitle: 'Terminal Platform Dwell',
          primaryMetricValue: `+${detention}.0 mins`,
          primaryMetricSub: `${station} Station Master Console`,
          secondaryMetricTitle: 'Outer Holding Risk',
          secondaryMetricValue: detention >= 30 ? 'CRITICAL (DPL Triggered)' : 'NOMINAL (Buffer Absorbed)',
          secondaryMetricSub: 'Terminal Platform Holding Delay',
          trailingDominoImpact: detention >= 30 ? '+28.0 mins cumulative ripple across outer signals' : '0.0 min outer detention',
          chainOfThought: [
            `Tripti assessed terminal platform turn-around occupancy at ${station} for duration +${detention} mins.`,
            `Under standard CRIS yard guidelines, nominal platform turn-around buffer is 20.0 minutes for watering, cleaning & safety inspection.`,
            detention >= 30
              ? `Detention of +${detention} mins causes terminal platform lock. Trailing inbound premium trains will incur +15.0 min outer holding penalty (DPL).`
              : `Detention of +${detention} mins is fully absorbed within the nominal 20-min buffer with zero outer holding penalty.`,
            detention >= 30
              ? `Switching rake to Yard Line Y-3 via Shunting Loco SH-04 to free up Main Platform 1 for incoming Shatabdi.`
              : `Retaining rake on Platform 1; scheduled departure within allowable slack window.`,
          ],
          recommendedDirectives: [
            detention >= 30 ? `Issue immediate shunt order to Yardmaster ${station} to clear Platform 1 within 8 minutes.` : `Authorize standard platform turnaround; no shunt required.`,
            `Inform Passenger Information System (PIS) regarding platform re-assignment to minimize concourse crowding.`,
            `Clear outer home signal S-105 for incoming trailing service upon clearance verification.`,
          ],
          databaseCrossReference: `WIN.db table 'TerminalPlatforms' & 'StateBorderDivision.csv' Station #${station}`,
        };
      } else if (selectedAgent === 'tracks') {
        const preceding = var1Val;
        const fog = var2Val;
        const isConflict = preceding.includes('Severe') || fog === 'DENSE_FOG';

        result = {
          agent: currentAgent,
          verdict: isConflict ? 'ENFORCE FOG SAFETY & DIVERT TO LOOP 1' : 'MAINTAIN UP MAIN MPS CLEARANCE',
          verdictClass: isConflict ? 'bg-rose-700 text-white' : 'bg-emerald-700 text-white',
          netDelayImpactMins: isConflict ? (fog === 'DENSE_FOG' ? 35.0 : 25.0) : 0.0,
          primaryMetricTitle: 'Braking Curve Overlap',
          primaryMetricValue: fog === 'DENSE_FOG' ? '30 km/h (FOG CAPPED)' : (isConflict ? '60m (RESTRICTED)' : '180m (FULL SAFETY)'),
          primaryMetricSub: 'Automatic 4-Aspect Interlocking',
          secondaryMetricTitle: 'Headway Margin',
          secondaryMetricValue: isConflict ? '3.2 mins (CRITICAL)' : '11.8 mins (NOMINAL)',
          secondaryMetricSub: 'Section Block Headway',
          trailingDominoImpact: isConflict ? '+42.5 mins knock-on headway delay transmitted' : '0.0 min headway drag',
          chainOfThought: [
            `Riya audited track section occupancy under condition: ${preceding} with ${fog}.`,
            fog === 'DENSE_FOG'
              ? `Dense fog reduces signal sighting distance below 50m. FOG-PASS GPS device activated in loco cab. Speed capped at 30 km/h.`
              : `Signal sighting is adequate. Emergency braking distance (EBD) for 130 km/h is 1,120 meters with 180m safety overlap.`,
            isConflict
              ? `Preceding train delay causes severe headway compression. Maintaining Main Line will trip Automatic Train Protection (ATP) emergency brakes.`
              : `Block spacing is adequate (>4.2 km). 4-Aspect signals S-101 and S-103 retain Green aspect.`,
            isConflict
              ? `Actuating Scissor Crossover switch to position REVERSE (Loop Line 1, 50 km/h turnout). This frees the Up Main line for following high-priority traffic.`
              : `Switch retains NORMAL lock on Up Main Line. No interlocking route change necessary.`,
          ],
          recommendedDirectives: [
            fog === 'DENSE_FOG' ? `Place audio detonating fog signals on rails 270m in advance of first stop signal S-105.` : `Confirm normal route locking on Up Main Line through Track Circuit 101TC.`,
            isConflict ? `Throw Scissor Crossover points 14A/14B to Reverse and verify track circuit 14TC drop.` : `Confirm route locking on Up Main Line.`,
            `Signal S-107 set to Double Yellow with turnout route indicator active.`,
          ],
          databaseCrossReference: `WIN.db table 'CorridorSegments' & PnC Rule Matrix (D_headway & Fog Safety)`,
        };
      } else {
        // Resource / Smita
        const tsr = var1Val;
        const engine = var2Val;
        const isTsr = tsr !== 'None';
        const isFail = engine !== 'Nominal';

        result = {
          agent: currentAgent,
          verdict: (isTsr || isFail) ? 'MAXIMIZE MPS TIME RECOVERY (-20m)' : 'NOMINAL ENERGY & TRACTION CLEARANCE',
          verdictClass: (isTsr || isFail) ? 'bg-amber-600 text-white' : 'bg-emerald-700 text-white',
          netDelayImpactMins: isTsr ? (tsr === 'Major' ? 24.0 : 10.0) : (isFail ? 12.5 : 0.0),
          primaryMetricTitle: 'Tractive Effort Rating',
          primaryMetricValue: isFail ? '4,500 HP (-25% Snag)' : '6,000 HP (WAP-7 NOMINAL)',
          primaryMetricSub: 'Chittaranjan Locomotive Works Spec',
          secondaryMetricTitle: 'Speedup Slack Recovery',
          secondaryMetricValue: '-20.0 mins Max',
          secondaryMetricSub: 'Extra Time Allotted (EA) Buffer',
          trailingDominoImpact: (isTsr || isFail) ? 'Net +4.0 mins after applying -20.0m speedup recovery' : '0.0 min friction drag',
          chainOfThought: [
            `Smita audited 3-Phase electric locomotive traction state: ${engine} with ${tsr} TSR restriction.`,
            `Nominal WAP-7 delivers 6,000 HP (460 kN starting tractive effort) operating under 25 kV AC 50 Hz OHE overhead catenary.`,
            isTsr
              ? `TSR caution order forces speed reduction to 30 km/h, adding +${tsr === 'Major' ? '24.0' : '10.0'} mins section run time.`
              : `Track section clear of TSR caution orders. MPS 130 km/h authorized.`,
            `T1 Premium allocation permits up to -20.0 minutes of speed recovery (cover-up slack) by running at maximum permissible speed on downhill gradients.`,
            `Net operational delay after applying regenerative braking & speedup buffer: ${Math.max(0, (isTsr ? (tsr === 'Major' ? 24 : 10) : 0) - 20)} mins.`,
          ],
          recommendedDirectives: [
            isTsr ? `Authorize driver to engage notch 32 for rapid post-TSR acceleration curve.` : `Maintain scheduled cruise notch 24 to optimize energy consumption.`,
            `Verify OHE catenary voltage stability at substation feeding post (minimum 21.5 kV).`,
            `Ensure regenerative braking feedback is logged to locomotive energy meter.`,
          ],
          databaseCrossReference: `WIN.db table 'LocoTractionRatings' & 'TSRCautionLog' Corridor NDLS-AGC`,
        };
      }

      setLastAnalysis(result);
      setIsSynthesizing(false);
    }, 450);
  };

  // Run initial synthesis on mount
  useEffect(() => {
    handleExecuteAnalysis();
  }, [selectedAgent, activeQuestionIndex, pageTrainNo]);

  return (
    <div className="space-y-6 pb-12">
      {/* ------------------------------------------------------------- */}
      {/* ------------------------------------------------------------- */}
      {/* Top Banner Header: FIXED HIGH CONTRAST (Rich Blue Background) */}
      {/* ------------------------------------------------------------- */}
      <div className="rounded-xl p-5 sm:p-6 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white shadow-lg border border-blue-500/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-60 h-60 bg-irctc-orange/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-irctc-orange text-white shadow-md font-black">
                <Bot className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-sm">
                DTRS AI Dispatch Operations Center
              </h1>
              {/* <span className="bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                Self-Answered • Zero API Keys
              </span> */}
            </div>
            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed font-normal">
              Cognitive decision workspace powered by 4 specialized AI Agents.
            </p>
          </div>

          {/* Interactive Train Selector ON THIS PAGE ITSELF */}
          <div className="bg-blue-950/80 px-3.5 py-2.5 rounded-xl border border-blue-400/30 shadow-md backdrop-blur-xs flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-blue-200 shrink-0">
              <Train className="w-3.5 h-3.5 text-irctc-orange" />
              <span className="hidden xl:inline">Select Train on Assistant Page</span>
              <span className="xl:hidden">Select Train</span>
            </div>

            <select
              value={pageTrainNo}
              onChange={(e) => handleTrainChange(e.target.value)}
              className="bg-blue-900/90 text-white font-bold text-xs py-2 px-3 rounded-lg border border-blue-400/40 focus:outline-none focus:border-irctc-orange cursor-pointer shrink-0 min-w-[390px] sm:min-w-[430px]"
            >
              {PRESET_TRAIN_LIST.map((t) => (
                <option key={t.no} value={t.no} className="bg-slate-900 text-white">
                  {t.no} • {t.name}
                </option>
              ))}
            </select>

            {/* Custom train input */}
            <div className="flex items-center gap-1.5 shrink-0">
              <input
                type="text"
                placeholder="Or enter train no (e.g. 12424)"
                value={customInputTrain}
                onChange={(e) => setCustomInputTrain(e.target.value)}
                className="w-56 sm:w-64 bg-blue-900/90 text-white text-xs px-3 py-2 rounded-lg border border-blue-400/40 focus:outline-none focus:border-irctc-orange placeholder:text-blue-200/50 font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  if (customInputTrain.trim()) {
                    handleTrainChange(customInputTrain.trim());
                    setCustomInputTrain('');
                  }
                }}
                className="bg-irctc-orange hover:bg-orange-600 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-all shrink-0 cursor-pointer shadow-xs"
              >
                Load
              </button>
            </div>

            <span className="font-mono text-amber-400 font-black text-xs px-2 py-0.5 rounded bg-blue-900/80 border border-amber-400/30 shrink-0">
              {pageTrainNo}
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 1: SPECIALIZED EXPANDED WORKSPACE FOR EACH AI AGENT   */}
      {/* (D: Crew Fatigue, T: Platform Gantt, R: Braking EBD, S: Track) */}
      {/* ------------------------------------------------------------- */}

      {/* 1. AGENT DIYA (D) - CREW ASSISTANT EXPANDED WORKSPACE */}
      {selectedAgent === 'crew' && (
        <div className="rounded-xl p-5 bg-white shadow-sm border border-slate-200 border-l-4 border-l-amber-500 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white font-black flex items-center justify-center text-sm shadow-xs">
                D
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-slate-900">
                  Agent Diya &bull; Crew Assistant: HOER 10h Statutory Duty &amp; Fatigue Console
                </h2>
                <p className="text-xs text-slate-600 font-medium">
                  Continuous Driving Limit &bull; Driver Reaction Latency Curve &bull; Standby Corridor Crew Lobby CMS
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-full">
                IR HOER Rules 2005 &bull; Rule 8
              </span>
            </div>
          </div>

          {/* Quick Controls Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
            <div>
              <div className="flex justify-between items-center mb-1.5 font-bold text-slate-800">
                <span>Continuous Driving Elapsed:</span>
                <span className="font-mono text-amber-900 font-black bg-amber-100 px-2.5 py-0.5 rounded border border-amber-300">
                  {Math.floor(diyaDutyElapsed)}h {Math.round((diyaDutyElapsed % 1) * 60)}m / 10h Max
                </span>
              </div>
              <input
                type="range"
                min="4.0"
                max="11.5"
                step="0.25"
                value={diyaDutyElapsed}
                onChange={(e) => setDiyaDutyElapsed(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>4h Start</span>
                <span className="text-amber-700 font-bold">8h Warning</span>
                <span className="text-rose-700 font-bold">10h Statutory Ceiling</span>
                <span>11.5h Breach</span>
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-800 block mb-1.5">Shift Duty Period:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDiyaNightShift(false)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    !diyaNightShift
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Day (06:00 - 22:00)
                </button>
                <button
                  type="button"
                  onClick={() => setDiyaNightShift(true)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    diyaNightShift
                      ? 'bg-slate-900 text-amber-300 border-slate-950 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Night (+35% Fatigue)
                </button>
              </div>
              <span className="text-[10px] text-slate-500 font-medium block mt-1.5">
                {diyaNightShift ? 'Circadian low (02:00-06:00) increases driver latency by 35%.' : 'Nominal daylight alertness profile.'}
              </span>
            </div>

            <div className="sm:col-span-2 lg:col-span-1 flex flex-col justify-between">
              <span className="font-bold text-slate-800 block mb-1">Crew Lobby CMS Authorization:</span>
              <button
                type="button"
                onClick={() => setDiyaCMSCallSlip(`CMS-RELIEF-${Math.floor(1000 + Math.random() * 9000)}-MTJ`)}
                className="w-full text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-3 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Issue CMS Relief Call Slip</span>
              </button>
              {diyaCMSCallSlip && (
                <span className="text-[10px] font-mono text-emerald-700 font-bold mt-1 truncate">
                  Active Token: {diyaCMSCallSlip}
                </span>
              )}
            </div>
          </div>

          {/* Expanded Dynamic Fatigue Curve Canvas */}
          <div className="relative w-full h-[320px] bg-[#070c19] rounded-xl p-4 border border-slate-800 overflow-hidden shadow-2xl font-mono select-none">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="font-bold uppercase tracking-wider text-amber-400 text-[11px] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                Dynamic Fatigue Risk Index &amp; Driver Reaction Latency Curve
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                Continuous Duty: {diyaDutyElapsed.toFixed(2)}h
              </span>
            </div>

            <svg viewBox="0 0 950 210" className="w-full h-full overflow-visible">
              <defs>
                <pattern id="diyaGrid" width="25" height="25" patternUnits="userSpaceOnUse">
                  <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.5" />
                </pattern>
              </defs>
              <rect width="950" height="180" fill="url(#diyaGrid)" />

              {/* Background Risk Zones */}
              <rect x="0" y="10" width="660" height="160" fill="rgba(16, 185, 129, 0.08)" />
              <rect x="660" y="10" width="166" height="160" fill="rgba(245, 158, 11, 0.12)" />
              <rect x="826" y="10" width="124" height="160" fill="rgba(239, 68, 68, 0.22)" />

              {/* Zone Separation Dotted Lines */}
              <line x1="660" y1="10" x2="660" y2="175" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="826" y1="0" x2="826" y2="175" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 3" />

              {/* Zone Title Labels */}
              <text x="330" y="24" textAnchor="middle" fill="#6ee7b7" fontSize="9" fontWeight="bold">ZONE 1: NORMAL OPERATING BUFFER (&lt;8h)</text>
              <text x="743" y="24" textAnchor="middle" fill="#fde68a" fontSize="8" fontWeight="bold">ZONE 2: HOER WARNING (8-10h)</text>
              <text x="888" y="24" textAnchor="middle" fill="#fca5a5" fontSize="8" fontWeight="bold">STATUTORY BREACH (&gt;10h)</text>

              {/* Grid Horizontal Guidelines */}
              <line x1="0" y1="170" x2="950" y2="170" stroke="#334155" strokeWidth="1" />
              <line x1="0" y1="120" x2="950" y2="120" stroke="#1e293b" strokeDasharray="3 3" />
              <line x1="0" y1="70" x2="950" y2="70" stroke="#1e293b" strokeDasharray="3 3" />

              {/* 10h Ceiling Badge */}
              <g transform="translate(790, 34)">
                <rect width="72" height="16" rx="3" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1" />
                <text x="36" y="12" textAnchor="middle" fill="#fecaca" fontSize="7.5" fontWeight="bold">10H CEILING</text>
              </g>

              {/* Fatigue Curve Polyline */}
              {(() => {
                const shiftMult = diyaNightShift ? 1.25 : 1.0;
                const pts = [
                  { h: 0, f: 12 },
                  { h: 2, f: 16 },
                  { h: 4, f: 22 },
                  { h: 6, f: 33 * shiftMult },
                  { h: 7, f: 44 * shiftMult },
                  { h: 8, f: 58 * shiftMult },
                  { h: 9, f: 74 * shiftMult },
                  { h: 10, f: 88 * shiftMult },
                  { h: 11, f: 98 * shiftMult },
                  { h: 11.5, f: 100 },
                ];
                const polylineStr = pts.map(p => {
                  const x = (p.h / 11.5) * 950;
                  const y = 170 - (Math.min(100, p.f) / 100) * 140;
                  return `${x},${y}`;
                }).join(' ');

                const curX = (diyaDutyElapsed / 11.5) * 950;
                const curFatigue = Math.min(100, Math.round((15 + Math.pow(diyaDutyElapsed / 10, 2.8) * 75 * (diyaNightShift ? 1.25 : 1.0))));
                const curY = 170 - (curFatigue / 100) * 140;
                const curLag = Math.round(220 + Math.pow(diyaDutyElapsed / 10, 2.2) * 360 * (diyaNightShift ? 1.2 : 1.0));

                return (
                  <>
                    <polyline
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="3"
                      points={polylineStr}
                    />
                    {/* Operating Point Marker */}
                    <circle cx={curX} cy={curY} r="6" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" className="animate-pulse" />
                    <g transform={`translate(${Math.min(740, Math.max(10, curX - 90))}, ${Math.max(38, curY - 26)})`}>
                      <rect width="180" height="20" rx="3" fill="#0b1329" stroke="#f59e0b" strokeWidth="1" />
                      <text x="90" y="14" textAnchor="middle" fill="#fde68a" fontSize="8.5" fontWeight="bold">
                        {curFatigue}% Risk | {curLag}ms Lag | Crew #{pageTrainNo}
                      </text>
                    </g>
                  </>
                );
              })()}

              {/* X Axis Labels */}
              <text x="5" y="188" fill="#94a3b8" fontSize="9">0h Duty</text>
              <text x="320" y="188" fill="#94a3b8" fontSize="9">4h Continuous</text>
              <text x="650" y="188" fill="#f59e0b" fontSize="9" fontWeight="bold">8h Roster Alert</text>
              <text x="815" y="188" fill="#ef4444" fontSize="9" fontWeight="bold">10h Statutory Max</text>
              <text x="915" y="188" fill="#94a3b8" fontSize="9">11.5h Breach</text>
            </svg>

            {/* Bottom HUD */}
            <div className="absolute bottom-2 left-4 right-4 flex flex-wrap items-center justify-between text-xs text-slate-300 bg-slate-900/95 px-3 py-1.5 rounded-lg border border-slate-700 backdrop-blur-md">
              <span className="flex items-center gap-2 text-amber-300 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                VCD Cycle: 54s / 60s Vigilance Verified &bull; HRV Bio-Telemetry: 72 bpm
              </span>
              <span className="font-mono text-slate-300 text-[11px]">
                Driver Reaction Lag: {Math.round(220 + Math.pow(diyaDutyElapsed / 10, 2.2) * 360 * (diyaNightShift ? 1.2 : 1.0))}ms &bull; Legal Compliance: {diyaDutyElapsed > 10 ? 'HOER VIOLATION' : (diyaDutyElapsed > 8 ? 'HOER WARNING' : 'HOER COMPLIANT')}
              </span>
            </div>
          </div>

          {/* Corridor Standby Matrix & Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Statutory Headroom</span>
              <span className={`font-mono text-base font-black mt-0.5 block ${diyaDutyElapsed > 10 ? 'text-rose-700' : (diyaDutyElapsed > 8 ? 'text-amber-700' : 'text-emerald-700')}`}>
                {diyaDutyElapsed > 10 ? `EXCEEDED (-${Math.round((diyaDutyElapsed - 10) * 60)}m)` : `${Math.floor(10 - diyaDutyElapsed)}h ${Math.round(((10 - diyaDutyElapsed) % 1) * 60)}m Left`}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {diyaDutyElapsed > 10 ? 'Section relief mandatory at next stop' : 'Safe buffer before mandatory relief'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Driver Reaction Lag</span>
              <span className="font-mono text-base font-black text-irctc-blue mt-0.5 block">
                {Math.round(220 + Math.pow(diyaDutyElapsed / 10, 2.2) * 360 * (diyaNightShift ? 1.2 : 1.0))} ms
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                Baseline: 220ms (+{Math.round(Math.pow(diyaDutyElapsed / 10, 2.2) * 360 * (diyaNightShift ? 1.2 : 1.0))}ms latency drag)
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">CMS Corridor Lobby Availability</span>
              <span className="font-mono text-base font-black text-emerald-700 mt-0.5 block">
                4 LP &bull; 3 ALP Ready
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                Mathura (MTJ) Lobby: 12 min call-out buffer
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. AGENT TRIPTI (T) - PLATFORM ASSISTANT EXPANDED WORKSPACE */}
      {selectedAgent === 'platform' && (
        <div className="rounded-xl p-5 bg-white shadow-sm border border-slate-200 border-l-4 border-l-sky-500 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
                T
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-slate-900">
                  Agent Tripti &bull; Platform Assistant: Terminal Occupancy Gantt &amp; Concourse Console
                </h2>
                <p className="text-xs text-slate-600 font-medium">
                  Live Platform Berth Gantt (PF 1-6) &bull; Inbound Outer Signal Holding Radar &bull; Yard Turnaround Cycle
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold bg-sky-100 text-sky-900 border border-sky-300 px-2.5 py-1 rounded-full">
                SWR Station Operating Rules
              </span>
            </div>
          </div>

          {/* Quick Controls Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="font-bold text-slate-800 block mb-1.5">Terminal Junction Station:</span>
              <select
                value={triptiStation}
                onChange={(e) => setTriptiStation(e.target.value)}
                className="w-full bg-white text-slate-900 font-bold py-1.5 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-irctc-blue shadow-2xs"
              >
                <option value="NDLS">New Delhi (NDLS) &bull; 16 Platforms</option>
                <option value="CNB">Kanpur Central (CNB) &bull; 10 Platforms</option>
                <option value="BPL">Bhopal Jn (BPL) &bull; 6 Platforms</option>
                <option value="CSMT">Mumbai CSMT &bull; 18 Platforms</option>
                <option value="HWH">Howrah Jn (HWH) &bull; 23 Platforms</option>
              </select>
              <span className="text-[10px] text-slate-500 font-medium block mt-1">
                Interlocked route-relay interlocking (RRI) active
              </span>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5 font-bold text-slate-800">
                <span>Simulated Dwell Extension:</span>
                <span className="font-mono text-sky-900 font-black bg-sky-100 px-2 py-0.5 rounded border border-sky-300">
                  +{triptiDwellExtension} mins
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="45"
                step="5"
                value={triptiDwellExtension}
                onChange={(e) => setTriptiDwellExtension(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>0m (On Time)</span>
                <span className="text-amber-700 font-bold">+15m Buffer Risk</span>
                <span className="text-rose-700 font-bold">+30m Outer Lock</span>
                <span>+45m Gridlock</span>
              </div>
            </div>

            <div className="sm:col-span-2 lg:col-span-1 flex flex-col justify-between">
              <span className="font-bold text-slate-800 block mb-1">Berth Allocation Strategy:</span>
              <button
                type="button"
                onClick={() => setTriptiDwellExtension(0)}
                className="w-full text-xs bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-3 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Reset Dwell to Timetable Schedule</span>
              </button>
              <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                Target Berth: PF 1 (24-Coach Coping)
              </span>
            </div>
          </div>

          {/* Expanded Dynamic Platform Gantt Canvas */}
          <div className="relative w-full h-[340px] bg-[#070c19] rounded-xl p-4 border border-slate-800 overflow-hidden shadow-2xl font-mono select-none">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="font-bold uppercase tracking-wider text-sky-400 text-[11px] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                Terminal Platform Occupancy Gantt &bull; Live Station Throat Radar
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                Station: {triptiStation} &bull; Time Horizon: 120 Mins
              </span>
            </div>

            <svg viewBox="0 0 950 220" className="w-full h-full overflow-visible">
              <defs>
                <pattern id="triptiGrid" width="25" height="25" patternUnits="userSpaceOnUse">
                  <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
                </pattern>
              </defs>
              <rect width="950" height="200" fill="url(#triptiGrid)" />

              {/* Time Horizon Guidelines */}
              <line x1="160" y1="10" x2="160" y2="190" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="380" y1="10" x2="380" y2="190" stroke="#38bdf8" strokeWidth="1.5" />
              <line x1="600" y1="10" x2="600" y2="190" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="820" y1="10" x2="820" y2="190" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />

              {/* Time Headers */}
              <text x="160" y="20" textAnchor="middle" fill="#64748b" fontSize="8.5">T - 30 MINS</text>
              <text x="380" y="20" textAnchor="middle" fill="#38bdf8" fontSize="8.5" fontWeight="bold">CURRENT TIME (T-0)</text>
              <text x="600" y="20" textAnchor="middle" fill="#64748b" fontSize="8.5">T + 30 MINS</text>
              <text x="820" y="20" textAnchor="middle" fill="#64748b" fontSize="8.5">T + 60 MINS</text>

              {/* PLATFORM 1: Target Train */}
              <g transform="translate(10, 36)">
                <rect width="70" height="22" rx="3" fill="#0b1329" stroke="#38bdf8" strokeWidth="1" />
                <text x="35" y="15" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold">PF 1</text>
                {/* Platform Concourse Coping */}
                <rect x="80" y="1" width="850" height="20" rx="3" fill="#0f172a" stroke="#1e293b" />
                {/* Train block */}
                <rect x="180" y="3" width={200 + triptiDwellExtension * 6} height="16" rx="3" fill={triptiDwellExtension > 20 ? '#991b1b' : (triptiDwellExtension > 10 ? '#854d0e' : '#1d4ed8')} stroke={triptiDwellExtension > 20 ? '#f87171' : '#60a5fa'} strokeWidth="1.5" />
                <text x="190" y="14" fill="#ffffff" fontSize="8.5" fontWeight="bold">#{pageTrainNo} Berth ({25 + triptiDwellExtension}m Dwell)</text>
                {triptiDwellExtension > 10 && (
                  <g transform={`translate(${390 + triptiDwellExtension * 6}, 2)`}>
                    <rect width="90" height="18" rx="2" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1" />
                    <text x="45" y="12" textAnchor="middle" fill="#fecaca" fontSize="7" fontWeight="bold">OUTER LOCK</text>
                  </g>
                )}
              </g>

              {/* PLATFORM 2: Train #12002 */}
              <g transform="translate(10, 68)">
                <rect width="70" height="22" rx="3" fill="#0b1329" stroke="#94a3b8" strokeWidth="1" />
                <text x="35" y="15" textAnchor="middle" fill="#e2e8f0" fontSize="9" fontWeight="bold">PF 2</text>
                <rect x="80" y="1" width="850" height="20" rx="3" fill="#0f172a" stroke="#1e293b" />
                <rect x="260" y="3" width="220" height="16" rx="3" fill="#0f766e" stroke="#2dd4bf" strokeWidth="1.5" />
                <text x="270" y="14" fill="#ffffff" fontSize="8.5" fontWeight="bold">#12002 Shatabdi Exp &bull; Boarding Complete</text>
              </g>

              {/* PLATFORM 3: EMU Suburban Local */}
              <g transform="translate(10, 100)">
                <rect width="70" height="22" rx="3" fill="#0b1329" stroke="#94a3b8" strokeWidth="1" />
                <text x="35" y="15" textAnchor="middle" fill="#e2e8f0" fontSize="9" fontWeight="bold">PF 3</text>
                <rect x="80" y="1" width="850" height="20" rx="3" fill="#0f172a" stroke="#1e293b" />
                <rect x="120" y="3" width="180" height="16" rx="3" fill="#4c1d95" stroke="#a78bfa" strokeWidth="1.5" />
                <text x="130" y="14" fill="#ffffff" fontSize="8.5" fontWeight="bold">#EMU-6401 Suburban &bull; Turnaround Inbound</text>
              </g>

              {/* PLATFORM 4: Line Clear Available */}
              <g transform="translate(10, 132)">
                <rect width="70" height="22" rx="3" fill="#0b1329" stroke="#10b981" strokeWidth="1" />
                <text x="35" y="15" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="bold">PF 4</text>
                <rect x="80" y="1" width="850" height="20" rx="3" fill="#064e3b" fillOpacity="0.2" stroke="#10b981" strokeWidth="1" strokeDasharray="4 3" />
                <text x="500" y="14" textAnchor="middle" fill="#34d399" fontSize="8" fontWeight="bold">LINE CLEAR &bull; AVAILABLE FOR INBOUND DIVERSION</text>
              </g>

              {/* PLATFORM 5: Stabled Freight BOXN */}
              <g transform="translate(10, 164)">
                <rect width="70" height="22" rx="3" fill="#0b1329" stroke="#64748b" strokeWidth="1" />
                <text x="35" y="15" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold">PF 5</text>
                <rect x="80" y="1" width="850" height="20" rx="3" fill="#0f172a" stroke="#1e293b" />
                <rect x="340" y="3" width="280" height="16" rx="3" fill="#334155" stroke="#64748b" strokeWidth="1.5" />
                <text x="350" y="14" fill="#cbd5e1" fontSize="8" fontWeight="bold">BOXN Freight Rake &bull; Yard Shunting Active</text>
              </g>
            </svg>

            {/* Bottom HUD */}
            <div className="absolute bottom-2 left-4 right-4 flex flex-wrap items-center justify-between text-xs text-slate-300 bg-slate-900/95 px-3 py-1.5 rounded-lg border border-slate-700 backdrop-blur-md">
              <span className="flex items-center gap-2 text-sky-300 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
                Throat Interlock: {triptiDwellExtension > 10 ? 'Conflict Alert - Inbound Held at Outer Signal' : 'All Approach Routes Clear'}
              </span>
              <span className="font-mono text-slate-300 text-[11px]">
                Outer Detention: {triptiDwellExtension > 10 ? `+${triptiDwellExtension - 10}m delay` : '0m (Nominal)'} &bull; Washing Pit Cycle: 180 mins allocated
              </span>
            </div>
          </div>

          {/* Terminal Occupancy Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Washing Pit Slot</span>
              <span className="font-mono text-base font-black text-slate-900 mt-0.5 block">180 Mins Req</span>
              <span className="text-[10px] text-slate-500 font-medium">Secondary maintenance cycle at coaching yard</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Yard Lead Speed Limit</span>
              <span className="font-mono text-base font-black text-irctc-blue mt-0.5 block">15 km/h Max</span>
              <span className="text-[10px] text-slate-500 font-medium">Shunting neck 1-in-8.5 turnout restriction</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Outer Stoppage Risk</span>
              <span className={`font-mono text-base font-black mt-0.5 block ${triptiDwellExtension > 20 ? 'text-rose-700' : (triptiDwellExtension > 10 ? 'text-amber-700' : 'text-emerald-700')}`}>
                {triptiDwellExtension > 20 ? '92% (High Detention)' : (triptiDwellExtension > 10 ? '58% (Moderate)' : '4% (Clear)')}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Signal overlap safety interlock buffer</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. AGENT RIYA (R) - BLOCK ASSISTANT EXPANDED WORKSPACE */}
      {selectedAgent === 'tracks' && (
        <div className="rounded-xl p-5 bg-white shadow-sm border border-slate-200 border-l-4 border-l-rose-500 space-y-5">
          {/* Header & Mode Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
                R
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-slate-900">
                    Agent Riya &bull; Block Assistant: Cascading Delay Propagation &amp; Intelligent Mitigation Suite
                  </h2>
                  <span className="text-[10px] font-mono font-bold bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full">
                    Domino Ripple Solver
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  Downstream Knock-on Delay Propagation &bull; Time-Distance Marey Diagram &bull; Dynamic Loop Diversion &bull; Speed Throttling Interlock
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-1 rounded-full">
                IR G&amp;SR Rule 3.38 &bull; Block Section Interlocked
              </span>
              <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-full">
                Kavach ATP RBC Synchronized
              </span>
            </div>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setRiyaActiveTab('CASCADING_SUITE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  riyaActiveTab === 'CASCADING_SUITE'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Cascading Delay Matrix &amp; Mitigation Table
              </button>
              {/* Time-Distance (Marey String) Cascade Graph Tab Button - Commented out as requested */}
              {/* <button
                type="button"
                onClick={() => setRiyaActiveTab('TIME_DISTANCE_GRAPH')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  riyaActiveTab === 'TIME_DISTANCE_GRAPH'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <FastForward className="w-3.5 h-3.5" />
                Time-Distance (Marey String) Cascade Graph
              </button> */}
              <button
                type="button"
                onClick={() => setRiyaActiveTab('EBD_BRAKING')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  riyaActiveTab === 'EBD_BRAKING'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                Safe Braking Distance (EBD) &amp; 4-Aspect Signals
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setRiyaEnforcedOrders({
                    '12919': true,
                    '12424': true,
                    '12138': true,
                    '12616': true,
                    '22692': true,
                    'BOXN-4021': true,
                  });
                }}
                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer shadow-xs transition-all flex items-center gap-1"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                Enforce All Orders
              </button>
              <button
                type="button"
                onClick={() => {
                  setRiyaMitigationStrategy('UNMANAGED_FIFO');
                  setRiyaEnforcedOrders({
                    '12919': false,
                    '12424': false,
                    '12138': false,
                    '12616': false,
                    '22692': false,
                    'BOXN-4021': false,
                  });
                }}
                className="px-2.5 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-[11px] cursor-pointer transition-all flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Reset (FIFO Baseline)
              </button>
            </div>
          </div>

          {/* Master Operational Controls Bar (Incident Severity + Mitigation Strategy) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
            {/* Primary Incident Slider */}
            <div className="lg:col-span-4 space-y-1.5">
              <div className="flex justify-between items-center font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                  Primary Train #12001 Halt in Block 3:
                </span>
                <span className="font-mono text-rose-900 font-black bg-rose-100 px-2 py-0.5 rounded border border-rose-300">
                  +{riyaIncidentDelay} mins
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                step="5"
                value={riyaIncidentDelay}
                onChange={(e) => setRiyaIncidentDelay(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>10m Minor</span>
                <span className="text-amber-700 font-bold">25m Nominal</span>
                <span className="text-rose-700 font-bold">45m Severe</span>
                <span className="text-red-900 font-black">60m Critical</span>
              </div>
              <span className="text-[10px] text-slate-500 block">
                Lead train stalled at Km 5.2 due to Traction Motor Thermal Alert. Trailing section signals drop to Red.
              </span>
            </div>

            {/* Mitigation Strategy Selector */}
            <div className="lg:col-span-8 space-y-1.5">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-blue-600" />
                AI Dispatch Management Strategy (How To Manage Trailing Trains):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setRiyaMitigationStrategy('LOOP_DIVERT')}
                  className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                    riyaMitigationStrategy === 'LOOP_DIVERT'
                      ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-extrabold text-[11px] block flex items-center justify-between">
                    Loop Diversion
                    {riyaMitigationStrategy === 'LOOP_DIVERT' && <span className="text-[9px] bg-white/20 px-1 rounded">Active</span>}
                  </span>
                  <span className={`text-[9px] block mt-0.5 leading-tight ${riyaMitigationStrategy === 'LOOP_DIVERT' ? 'text-rose-100' : 'text-slate-500'}`}>
                    Loop Malwa Exp at Station B; grant Rajdhani #12424 priority overtake on Up Main.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRiyaMitigationStrategy('SPEED_REGULATION')}
                  className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                    riyaMitigationStrategy === 'SPEED_REGULATION'
                      ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-extrabold text-[11px] block flex items-center justify-between">
                    Speed Advisory
                    {riyaMitigationStrategy === 'SPEED_REGULATION' && <span className="text-[9px] bg-white/20 px-1 rounded">Active</span>}
                  </span>
                  <span className={`text-[9px] block mt-0.5 leading-tight ${riyaMitigationStrategy === 'SPEED_REGULATION' ? 'text-rose-100' : 'text-slate-500'}`}>
                    Dynamic throttle to 45 km/h. Prevents dead stops; eliminates 15-min restart penalty.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRiyaMitigationStrategy('KAVACH_ATP')}
                  className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                    riyaMitigationStrategy === 'KAVACH_ATP'
                      ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-extrabold text-[11px] block flex items-center justify-between">
                    Kavach ATP
                    {riyaMitigationStrategy === 'KAVACH_ATP' && <span className="text-[9px] bg-white/20 px-1 rounded">Active</span>}
                  </span>
                  <span className={`text-[9px] block mt-0.5 leading-tight ${riyaMitigationStrategy === 'KAVACH_ATP' ? 'text-rose-100' : 'text-slate-500'}`}>
                    Continuous RBC Movement Authority updates; safe 450m dynamic moving block headway.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRiyaMitigationStrategy('UNMANAGED_FIFO')}
                  className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                    riyaMitigationStrategy === 'UNMANAGED_FIFO'
                      ? 'bg-slate-800 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-extrabold text-[11px] block flex items-center justify-between">
                    Unmanaged FIFO
                    {riyaMitigationStrategy === 'UNMANAGED_FIFO' && <span className="text-[9px] bg-rose-500 text-white px-1 rounded">Baseline</span>}
                  </span>
                  <span className={`text-[9px] block mt-0.5 leading-tight ${riyaMitigationStrategy === 'UNMANAGED_FIFO' ? 'text-slate-300' : 'text-slate-500'}`}>
                    No proactive routing. Trailing trains hit red signals in sequence (worst-case domino ripple).
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Executive Real-Time KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Detention Hours Saved</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-mono text-lg font-black text-emerald-700">
                  {riyaCascadingData.totalSaved} min
                </span>
                <span className="text-[11px] font-bold text-emerald-600">
                  (-{riyaCascadingData.recoveryPct}%)
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">
                Down to {riyaCascadingData.totalMitigated}m (from {riyaCascadingData.totalUnmanaged}m baseline)
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Downstream Trains Cascaded</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-mono text-lg font-black text-rose-700">
                  {riyaCascadingData.mitigatedImpactedCount} / 6
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  (was {riyaCascadingData.unmanagedImpactedCount} in FIFO)
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">
                Downstream trains delayed &ge;5 mins
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Punctuality Recovery Index</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-mono text-lg font-black text-blue-700">
                  {riyaCascadingData.recoveryPct}%
                </span>
                <span className="text-[11px] font-bold text-blue-600">
                  Corridor Shield
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">
                Section throughput efficiency score
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Corridor Clearance ETA</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-mono text-lg font-black text-amber-700">
                  T+{Math.round(riyaIncidentDelay * 0.75)} mins
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  Normal Flow
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">
                All 4 block sections return to Green wave
              </span>
            </div>
          </div>

          {/* TAB 1: CASCADING DELAY MATRIX & MITIGATION REGISTER */}
          {riyaActiveTab === 'CASCADING_SUITE' && (
            <div className="space-y-4">
              {/* GRAPH 1: Cascading Delay Bar & Cumulative Ripple Curve */}
              <div className="bg-[#090e1a] rounded-xl p-4 border border-slate-800 text-slate-100 shadow-xl space-y-3 font-mono">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Graph 1: Downstream Train-by-Train Cascading Delay Ripple &bull; Unmitigated vs AI Mitigated
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1.5 text-rose-400">
                      <span className="w-2.5 h-2.5 bg-rose-500 rounded-sm" />
                      Unmanaged Domino Delay (FIFO)
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" />
                      AI Managed Delay
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <span className="w-3 h-0.5 bg-amber-400 border border-amber-400" />
                      Cumulative Ripple Trend
                    </span>
                  </div>
                </div>

                {/* SVG Visual Delay Comparison Chart */}
                <div className="relative w-full h-[230px] overflow-hidden select-none">
                  <svg viewBox="0 0 880 200" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="riyaRoseBar" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#881337" stopOpacity="0.8" />
                      </linearGradient>
                      <linearGradient id="riyaGreenBar" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#064e3b" stopOpacity="0.8" />
                      </linearGradient>
                    </defs>

                    {/* Chart Grid Lines */}
                    <line x1="40" y1="160" x2="860" y2="160" stroke="#334155" strokeWidth="1" />
                    <line x1="40" y1="110" x2="860" y2="110" stroke="#1e293b" strokeDasharray="3 3" />
                    <line x1="40" y1="60" x2="860" y2="60" stroke="#1e293b" strokeDasharray="3 3" />
                    <line x1="40" y1="20" x2="860" y2="20" stroke="#1e293b" strokeDasharray="3 3" />

                    {/* Y-Axis Value Labels */}
                    <text x="32" y="163" fill="#64748b" fontSize="9" textAnchor="end">0m</text>
                    <text x="32" y="113" fill="#64748b" fontSize="9" textAnchor="end">20m</text>
                    <text x="32" y="63" fill="#64748b" fontSize="9" textAnchor="end">40m</text>
                    <text x="32" y="23" fill="#64748b" fontSize="9" textAnchor="end">60m</text>

                    {/* Bars & Labels for each train */}
                    {riyaCascadingData.trains.map((train, idx) => {
                      const colWidth = 110;
                      const xCenter = 60 + idx * colWidth;
                      const maxMinutes = 60;
                      const unmanagedH = Math.min(140, (train.unmanagedDelay / maxMinutes) * 140);
                      const mitigatedH = Math.min(140, (train.mitigatedDelay / maxMinutes) * 140);

                      return (
                        <g key={train.no}>
                          {/* Unmanaged Delay Bar (Rose) */}
                          <rect
                            x={xCenter - 22}
                            y={160 - unmanagedH}
                            width="20"
                            height={unmanagedH}
                            rx="3"
                            fill="url(#riyaRoseBar)"
                            stroke="#fb7185"
                            strokeWidth="0.8"
                          />
                          {train.unmanagedDelay > 0 && (
                            <text
                              x={xCenter - 12}
                              y={Math.max(15, 155 - unmanagedH)}
                              fill="#fca5a5"
                              fontSize="8"
                              fontWeight="bold"
                              textAnchor="middle"
                            >
                              +{train.unmanagedDelay}m
                            </text>
                          )}

                          {/* Mitigated Delay Bar (Green) */}
                          <rect
                            x={xCenter + 2}
                            y={160 - mitigatedH}
                            width="20"
                            height={mitigatedH}
                            rx="3"
                            fill="url(#riyaGreenBar)"
                            stroke="#34d399"
                            strokeWidth="0.8"
                          />
                          <text
                            x={xCenter + 12}
                            y={Math.max(15, 155 - mitigatedH)}
                            fill="#6ee7b7"
                            fontSize="8"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            +{train.mitigatedDelay}m
                          </text>

                          {/* Delay Saved Badge */}
                          {train.delaySaved > 0 && (
                            <g transform={`translate(${xCenter - 24}, 30)`}>
                              <rect width="48" height="15" rx="3" fill="#065f46" stroke="#10b981" strokeWidth="0.8" />
                              <text x="24" y="11" fill="#ecfdf5" fontSize="8" fontWeight="black" textAnchor="middle">
                                -{train.delaySaved}m
                              </text>
                            </g>
                          )}

                          {/* Train Number & Identity on X-Axis */}
                          <text x={xCenter} y="174" fill="#f8fafc" fontSize="9" fontWeight="bold" textAnchor="middle">
                            #{train.no}
                          </text>
                          <text x={xCenter} y="186" fill="#94a3b8" fontSize="7.5" textAnchor="middle">
                            {train.name.split(' ')[0]}
                          </text>
                          <text x={xCenter} y="196" fill="#64748b" fontSize="7" textAnchor="middle">
                            {train.isOrigin ? 'ORIGIN' : `+${train.distanceBehindKm}km`}
                          </text>
                        </g>
                      );
                    })}

                    {/* Cumulative Unmanaged Ripple Trend Line */}
                    {(() => {
                      let cumUnmanaged = 0;
                      const pts = riyaCascadingData.trains.map((t, idx) => {
                        cumUnmanaged += t.unmanagedDelay;
                        const x = 60 + idx * 110;
                        const y = 160 - (Math.min(180, cumUnmanaged) / 180) * 135;
                        return `${x},${y}`;
                      }).join(' ');
                      return (
                        <polyline
                          fill="none"
                          stroke="#fbbf24"
                          strokeWidth="2"
                          strokeDasharray="4 3"
                          points={pts}
                        />
                      );
                    })()}
                  </svg>
                </div>

                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
                  <span>
                    <strong className="text-rose-400">Cascading Domino Observation:</strong> Lead Train stoppage causes 5 trailing trains to accumulate +{riyaCascadingData.totalUnmanaged} unmanaged minutes.
                  </span>
                  <span>
                    <strong className="text-emerald-400">AI Mitigation Directives:</strong> Compress net downstream disruption to +{riyaCascadingData.totalMitigated} mins ({riyaCascadingData.totalSaved} min saved).
                  </span>
                </div>
              </div>

              {/* TABLE: Cascading Train Delay Register & Intelligent Management Matrix */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-rose-600" />
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        Cascading Train Delay Register &amp; Intelligent Management Matrix
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Live real-time operational roster of downstream trains impacted by block incident with actionable AI dispatch orders.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-full">
                    {riyaCascadingData.trains.length} Trains Monitored &bull; Active Strategy: {riyaMitigationStrategy}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/90 text-slate-700 text-[11px] uppercase tracking-wider font-extrabold border-b border-slate-200">
                        <th className="py-2.5 px-3">Train &amp; Category</th>
                        <th className="py-2.5 px-3">Current Section &amp; Distance</th>
                        <th className="py-2.5 px-3 text-center">Unmanaged Delay (FIFO)</th>
                        <th className="py-2.5 px-3 text-center">Managed Delay (AI)</th>
                        <th className="py-2.5 px-3 text-center">Detention Saved</th>
                        <th className="py-2.5 px-3">Root Bottleneck Cause</th>
                        <th className="py-2.5 px-3">Actionable AI Mitigation Directive</th>
                        <th className="py-2.5 px-3 text-center">Enforce Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      {riyaCascadingData.trains.map((train) => (
                        <tr
                          key={train.no}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            train.isOrigin ? 'bg-rose-50/40' : (train.isEnforced ? 'bg-emerald-50/20' : '')
                          }`}
                        >
                          {/* Train & Category */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <Train className={`w-3.5 h-3.5 shrink-0 ${train.isOrigin ? 'text-rose-600' : 'text-slate-600'}`} />
                              <div>
                                <span className="font-bold text-slate-900 block leading-tight font-sans text-xs">
                                  #{train.no} {train.name}
                                </span>
                                <span className={`text-[10px] font-medium block ${
                                  train.category.includes('P1') ? 'text-purple-700 font-bold' : (train.category.includes('Freight') ? 'text-amber-800' : 'text-slate-500')
                                }`}>
                                  {train.category}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Current Section & Distance */}
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-800 block text-[11px]">
                              {train.block}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {train.isOrigin ? 'Incident Origin Point' : `${train.distanceBehindKm} km behind lead train`}
                            </span>
                          </td>

                          {/* Unmanaged Delay */}
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded font-black text-rose-800 bg-rose-100 border border-rose-200 text-xs">
                              +{train.unmanagedDelay}m
                            </span>
                          </td>

                          {/* Managed Delay */}
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded font-black text-xs ${
                              train.mitigatedDelay === 0
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : (train.mitigatedDelay <= 5 ? 'bg-teal-100 text-teal-800 border border-teal-300' : 'bg-amber-100 text-amber-900 border border-amber-300')
                            }`}>
                              +{train.mitigatedDelay}m
                            </span>
                          </td>

                          {/* Detention Saved */}
                          <td className="py-2.5 px-3 text-center">
                            {train.delaySaved > 0 ? (
                              <span className="font-black text-emerald-700 text-xs flex items-center justify-center gap-0.5">
                                <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                                -{train.delaySaved} min
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">&mdash;</span>
                            )}
                          </td>

                          {/* Root Bottleneck Cause */}
                          <td className="py-2.5 px-3 font-sans text-[11px] text-slate-600 max-w-[180px]">
                            {train.rootCause}
                          </td>

                          {/* Actionable AI Directive */}
                          <td className="py-2.5 px-3 font-sans text-[11px] font-medium text-slate-800 max-w-[280px]">
                            <div className="flex items-start gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                              <span>{train.directive}</span>
                            </div>
                          </td>

                          {/* Enforce Action Button */}
                          <td className="py-2.5 px-3 text-center font-sans">
                            {train.isOrigin ? (
                              <span className="px-2 py-1 rounded bg-slate-100 text-slate-500 font-bold text-[10px] border border-slate-200">
                                Primary Cause
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setRiyaEnforcedOrders((prev) => ({
                                    ...prev,
                                    [train.no]: !prev[train.no],
                                  }));
                                }}
                                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1 mx-auto ${
                                  train.isEnforced
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300'
                                }`}
                              >
                                {train.isEnforced ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                    Enforced
                                  </>
                                ) : (
                                  <>
                                    <Zap className="w-3 h-3 text-rose-600" />
                                    Enforce
                                  </>
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* HOW TO MANAGE THEM: 4 Core IR Operational Playbooks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900">
                    <Split className="w-3.5 h-3.5 text-blue-700" />
                    <span>1. Dynamic Loop Stabling</span>
                  </div>
                  <p className="text-[11px] text-blue-800 leading-snug">
                    Divert lower-priority Express/Freight into Station B Loop Line 1; grant priority green passage to P1 Superfast Rajdhani #12424 on Up Main.
                  </p>
                  <span className="text-[10px] font-mono font-bold text-blue-700 block mt-1">
                    Saves: 20 train-mins for Rajdhani
                  </span>
                </div>

                <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <Sliders className="w-3.5 h-3.5 text-amber-700" />
                    <span>2. Advisory Speed Throttling</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-snug">
                    Broadcast TSR 45 km/h to #12138 and #12616 early. Prevents dead braking at red signals; eliminates massive 12-min locomotive restart energy penalties.
                  </p>
                  <span className="text-[10px] font-mono font-bold text-amber-700 block mt-1">
                    Saves: 15 train-mins + 22% traction kWh
                  </span>
                </div>

                <div className="p-3 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>3. Kavach Dynamic Spacing</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-snug">
                    Radio Block Centre calculates dynamic distance-to-go curves; compresses block spacing from 1200m down to 450m without breaching overlap safety.
                  </p>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 block mt-1">
                    Capacity Boost: +32% Section Headway
                  </span>
                </div>

                <div className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-purple-900">
                    <Train className="w-3.5 h-3.5 text-purple-700" />
                    <span>4. Freight Siding Holding Lock</span>
                  </div>
                  <p className="text-[11px] text-purple-800 leading-snug">
                    Hold heavy tonnage rake #BOXN-4021 in siding until passenger platoons clear Section 4. Eliminates slow-acceleration drag on main trunk line.
                  </p>
                  <span className="text-[10px] font-mono font-bold text-purple-700 block mt-1">
                    Prevents: Total corridor gridlock
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TIME-DISTANCE MAREY STRING CASCADE GRAPH - Commented out as requested */}
          {/* riyaActiveTab === 'TIME_DISTANCE_GRAPH' && (
            <div className="bg-[#070c18] rounded-xl p-5 border border-slate-800 text-slate-100 shadow-2xl space-y-4 font-mono">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <FastForward className="w-4 h-4 text-rose-400" />
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-200 uppercase tracking-wider">
                      Graph 2: Time-Distance (Marey / String Diagram) Corridor Trajectory &amp; Dynamic Overtake
                    </h3>
                    <p className="text-[11px] text-slate-400 font-sans font-normal mt-0.5">
                      Visualizing train trajectories over time &bull; Slopes represent train speed &bull; Horizontal flats represent signal halts &bull; Intersection represents dynamic loop overtake
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1.5 text-rose-400">
                    <span className="w-3 h-0.5 bg-rose-500" />
                    #12001 Stabled in Siding
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <span className="w-3 h-0.5 bg-amber-400" />
                    #12919 Malwa (Loop Divert)
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-3 h-0.5 bg-emerald-400" />
                    #12424 Rajdhani (Main Line Overtake)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-sans">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-900/80 text-blue-300 font-black text-[11px] flex items-center justify-center shrink-0 border border-blue-500/30">
                    1
                  </span>
                  <div>
                    <strong className="text-blue-300 block text-[11px]">Axes Explained:</strong>
                    <span className="text-slate-400 text-[10px] leading-tight block mt-0.5">
                      <strong>X-Axis (Bottom):</strong> Time flowing forward (0 to 60 min).<br />
                      <strong>Y-Axis (Left):</strong> Physical distance along the corridor (Km -4.2 to Km 7.8).
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-900/80 text-amber-300 font-black text-[11px] flex items-center justify-center shrink-0 border border-amber-500/30">
                    2
                  </span>
                  <div>
                    <strong className="text-amber-300 block text-[11px]">Slopes &amp; Flat Lines:</strong>
                    <span className="text-slate-400 text-[10px] leading-tight block mt-0.5">
                      <strong>Diagonal line:</strong> Train in motion (steeper = faster speed).<br />
                      <strong>Flat horizontal line:</strong> Train stopped at signal or stabled in loop (0 km/h).
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-900/80 text-emerald-300 font-black text-[11px] flex items-center justify-center shrink-0 border border-emerald-500/30">
                    3
                  </span>
                  <div>
                    <strong className="text-emerald-300 block text-[11px]">The Overtake (Intersection):</strong>
                    <span className="text-slate-400 text-[10px] leading-tight block mt-0.5">
                      Malwa pulls into Loop Line (flat step at Km 2.8). Rajdhani stays on Up Main, overtaking it at T+9m!
                    </span>
                  </div>
                </div>
              </div>

              <div className="relative w-full h-[380px] overflow-hidden select-none">
                <svg viewBox="0 0 900 340" className="w-full h-full overflow-visible">
                  <defs>
                    <pattern id="mareyGrid" width="60" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 60 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
                    </pattern>
                  </defs>
                  <rect width="900" height="340" fill="url(#mareyGrid)" />

                  <text x="15" y="170" fill="#64748b" fontSize="8" fontWeight="bold" textAnchor="middle" transform="rotate(-90 15 170)">
                    &larr; CORRIDOR DISTANCE (KM &bull; SIGNALS)
                  </text>
                  <text x="490" y="335" fill="#64748b" fontSize="9" fontWeight="bold" textAnchor="middle">
                    ELAPSED TIME (0 to 60 MINUTES) &rarr;
                  </text>

                  <line x1="80" y1="40" x2="870" y2="40" stroke="#334155" strokeWidth="1" />
                  <text x="72" y="44" fill="#94a3b8" fontSize="8.5" textAnchor="end">Km 7.8 (S-107 Starter &bull; Exit)</text>

                  <line x1="80" y1="100" x2="870" y2="100" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" />
                  <text x="72" y="98" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="end">Km 5.2 (Up Main Line Clear)</text>
                  <text x="72" y="108" fill="#f87171" fontSize="7.5" textAnchor="end">Refuge Siding (Parallel Track)</text>

                  <line x1="80" y1="160" x2="870" y2="160" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 2" />
                  <text x="72" y="164" fill="#fbbf24" fontSize="8.5" textAnchor="end">Km 2.8 (Station B &bull; Loop 1)</text>

                  <line x1="80" y1="220" x2="870" y2="220" stroke="#334155" strokeWidth="1" />
                  <text x="72" y="224" fill="#94a3b8" fontSize="8.5" textAnchor="end">Km 0.0 (S-101 Entry Starter)</text>

                  <line x1="80" y1="280" x2="870" y2="280" stroke="#334155" strokeWidth="1" />
                  <text x="72" y="284" fill="#64748b" fontSize="8.5" textAnchor="end">Km -4.2 (Palwal Jn Approach)</text>

                  {[0, 10, 20, 30, 40, 50, 60].map((t) => {
                    const x = 80 + (t / 60) * 780;
                    return (
                      <g key={t}>
                        <line x1={x} y1="30" x2={x} y2="300" stroke="#1e293b" strokeWidth="1" />
                        <text x={x} y="315" fill="#94a3b8" fontSize="9" textAnchor="middle">
                          T+{t}m
                        </text>
                      </g>
                    );
                  })}

                  {(() => {
                    const haltEnd = 3 + riyaIncidentDelay;
                    const haltEndX = 80 + (haltEnd / 60) * 780;
                    const finishX = 80 + ((haltEnd + 6) / 60) * 780;

                    return (
                      <g>
                        <rect
                          x={80 + (3 / 60) * 780}
                          y="92"
                          width={(riyaIncidentDelay / 60) * 780}
                          height="16"
                          rx="3"
                          fill="rgba(244, 63, 94, 0.25)"
                          stroke="#f43f5e"
                          strokeWidth="1.5"
                        />
                        <text
                          x={80 + ((3 + riyaIncidentDelay / 2) / 60) * 780}
                          y="103"
                          fill="#fecdd3"
                          fontSize="7.5"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          #12001 IN REFUGE SIDING ({riyaIncidentDelay}m) &bull; UP MAIN CLEAR
                        </text>

                        <path
                          d={`M ${80 + (0 / 60) * 780} 140 L ${80 + (3 / 60) * 780} 100 L ${haltEndX} 100 L ${finishX} 40`}
                          fill="none"
                          stroke="#f43f5e"
                          strokeWidth="3"
                        />
                        <circle cx={finishX} cy={40} r="4" fill="#f43f5e" />
                        <text x={finishX + 6} y="44" fill="#f43f5e" fontSize="8.5" fontWeight="bold">#12001 Clears Km 7.8</text>
                      </g>
                    );
                  })()}

                  {(() => {
                    const isFifo = riyaMitigationStrategy === 'UNMANAGED_FIFO';

                    const malwaPath = isFifo
                      ? `M ${80 + (0 / 60) * 780} 180 L ${80 + (4 / 60) * 780} 160 L ${80 + (28 / 60) * 780} 160 L ${80 + (38 / 60) * 780} 40`
                      : `M ${80 + (0 / 60) * 780} 180 L ${80 + (5 / 60) * 780} 160 L ${80 + (11 / 60) * 780} 160 L ${80 + (22 / 60) * 780} 40`;

                    const rajdhaniPath = isFifo
                      ? `M ${80 + (2 / 60) * 780} 240 L ${80 + (6 / 60) * 780} 220 L ${80 + (26 / 60) * 780} 220 L ${80 + (34 / 60) * 780} 40`
                      : `M ${80 + (2 / 60) * 780} 240 L ${80 + (9 / 60) * 780} 160 L ${80 + (16 / 60) * 780} 40`;

                    const punjabPath = isFifo
                      ? `M ${80 + (4 / 60) * 780} 280 L ${80 + (12 / 60) * 780} 250 L ${80 + (32 / 60) * 780} 250 L ${80 + (44 / 60) * 780} 40`
                      : `M ${80 + (4 / 60) * 780} 280 L ${80 + (16 / 60) * 780} 190 L ${80 + (26 / 60) * 780} 40`;

                    return (
                      <g>
                        <path
                          d={malwaPath}
                          fill="none"
                          stroke={isFifo ? '#ef4444' : '#f59e0b'}
                          strokeWidth="2.5"
                          strokeDasharray={isFifo ? undefined : '5 2'}
                        />
                        <text
                          x={80 + (isFifo ? (38 / 60) * 780 : (22 / 60) * 780) + 6}
                          y="48"
                          fill="#fbbf24"
                          fontSize="8"
                          fontWeight="bold"
                        >
                          #12919 Malwa
                        </text>

                        <path
                          d={rajdhaniPath}
                          fill="none"
                          stroke={isFifo ? '#f87171' : '#10b981'}
                          strokeWidth="3"
                        />
                        <text
                          x={80 + (isFifo ? (34 / 60) * 780 : (16 / 60) * 780) + 6}
                          y="35"
                          fill="#34d399"
                          fontSize="8.5"
                          fontWeight="black"
                        >
                          #12424 Rajdhani {isFifo ? '(Held)' : '(Overtake)'}
                        </text>

                        <path
                          d={punjabPath}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="2"
                        />
                        <text
                          x={80 + (isFifo ? (44 / 60) * 780 : (26 / 60) * 780) + 6}
                          y="60"
                          fill="#7dd3fc"
                          fontSize="8"
                        >
                          #12138 Punjab
                        </text>

                        {!isFifo && (
                          <g transform={`translate(${80 + (9 / 60) * 780}, 160)`}>
                            <circle r="5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                            <rect x="8" y="-12" width="145" height="24" rx="4" fill="#064e3b" stroke="#34d399" strokeWidth="1" />
                            <text x="80" y="3" fill="#a7f3d0" fontSize="8" fontWeight="bold" textAnchor="middle">
                              DYNAMIC OVERTAKE @ T+9m
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })()}
                </svg>
              </div>

              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-300 bg-slate-900/90 px-3.5 py-2.5 rounded-xl border border-slate-800 font-sans">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <strong>Why this matters to Indian Railways:</strong> Without dynamic looping, Rajdhani #12424 would sit dead behind Malwa at S-101 for 22 minutes. Looping Malwa saves 80 cumulative train-minutes!
                </span>
                <span className="font-mono text-emerald-400 font-bold">
                  Punctuality Preservation: 94.2%
                </span>
              </div>
            </div>
          )} */}

          {/* TAB 3: SAFE BRAKING DISTANCE (EBD) & 4-ASPECT SIGNALS (Preserved Physics Console) */}
          {riyaActiveTab === 'EBD_BRAKING' && (
            <div className="space-y-4">
              {/* Controls Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div>
                  <div className="flex justify-between items-center mb-1.5 font-bold text-slate-800">
                    <span>Approach Speed:</span>
                    <span className="font-mono text-rose-800 font-black bg-rose-100 px-2.5 py-0.5 rounded border border-rose-200">
                      {riyaApproachSpeed} km/h
                    </span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="140"
                    step="5"
                    value={riyaApproachSpeed}
                    onChange={(e) => setRiyaApproachSpeed(parseInt(e.target.value, 10))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                    <span>40 km/h</span>
                    <span>80 km/h</span>
                    <span className="text-rose-700 font-bold">130 km/h MPS</span>
                    <span>140 km/h</span>
                  </div>
                </div>

                <div>
                  <span className="font-bold text-slate-800 block mb-1.5">Track Gradient:</span>
                  <div className="grid grid-cols-3 gap-1">
                    {[-10, 0, 10].map((grad) => (
                      <button
                        key={grad}
                        type="button"
                        onClick={() => setRiyaGradient(grad)}
                        className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          riyaGradient === grad
                            ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {grad === -10 ? 'Down (-1:100)' : (grad === 0 ? 'Level 0‰' : 'Up (+1:100)')}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium block mt-1.5">
                    {riyaGradient < 0 ? 'Falling gradient extends braking run by 18%.' : (riyaGradient > 0 ? 'Rising gradient assists deceleration.' : 'Nominal level grade.')}
                  </span>
                </div>

                <div>
                  <span className="font-bold text-slate-800 block mb-1.5">Rail Surface Adhesion:</span>
                  <div className="grid grid-cols-3 gap-1">
                    {(['DRY', 'WET', 'FOG'] as const).map((adh) => (
                      <button
                        key={adh}
                        type="button"
                        onClick={() => setRiyaAdhesion(adh)}
                        className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          riyaAdhesion === adh
                            ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {adh}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium block mt-1.5">
                    {riyaAdhesion === 'DRY' ? 'Adhesion coefficient μ = 0.25' : (riyaAdhesion === 'WET' ? 'Reduced adhesion μ = 0.16' : 'Critically low μ = 0.12 in fog')}
                  </span>
                </div>
              </div>

              {/* Dynamic EBD Braking Curve Canvas */}
              {(() => {
                const mu = riyaAdhesion === 'DRY' ? 0.25 : (riyaAdhesion === 'WET' ? 0.16 : 0.12);
                const vMps = riyaApproachSpeed / 3.6;
                const gradFactor = 1 + (riyaGradient / 100);
                const decelEbd = 0.72 * mu * 9.81 * gradFactor;
                const decelSvc = 0.48 * mu * 9.81 * gradFactor;
                const ebdMeters = Math.round((vMps * vMps) / (2 * Math.max(0.2, decelEbd)));
                const svcMeters = Math.round((vMps * vMps) / (2 * Math.max(0.2, decelSvc)));
                const totalEnvelope = ebdMeters + 180;
                const maxDist = 1600;

                return (
                  <div className="relative w-full h-[300px] bg-[#070c19] rounded-xl p-4 border border-slate-800 overflow-hidden shadow-2xl font-mono select-none">
                    <div className="flex justify-between items-center text-xs mb-2">
                      <span className="font-bold uppercase tracking-wider text-rose-400 text-[11px] flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                        Safe Braking Distance (EBD) &bull; Deceleration Profile vs 180m Overlap Margin
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        Calculated EBD: {ebdMeters}m &bull; Overlap: +180m &bull; Total: {totalEnvelope}m
                      </span>
                    </div>

                    <svg viewBox="0 0 950 180" className="w-full h-full overflow-visible">
                      <defs>
                        <pattern id="riyaGridEbd" width="25" height="25" patternUnits="userSpaceOnUse">
                          <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
                        </pattern>
                      </defs>
                      <rect width="950" height="150" fill="url(#riyaGridEbd)" />

                      {/* Overlap Buffer Graphic */}
                      {(() => {
                        const startX = (ebdMeters / maxDist) * 950;
                        const widthX = (180 / maxDist) * 950;
                        return (
                          <g>
                            <rect x={startX} y="15" width={widthX} height="135" fill="rgba(245, 158, 11, 0.15)" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 3" />
                            <text x={startX + widthX / 2} y="30" textAnchor="middle" fill="#fbbf24" fontSize="8" fontWeight="bold">
                              180m OVERLAP
                            </text>
                          </g>
                        );
                      })()}

                      {/* Grid Lines */}
                      <line x1="0" y1="150" x2="950" y2="150" stroke="#334155" strokeWidth="1" />
                      <line x1="0" y1="100" x2="950" y2="100" stroke="#1e293b" strokeDasharray="3 3" />
                      <line x1="0" y1="50" x2="950" y2="50" stroke="#1e293b" strokeDasharray="3 3" />

                      {/* Deceleration Curve */}
                      {(() => {
                        const ptsEbd = Array.from({ length: 25 }, (_, idx) => {
                          const frac = idx / 24;
                          const dist = frac * ebdMeters;
                          const x = (dist / maxDist) * 950;
                          const spd = riyaApproachSpeed * Math.sqrt(Math.max(0, 1 - frac));
                          const y = 150 - (spd / 140) * 125;
                          return `${x},${y}`;
                        }).join(' ');

                        const ptsSvc = Array.from({ length: 25 }, (_, idx) => {
                          const frac = idx / 24;
                          const dist = frac * svcMeters;
                          const x = (dist / maxDist) * 950;
                          const spd = riyaApproachSpeed * Math.sqrt(Math.max(0, 1 - frac));
                          const y = 150 - (spd / 140) * 125;
                          return `${x},${y}`;
                        }).join(' ');

                        const stopX = (ebdMeters / maxDist) * 950;

                        return (
                          <>
                            <polyline fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="4 2" points={ptsSvc} />
                            <polyline fill="none" stroke="#f43f5e" strokeWidth="3" points={ptsEbd} />
                            <circle cx={stopX} cy={150} r="6" fill="#f43f5e" stroke="#ffffff" strokeWidth="2" />
                            <g transform={`translate(${Math.max(10, stopX - 55)}, 120)`}>
                              <rect width="110" height="18" rx="3" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1" />
                              <text x="55" y="12" textAnchor="middle" fill="#fecdd3" fontSize="8" fontWeight="bold">
                                EBD {ebdMeters}m @ 0 km/h
                              </text>
                            </g>
                          </>
                        );
                      })()}

                      {/* Axis Labels */}
                      <text x="5" y="165" fill="#94a3b8" fontSize="9">Mast 0m ({riyaApproachSpeed} km/h)</text>
                      <text x="450" y="165" fill="#94a3b8" fontSize="9">Deceleration Run Profile</text>
                      <text x="880" y="165" fill="#f87171" fontSize="9" fontWeight="bold">Fouling Mark</text>
                    </svg>

                    {/* Bottom HUD */}
                    <div className="absolute bottom-2 left-4 right-4 flex flex-wrap items-center justify-between text-xs text-slate-300 bg-slate-900/95 px-3 py-1.5 rounded-lg border border-slate-700 backdrop-blur-md">
                      <span className="flex items-center gap-2 text-rose-300 font-bold">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                        IR G&amp;SR Rule 3.38 Interlocking: {totalEnvelope <= 1000 ? 'COMPLIANT (EBD + 180m <= Block)' : 'RESTRICTION NEEDED (EBD Exceeds Block)'}
                      </span>
                      <span className="font-mono text-slate-300 text-[11px]">
                        Solid Rose: Emergency Stop ({ebdMeters}m) &bull; Cyan Dashed: Service Braking ({svcMeters}m) &bull; Overlap Buffer: 180m
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Automatic 4-Aspect Headway Separation Cascade */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center font-bold text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-rose-600" />
                    Automatic 4-Aspect Block Cascade Headway Separation
                  </span>
                  <span className="font-mono text-xs text-rose-700 font-black bg-rose-100 px-2 py-0.5 rounded border border-rose-200">
                    {riyaHeadwayDistance} meters
                  </span>
                </div>

                <input
                  type="range"
                  min="600"
                  max="3800"
                  step="100"
                  value={riyaHeadwayDistance}
                  onChange={(e) => setRiyaHeadwayDistance(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
                />

                {/* Visual 4 Signals Chain */}
                <div className="grid grid-cols-4 gap-2 pt-1 font-mono text-center">
                  <div className="p-2 rounded-lg bg-white border border-slate-300">
                    <span className="text-[10px] text-slate-500 font-bold block">S-101 Mast</span>
                    <span className="text-xs font-black text-rose-600 block mt-0.5">RED (Danger)</span>
                    <span className="text-[9px] text-slate-500">Train in Block &bull; 0 km/h</span>
                  </div>

                  <div className="p-2 rounded-lg bg-white border border-slate-300">
                    <span className="text-[10px] text-slate-500 font-bold block">S-103 IBS</span>
                    <span className={`text-xs font-black block mt-0.5 ${riyaHeadwayDistance > 1000 ? 'text-amber-600' : 'text-rose-600'}`}>
                      {riyaHeadwayDistance > 1000 ? 'YELLOW (Caution)' : 'RED (Danger)'}
                    </span>
                    <span className="text-[9px] text-slate-500">30 km/h restriction</span>
                  </div>

                  <div className="p-2 rounded-lg bg-white border border-slate-300">
                    <span className="text-[10px] text-slate-500 font-bold block">S-105 Home</span>
                    <span className={`text-xs font-black block mt-0.5 ${riyaHeadwayDistance > 2000 ? 'text-amber-500' : (riyaHeadwayDistance > 1000 ? 'text-amber-600' : 'text-rose-600')}`}>
                      {riyaHeadwayDistance > 2000 ? 'DBL YELLOW' : (riyaHeadwayDistance > 1000 ? 'YELLOW' : 'RED')}
                    </span>
                    <span className="text-[9px] text-slate-500">50 km/h Attention</span>
                  </div>

                  <div className="p-2 rounded-lg bg-white border border-slate-300">
                    <span className="text-[10px] text-slate-500 font-bold block">S-107 Starter</span>
                    <span className={`text-xs font-black block mt-0.5 ${riyaHeadwayDistance > 3000 ? 'text-emerald-600' : 'text-amber-500'}`}>
                      {riyaHeadwayDistance > 3000 ? 'GREEN (Clear)' : 'DBL YELLOW'}
                    </span>
                    <span className="text-[9px] text-slate-500">130 km/h MPS</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. AGENT SMITA (S) - ROLLING STOCK & ROUTE EXPANDED WORKSPACE */}
      {selectedAgent === 'resource' && (
        <div className="rounded-xl p-5 bg-white shadow-sm border border-slate-200 border-l-4 border-l-emerald-600 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
                S
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-slate-900">
                  Agent Smita &bull; Rolling Stock Assistant: Expanded 6-Line Track Topology &amp; Signalling
                </h2>
                <p className="text-xs text-slate-600 font-medium">
                  Correlated Block Signals &bull; Overlap Margin (180m) &bull; Fouling Clearance &bull; Fog Sighting Simulation
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-1 rounded-full">
                RDSO / CLW Spec-0029 &bull; Section Route 6-Line Matrix
              </span>
            </div>

          {/* Controls: Speed, Turnout Switch */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Simulation Motion Speed */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-300 text-xs font-bold">
              <button
                type="button"
                onClick={() => setSimulationSpeed('NORMAL')}
                className={`px-2 py-0.5 rounded text-[11px] ${simulationSpeed === 'NORMAL' ? 'bg-white shadow-xs text-irctc-blue' : 'text-slate-600'}`}
              >
                1x
              </button>
              <button
                type="button"
                onClick={() => setSimulationSpeed('FAST')}
                className={`px-2 py-0.5 rounded text-[11px] ${simulationSpeed === 'FAST' ? 'bg-white shadow-xs text-irctc-blue' : 'text-slate-600'}`}
              >
                2x
              </button>
              <button
                type="button"
                onClick={() => setSimulationSpeed('PAUSED')}
                className={`px-2 py-0.5 rounded text-[11px] ${simulationSpeed === 'PAUSED' ? 'bg-white shadow-xs text-rose-700' : 'text-slate-600'}`}
              >
                Pause
              </button>
            </div>

            {/* Crossover Turnout Switch */}
            <button
              type="button"
              onClick={() => {
                setSwitchState((prev) => (prev === 'MAIN' ? 'LOOP1' : prev === 'LOOP1' ? 'LOOP2' : 'MAIN'));
              }}
              className="text-xs font-bold px-3 py-1.5 bg-irctc-blue text-white rounded-lg shadow-sm hover:bg-irctc-blue-dark transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Split className="w-3.5 h-3.5 text-amber-300" />
              <span>Turnout Route: {switchState}</span>
            </button>
          </div>
        </div>

        {/* Dynamic Collision / Overlap / Fog Warning Banner */}
        <div className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 ${overlapConflict.color}`}>
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span className="text-xs font-bold leading-tight">{overlapConflict.text}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {fogLevel !== 'CLEAR' && (
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-amber-200 text-amber-950 rounded font-black border border-amber-300 flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-amber-900 animate-pulse" />
                FOG-PASS DETONATOR: 270m
              </span>
            )}
            <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 bg-white/90 text-slate-900 rounded font-black border border-slate-300 shadow-2xs">
              SAFETY INTERLOCK: ACTIVE
            </span>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* BIGGER EXPANDED TRACK TOPOLOGY SCHEMATIC (Height 520px)        */}
        {/* EXCLUSIVELY CUSTOMIZED FOR AGENT SMITA (Rolling Stock & Route) */}
        {/* ------------------------------------------------------------- */}
        <div className="relative w-full h-[520px] bg-[#070c19] rounded-xl p-3 sm:p-4 border border-slate-800 overflow-hidden shadow-2xl font-mono select-none">
          {/* Fog Effect Layer when Fog is Moderate or Dense */}
          {fogLevel !== 'CLEAR' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: fogLevel === 'DENSE' ? 0.75 : 0.45 }}
              className="absolute inset-0 bg-gradient-to-b from-slate-200/40 via-slate-300/50 to-slate-200/40 pointer-events-none z-20 backdrop-blur-[2.5px] flex flex-col justify-between p-4"
            >
              <div className="flex items-center justify-between text-slate-900 font-sans font-black text-xs bg-white/85 px-3 py-1 rounded-full shadow-sm max-w-fit">
                <CloudFog className="w-4 h-4 text-amber-600 animate-pulse mr-1.5" />
                <span>
                  {fogLevel === 'DENSE' ? 'CRITICAL FOG MIST BLINDING SIGNAL SIGHTING (<50m)' : 'MODERATE FOG RESTRICTION (MPS CAPPED 60 km/h)'}
                </span>
              </div>
              <div className="text-right text-[10px] font-bold text-slate-900 bg-white/85 px-2.5 py-1 rounded max-w-fit ml-auto">
                Automatic Train Protection Enforcing Emergency Braking Profile
              </div>
            </motion.div>
          )}

          <svg className="w-full h-full" viewBox="0 0 1060 460" fill="none">
            {/* Dark Technical Background Grid */}
            <defs>
              <pattern id="trackGrid" width="25" height="25" patternUnits="userSpaceOnUse">
                <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#172554" strokeWidth="0.5" strokeOpacity="0.45" />
              </pattern>
            </defs>
            <rect width="1060" height="460" fill="url(#trackGrid)" />

            {/* BLOCK BOUNDARY SEPARATORS (Block 1, 2, 3, 4) */}
            <line x1="290" y1="36" x2="290" y2="435" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.6" />
            <line x1="560" y1="36" x2="560" y2="435" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.6" />
            <line x1="820" y1="36" x2="820" y2="435" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.6" />

            {/* Block Zone Header Badges at Top (Clear, Non-Overlapping Pills at Y=6 to Y=26) */}
            <g transform="translate(140, 6)">
              <rect width="144" height="20" rx="4" fill="#0b1329" stroke="#38bdf8" strokeWidth="1.2" />
              <text x="72" y="14" textAnchor="middle" fill="#7dd3fc" fontSize="8.5" fontWeight="bold">BLOCK 1: Advance Starter</text>
            </g>
            <g transform="translate(300, 6)">
              <rect width="150" height="20" rx="4" fill="#0b1329" stroke="#6366f1" strokeWidth="1.2" />
              <text x="75" y="14" textAnchor="middle" fill="#c7d2fe" fontSize="8.5" fontWeight="bold">BLOCK 2: Intermediate (IBS)</text>
            </g>
            <g transform="translate(570, 6)">
              <rect width="150" height="20" rx="4" fill="#0b1329" stroke="#f59e0b" strokeWidth="1.2" />
              <text x="75" y="14" textAnchor="middle" fill="#fde68a" fontSize="8.5" fontWeight="bold">BLOCK 3: Station Approach</text>
            </g>
            <g transform="translate(830, 6)">
              <rect width="160" height="20" rx="4" fill="#0b1329" stroke="#ef4444" strokeWidth="1.2" />
              <text x="80" y="14" textAnchor="middle" fill="#fca5a5" fontSize="8.5" fontWeight="bold">BLOCK 4: Platform Entry/Starter</text>
            </g>

            {/* ============================================================= */}
            {/* 6 TRACK CORRIDORS (FULL SMITA EXPANDED TOPOLOGY)              */}
            {/* ============================================================= */}

            {/* TRACK 1: Up Main Line (130 km/h MPS) */}
            <g transform="translate(12, 86)">
              <rect width="122" height="28" rx="4" fill="#0b1329" stroke="#38bdf8" strokeWidth="1.2" />
              <text x="10" y="12" fill="#38bdf8" fontSize="8.5" fontWeight="bold">LINE 1: UP MAIN</text>
              <text x="10" y="22" fill="#94a3b8" fontSize="7">130 km/h MPS Fast</text>
            </g>
            <line x1="140" y1="98" x2="1040" y2="98" stroke="#334155" strokeWidth="6" strokeDasharray="5 4" />
            <line x1="140" y1="100" x2="1040" y2="100" stroke={switchState === 'MAIN' ? '#38bdf8' : '#475569'} strokeWidth="3" />

            {/* TRACK 2: Up Loop Line 1 (Platform 1 Concourse - 50 km/h) */}
            <g transform="translate(12, 146)">
              <rect width="122" height="28" rx="4" fill="#0b1329" stroke="#fbbf24" strokeWidth="1.2" />
              <text x="10" y="12" fill="#fbbf24" fontSize="8.5" fontWeight="bold">LINE 2: UP LOOP 1</text>
              <text x="10" y="22" fill="#94a3b8" fontSize="7">PF 1 (50 km/h Turnout)</text>
            </g>
            <line x1="140" y1="158" x2="1040" y2="158" stroke="#334155" strokeWidth="6" strokeDasharray="5 4" />
            <line x1="140" y1="160" x2="1040" y2="160" stroke={switchState === 'LOOP1' ? '#fbbf24' : '#475569'} strokeWidth="3" />
            {/* Platform 1 Concourse Graphic */}
            <rect x="580" y="144" width="220" height="11" rx="2" fill="#1e3a8a" fillOpacity="0.4" stroke="#3b82f6" strokeWidth="1" />
            <text x="690" y="152" textAnchor="middle" fill="#93c5fd" fontSize="7" fontWeight="bold">PLATFORM 1 CONCOURSE (24-COACH BERTH)</text>

            {/* TRACK 3: Central Reversible Loop (Platform 2 - 30 km/h) */}
            <g transform="translate(12, 206)">
              <rect width="122" height="28" rx="4" fill="#0b1329" stroke="#fb792b" strokeWidth="1.2" />
              <text x="10" y="12" fill="#fb792b" fontSize="8.5" fontWeight="bold">LINE 3: REVERSIBLE</text>
              <text x="10" y="22" fill="#94a3b8" fontSize="7">PF 2 Bi-Dir (30 km/h)</text>
            </g>
            <line x1="140" y1="218" x2="1040" y2="218" stroke="#334155" strokeWidth="6" strokeDasharray="5 4" />
            <line x1="140" y1="220" x2="1040" y2="220" stroke={switchState === 'LOOP2' ? '#fb792b' : '#334155'} strokeWidth="3" />
            {/* Platform 2 Island Concourse Graphic */}
            <rect x="580" y="224" width="220" height="11" rx="2" fill="#7c2d12" fillOpacity="0.4" stroke="#f97316" strokeWidth="1" />
            <text x="690" y="232" textAnchor="middle" fill="#fdba74" fontSize="7" fontWeight="bold">PLATFORM 2 ISLAND CONCOURSE (SPLIT DOCK)</text>

            {/* TRACK 4: Down Fast Main Line (130 km/h MPS) */}
            <g transform="translate(12, 266)">
              <rect width="122" height="28" rx="4" fill="#0b1329" stroke="#34d399" strokeWidth="1.2" />
              <text x="10" y="12" fill="#34d399" fontSize="8.5" fontWeight="bold">LINE 4: DOWN MAIN</text>
              <text x="10" y="22" fill="#94a3b8" fontSize="7">130 km/h MPS Down</text>
            </g>
            <line x1="140" y1="278" x2="1040" y2="278" stroke="#334155" strokeWidth="6" strokeDasharray="5 4" />
            <line x1="140" y1="280" x2="1040" y2="280" stroke="#10b981" strokeWidth="3" />

            {/* TRACK 5: Down Loop Line 2 (Platform 3 Concourse - 50 km/h) */}
            <g transform="translate(12, 326)">
              <rect width="122" height="28" rx="4" fill="#0b1329" stroke="#a78bfa" strokeWidth="1.2" />
              <text x="10" y="12" fill="#a78bfa" fontSize="8.5" fontWeight="bold">LINE 5: DOWN LOOP</text>
              <text x="10" y="22" fill="#94a3b8" fontSize="7">PF 3 Loop (50 km/h)</text>
            </g>
            <line x1="140" y1="338" x2="1040" y2="338" stroke="#334155" strokeWidth="6" strokeDasharray="5 4" />
            <line x1="140" y1="340" x2="1040" y2="340" stroke="#8b5cf6" strokeWidth="3" />
            {/* Platform 3 Concourse Graphic */}
            <rect x="580" y="344" width="220" height="11" rx="2" fill="#581c87" fillOpacity="0.4" stroke="#a855f7" strokeWidth="1" />
            <text x="690" y="352" textAnchor="middle" fill="#e9d5ff" fontSize="7" fontWeight="bold">PLATFORM 3 CONCOURSE (SUBURBAN COMMUTER)</text>

            {/* TRACK 6: Goods Siding & Marshalling Yard (15 km/h) */}
            <g transform="translate(12, 386)">
              <rect width="122" height="28" rx="4" fill="#0b1329" stroke="#94a3b8" strokeWidth="1.2" />
              <text x="10" y="12" fill="#e2e8f0" fontSize="8.5" fontWeight="bold">LINE 6: GOODS SIDING</text>
              <text x="10" y="22" fill="#94a3b8" fontSize="7">Marshalling Yard (15 km/h)</text>
            </g>
            <line x1="280" y1="398" x2="940" y2="398" stroke="#334155" strokeWidth="6" strokeDasharray="5 4" />
            <line x1="280" y1="400" x2="940" y2="400" stroke="#64748b" strokeWidth="3" />
            {/* Siding Dead-End Buffer Stop */}
            <line x1="940" y1="390" x2="940" y2="410" stroke="#ef4444" strokeWidth="4" />
            <rect x="942" y="393" width="10" height="14" fill="#dc2626" rx="2" />
            <text x="958" y="403" fill="#f87171" fontSize="7" fontWeight="bold">BUFFER STOP</text>

            {/* ============================================================= */}
            {/* TURNOUT TURNING POINTS & SCISSOR CROSSOVERS                   */}
            {/* ============================================================= */}
            {/* Turnout 1: Main (Line 1) to Loop 1 (Line 2) */}
            <line
              x1="320"
              y1="100"
              x2="410"
              y2="160"
              stroke={switchState === 'LOOP1' ? '#fbbf24' : '#475569'}
              strokeWidth="3"
              strokeDasharray={switchState === 'LOOP1' ? 'none' : '4 4'}
            />
            {/* Turnout 2: Loop 1 (Line 2) to Reversible (Line 3) */}
            <line
              x1="440"
              y1="160"
              x2="530"
              y2="220"
              stroke={switchState === 'LOOP2' ? '#fb792b' : '#334155'}
              strokeWidth="3"
              strokeDasharray={switchState === 'LOOP2' ? 'none' : '4 4'}
            />
            {/* Turnout 3: Scissor Crossover Down Main to Reversible */}
            <line
              x1="760"
              y1="280"
              x2="670"
              y2="220"
              stroke="#059669"
              strokeWidth="2.5"
              strokeDasharray="4 4"
            />
            {/* Turnout 4: Down Main to Down Loop 2 */}
            <line
              x1="430"
              y1="280"
              x2="520"
              y2="340"
              stroke="#8b5cf6"
              strokeWidth="2.5"
              strokeDasharray="4 4"
            />
            {/* Turnout 5: Down Loop to Goods Siding */}
            <line
              x1="280"
              y1="340"
              x2="350"
              y2="400"
              stroke="#64748b"
              strokeWidth="2.5"
              strokeDasharray="4 4"
            />

            {/* ============================================================= */}
            {/* OVERLAP SAFETY BUFFER (180m) - CLEARLY POSITIONED NON-COLLIDING */}
            {/* ============================================================= */}
            <rect x="710" y="86" width="130" height="28" rx="4" fill="#f59e0b" fillOpacity="0.12" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" />
            <g transform="translate(715, 68)">
              <rect width="120" height="15" rx="3" fill="#0b1329" stroke="#f59e0b" strokeWidth="1" />
              <text x="60" y="11" textAnchor="middle" fill="#fbbf24" fontSize="7.5" fontWeight="bold">SAFETY OVERLAP (180m)</text>
            </g>

            {/* FOG DETONATOR AUDIO WARNING MARKER (placed 270m before S-105) */}
            {fogLevel !== 'CLEAR' && (
              <g transform="translate(540, 88)">
                <circle cx="0" cy="12" r="5" fill="#ef4444" className="animate-ping" />
                <circle cx="0" cy="12" r="4" fill="#dc2626" />
                <g transform="translate(-36, -6)">
                  <rect width="72" height="14" rx="3" fill="#0b1329" stroke="#ef4444" strokeWidth="1" />
                  <text x="36" y="10" textAnchor="middle" fill="#fca5a5" fontSize="7.5" fontWeight="bold">DETONATOR (270m)</text>
                </g>
              </g>
            )}

            {/* ============================================================= */}
            {/* 4 CORRELATED SIGNALS (LINE 1) - SPATIOUS, NON-COLLIDING       */}
            {/* ============================================================= */}
            {correlatedSignals.map((sig, i) => {
              // Placed at X: 210, 440, 680, 970
              const xPos = [210, 440, 680, 970][i] || (210 + i * 240);
              const isGreen = sig.aspect === 'GREEN';
              const isDoubleYellow = sig.aspect === 'DOUBLE_YELLOW';
              const isYellow = sig.aspect === 'YELLOW';
              const isRed = sig.aspect === 'RED';
              const isSelected = selectedSignalId === sig.id;

              return (
                <g
                  key={sig.id}
                  transform={`translate(${xPos}, 72)`}
                  onClick={() => setSelectedSignalId(sig.id)}
                  className="cursor-pointer group"
                >
                  {/* Selection Ring (Confined to signal head, never touches top badges) */}
                  {isSelected && (
                    <>
                      <circle cx="0" cy="-17" r="19" stroke="#38bdf8" strokeWidth="1.5" fill="none" className="animate-ping" strokeDasharray="3 3" opacity="0.6" />
                      <circle cx="0" cy="-17" r="16" stroke="#0284c7" strokeWidth="1.5" fill="none" opacity="0.8" />
                    </>
                  )}

                  {/* Signal Mast Post extending cleanly from head down to rail at Y=100 */}
                  <line x1="0" y1="0" x2="0" y2="28" stroke={isSelected ? '#38bdf8' : '#94a3b8'} strokeWidth={isSelected ? 3 : 2.5} />

                  {/* Signal Head Housing (Top is at Y = 72 - 34 = 38, leaving 12px clean clearance below Block Badges) */}
                  <rect x="-8" y="-34" width="16" height="34" rx="3" fill="#020617" stroke={isSelected ? '#38bdf8' : '#475569'} strokeWidth={isSelected ? 2 : 1} />

                  {/* 4 Aspect Lenses */}
                  {/* Top Yellow Lens */}
                  <circle cx="0" cy="-28" r="2.8" fill={isDoubleYellow ? '#fbbf24' : '#1e293b'} />
                  {/* Green Lens */}
                  <circle cx="0" cy="-20" r="2.8" fill={isGreen ? '#22c55e' : '#1e293b'} />
                  {/* Red Lens */}
                  <circle cx="0" cy="-12" r="2.8" fill={isRed ? '#ef4444' : '#1e293b'} />
                  {/* Bottom Yellow Lens */}
                  <circle cx="0" cy="-4" r="2.8" fill={(isYellow || isDoubleYellow) ? '#fbbf24' : '#1e293b'} />

                  {/* Signal ID Badge: Mounted on the Mast Post below head (No collision with top block text!) */}
                  <g transform="translate(-18, 6)">
                    <rect width="36" height="15" rx="3" fill="#020617" stroke={isSelected ? '#38bdf8' : '#475569'} strokeWidth="1.2" />
                    <text x="18" y="11" textAnchor="middle" fill={isSelected ? '#38bdf8' : '#f8fafc'} fontSize="8.5" fontWeight="900">{sig.id}</text>
                  </g>

                  {/* Distance / Km pill placed cleanly below the track rail */}
                  <g transform="translate(-16, 36)">
                    <rect width="32" height="13" rx="2" fill="#0b1329" stroke="#334155" strokeWidth="0.8" />
                    <text x="16" y="9.5" textAnchor="middle" fill={isSelected ? '#38bdf8' : '#94a3b8'} fontSize="7" fontWeight="bold">{sig.km}</text>
                  </g>

                  {/* Live Approach Distance Label when selected: Placed beside mast ID */}
                  {isSelected && (
                    <g transform="translate(22, 6)">
                      <rect width="76" height="15" rx="3" fill="#0284c7" stroke="#38bdf8" strokeWidth="1" />
                      <text x="38" y="11" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">
                        {sig.approachText}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* ============================================================= */}
            {/* LOOP & SIDING SECONDARY SIGNALS (MAKES SCHEMATIC COMPLETE)    */}
            {/* ============================================================= */}
            {/* S-105L: Platform 1 Loop Starter */}
            <g transform="translate(815, 140)">
              <line x1="0" y1="0" x2="0" y2="20" stroke="#94a3b8" strokeWidth="2" />
              <rect x="-6" y="-22" width="12" height="22" rx="2" fill="#020617" stroke="#475569" strokeWidth="1" />
              <circle cx="0" cy="-16" r="2.5" fill="#22c55e" />
              <circle cx="0" cy="-10" r="2.5" fill="#ef4444" opacity="0.3" />
              <circle cx="0" cy="-4" r="2.5" fill="#fbbf24" opacity="0.3" />
              <rect x="-14" y="-34" width="28" height="10" rx="2" fill="#0b1329" stroke="#334155" />
              <text x="0" y="-26" textAnchor="middle" fill="#fbbf24" fontSize="6.5" fontWeight="bold">S-105L</text>
            </g>

            {/* S-105R: Platform 2 Reversible Starter */}
            <g transform="translate(815, 200)">
              <line x1="0" y1="0" x2="0" y2="20" stroke="#94a3b8" strokeWidth="2" />
              <rect x="-6" y="-22" width="12" height="22" rx="2" fill="#020617" stroke="#475569" strokeWidth="1" />
              <circle cx="0" cy="-16" r="2.5" fill="#fbbf24" />
              <circle cx="0" cy="-10" r="2.5" fill="#ef4444" opacity="0.3" />
              <circle cx="0" cy="-4" r="2.5" fill="#22c55e" opacity="0.3" />
              <rect x="-14" y="-34" width="28" height="10" rx="2" fill="#0b1329" stroke="#334155" />
              <text x="0" y="-26" textAnchor="middle" fill="#fb792b" fontSize="6.5" fontWeight="bold">S-105R</text>
            </g>

            {/* S-108D: Down Home Signal (Facing Down Train) */}
            <g transform="translate(480, 260)">
              <line x1="0" y1="0" x2="0" y2="20" stroke="#94a3b8" strokeWidth="2" />
              <rect x="-6" y="-22" width="12" height="22" rx="2" fill="#020617" stroke="#475569" strokeWidth="1" />
              <circle cx="0" cy="-16" r="2.5" fill="#22c55e" />
              <circle cx="0" cy="-10" r="2.5" fill="#ef4444" opacity="0.3" />
              <circle cx="0" cy="-4" r="2.5" fill="#fbbf24" opacity="0.3" />
              <rect x="-14" y="-34" width="28" height="10" rx="2" fill="#0b1329" stroke="#334155" />
              <text x="0" y="-26" textAnchor="middle" fill="#34d399" fontSize="6.5" fontWeight="bold">S-108D</text>
            </g>

            {/* SH-12: Goods Siding Shunt Signal */}
            <g transform="translate(380, 395)">
              <circle cx="0" cy="0" r="6" fill="#020617" stroke="#64748b" strokeWidth="1" />
              <circle cx="-2" cy="-1" r="1.5" fill="#ffffff" />
              <circle cx="2" cy="1" r="1.5" fill="#ffffff" />
              <text x="0" y="-9" textAnchor="middle" fill="#94a3b8" fontSize="6" fontWeight="bold">SH-12</text>
            </g>

            {/* ============================================================= */}
            {/* TRAINS WITH SMART ANTI-COLLISION OFFSET BADGE SYSTEM          */}
            {/* ============================================================= */}

            {/* TRAIN 2: Preceding Train on Up Main (Red Hazard) */}
            {(() => {
              const precedingPixelX = 160 + (precedingTrainPos / 100) * 780;
              return (
                <g transform={`translate(${precedingPixelX}, 100)`}>
                  {/* Preceding Train Loco Body */}
                  <rect x="0" y="-10" width="70" height="20" rx="4" fill="#dc2626" stroke="#fca5a5" strokeWidth="2" />
                  <text x="6" y="4" fill="#ffffff" fontSize="8.5" fontWeight="bold">12919 PRE</text>
                  <circle cx="61" cy="0" r="3" fill="#f87171" />
                  <polygon points="70,-4 76,0 70,4" fill="#f87171" />
                  {/* Preceding Tag Pill (Always ABOVE track) */}
                  <g transform="translate(0, -26)">
                    <rect width="66" height="13" rx="2" fill="#7f1d1d" stroke="#f87171" strokeWidth="0.8" />
                    <text x="33" y="9.5" textAnchor="middle" fill="#fecaca" fontSize="7" fontWeight="bold">PRECEDING</text>
                  </g>
                </g>
              );
            })()}

            {/* TRAIN 1: Target Active Train (Blue Locomotive) */}
            {(() => {
              const targetY = switchState === 'MAIN' ? 100 : (switchState === 'LOOP1' ? 160 : 220);
              const trainPixelX = 160 + (trainPosition / 100) * 780;
              const precedingPixelX = 160 + (precedingTrainPos / 100) * 780;
              // Detect if target train is closely behind preceding train on same track
              const isHeadwayTight = switchState === 'MAIN' && Math.abs(precedingPixelX - trainPixelX) < 115;

              return (
                <g transform={`translate(${trainPixelX}, ${targetY})`}>
                  {/* Loco Body */}
                  <rect x="0" y="-10" width="72" height="20" rx="4" fill="#1d4ed8" stroke="#60a5fa" strokeWidth="2" />
                  <text x="7" y="4" fill="#ffffff" fontSize="9" fontWeight="900">{pageTrainNo}</text>
                  <circle cx="63" cy="0" r="3.5" fill="#38bdf8" className="animate-pulse" />
                  <polygon points="72,-4 78,0 72,4" fill="#38bdf8" />

                  {/* Target Train Tag: If tight headway, render BELOW track with pointer, else ABOVE track */}
                  {isHeadwayTight ? (
                    <g transform="translate(0, 14)">
                      {/* Pointer line pointing to train */}
                      <line x1="16" y1="-4" x2="16" y2="0" stroke="#38bdf8" strokeWidth="1.5" />
                      <rect width="72" height="14" rx="2" fill="#1e3a8a" stroke="#38bdf8" strokeWidth="1" />
                      <text x="36" y="10" textAnchor="middle" fill="#93c5fd" fontSize="7" fontWeight="bold">TARGET TRAIN</text>
                    </g>
                  ) : (
                    <g transform="translate(0, -26)">
                      <rect width="72" height="13" rx="2" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="0.8" />
                      <text x="36" y="9.5" textAnchor="middle" fill="#bfdbfe" fontSize="7" fontWeight="bold">TARGET TRAIN</text>
                    </g>
                  )}
                </g>
              );
            })()}

            {/* TRAIN 3: Opposing Down Train on Down Main (Line 4) */}
            <g transform="translate(620, 280)">
              <rect x="0" y="-10" width="72" height="20" rx="4" fill="#059669" stroke="#6ee7b7" strokeWidth="2" />
              <text x="8" y="4" fill="#ffffff" fontSize="8.5" fontWeight="bold">12951 DN</text>
              <polygon points="0,-4 -6,0 0,4" fill="#34d399" />
              <g transform="translate(0, -25)">
                <rect width="72" height="12" rx="2" fill="#064e3b" stroke="#34d399" strokeWidth="0.8" />
                <text x="36" y="9" textAnchor="middle" fill="#a7f3d0" fontSize="7" fontWeight="bold">OPPOSING DN</text>
              </g>
            </g>

            {/* TRAIN 4: Stabled Freight Rake on Goods Siding (Line 6) */}
            <g transform="translate(560, 400)">
              <rect x="0" y="-8" width="130" height="16" rx="2" fill="#334155" stroke="#64748b" strokeWidth="1.5" />
              <text x="65" y="4" textAnchor="middle" fill="#e2e8f0" fontSize="7.5" fontWeight="bold">GOODS RAKE (BCNHL 58-W)</text>
              <g transform="translate(25, -20)">
                <rect width="80" height="11" rx="2" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
                <text x="40" y="8" textAnchor="middle" fill="#94a3b8" fontSize="6.5" fontWeight="bold">STABLED FREIGHT</text>
              </g>
            </g>
          </svg>

          {/* Bottom HUD inside schematic */}
          <div className="absolute bottom-2 left-3 right-3 sm:left-4 sm:right-4 flex flex-wrap items-center justify-between text-xs text-slate-300 bg-slate-900/95 px-3 py-1.5 rounded-lg border border-slate-700 backdrop-blur-md">
            <span className="flex items-center gap-2 text-sky-300 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
              Active Route: {switchState === 'MAIN' ? 'Line 1 Up Main Straight (130 km/h)' : `Diverted to Line ${switchState === 'LOOP1' ? '2 (Loop 1)' : '3 (Loop 2)'} (Turnout Active)`}
            </span>
            <span className="font-mono text-slate-300 text-[11px]">
              Target #{pageTrainNo}: {trainPosition.toFixed(0)}% • Preceding #12919: {precedingTrainPos.toFixed(0)}% • Headway Spacing: {Math.abs(precedingTrainPos - trainPosition).toFixed(1)}%
            </span>
          </div>
        </div>


        {/* ------------------------------------------------------------- */}
        {/* CORRELATED 4-ASPECT SIGNAL DETAILS WITH LIVE TELEMETRY SUITE  */}
        {/* ------------------------------------------------------------- */}
        <div className="pt-2 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between text-xs px-1">
            <span className="font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 text-[11px]">
              <Radio className="w-3.5 h-3.5 text-irctc-blue animate-pulse" />
              Real-Time Signal Telemetry &amp; Aspect Interlocking
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 font-medium">Click card or mast to inspect / override:</span>
              {Object.values(signalOverrides).some((v) => v !== 'AUTO') && (
                <button
                  type="button"
                  onClick={() =>
                    setSignalOverrides({
                      'S-101': 'AUTO',
                      'S-103': 'AUTO',
                      'S-105': 'AUTO',
                      'S-107': 'AUTO',
                    })
                  }
                  className="text-[10px] font-bold text-irctc-orange hover:underline cursor-pointer"
                >
                  Reset Overrides
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
            {correlatedSignals.map((sig) => {
              const isGreen = sig.aspect === 'GREEN';
              const isDoubleYellow = sig.aspect === 'DOUBLE_YELLOW';
              const isYellow = sig.aspect === 'YELLOW';
              const isRed = sig.aspect === 'RED';
              const isSelected = selectedSignalId === sig.id;

              return (
                <div
                  key={sig.id}
                  onClick={() => setSelectedSignalId(sig.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-white border-irctc-blue ring-2 ring-irctc-blue/40 shadow-lg'
                      : isRed
                      ? 'bg-rose-50/70 border-rose-300 hover:shadow-md'
                      : isYellow || isDoubleYellow
                      ? 'bg-amber-50/70 border-amber-300 hover:shadow-md'
                      : 'bg-emerald-50/60 border-emerald-300 hover:shadow-md'
                  }`}
                >
                  {/* Selected / Overridden Indicator Badges */}
                  <div className="flex items-center justify-between text-xs mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-900 font-black text-sm">{sig.id}</span>
                      {isSelected && (
                        <span className="text-[9px] bg-irctc-blue text-white font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                          INSPECT
                        </span>
                      )}
                      {sig.isOverridden && (
                        <span className="text-[9px] bg-amber-500 text-white font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                          MANUAL
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-500">{sig.km}</span>
                  </div>

                  {/* Main Row: Realistic 4-Aspect Signal Head Graphic + Info */}
                  <div className="flex items-start gap-3">
                    {/* Realistic 4-Aspect Signal Housing */}
                    <div className="flex flex-col items-center justify-center bg-slate-950 p-1.5 rounded-lg border border-slate-700 shadow-inner w-7 gap-1 shrink-0">
                      {/* Lens 1: Top Yellow */}
                      <div
                        className={`w-3.5 h-3.5 rounded-full border transition-all ${
                          isDoubleYellow
                            ? 'bg-amber-400 border-amber-300 shadow-[0_0_12px_#f59e0b]'
                            : 'bg-slate-900 border-slate-800'
                        }`}
                      />
                      {/* Lens 2: Green */}
                      <div
                        className={`w-3.5 h-3.5 rounded-full border transition-all ${
                          isGreen
                            ? 'bg-emerald-400 border-emerald-300 shadow-[0_0_12px_#10b981]'
                            : 'bg-slate-900 border-slate-800'
                        }`}
                      />
                      {/* Lens 3: Red */}
                      <div
                        className={`w-3.5 h-3.5 rounded-full border transition-all ${
                          isRed
                            ? 'bg-rose-500 border-rose-400 shadow-[0_0_14px_#f43f5e] animate-pulse'
                            : 'bg-slate-900 border-slate-800'
                        }`}
                      />
                      {/* Lens 4: Bottom Yellow */}
                      <div
                        className={`w-3.5 h-3.5 rounded-full border transition-all ${
                          isYellow || isDoubleYellow
                            ? 'bg-amber-400 border-amber-300 shadow-[0_0_12px_#f59e0b]'
                            : 'bg-slate-900 border-slate-800'
                        }`}
                      />
                    </div>

                    {/* Signal Info */}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 truncate" title={sig.name}>
                        {sig.name}
                      </div>

                      {/* Aspect Badge */}
                      <div className="mt-1">
                        <span
                          className={`text-[10px] font-mono font-black py-0.5 px-2 rounded-full inline-block ${
                            isGreen
                              ? 'bg-emerald-600 text-white'
                              : isDoubleYellow
                              ? 'bg-amber-500 text-white'
                              : isYellow
                              ? 'bg-amber-600 text-white'
                              : 'bg-rose-600 text-white animate-pulse'
                          }`}
                        >
                          {sig.aspect}
                        </span>
                      </div>

                      <div className="text-[11px] font-bold text-slate-800 mt-1">
                        Cap: <span className="font-mono text-irctc-blue">{sig.speed}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-600 mt-2 font-medium line-clamp-1" title={sig.meaning}>
                    {sig.meaning}
                  </div>

                  {/* Telemetry Strip */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/80 space-y-1 text-[10px] font-mono">
                    {/* Track Circuit Voltage & Shunt */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">{sig.tcName}:</span>
                      <span
                        className={`font-bold px-1.5 py-0.2 rounded ${
                          sig.isTcOccupied
                            ? 'bg-rose-100 text-rose-800 font-black'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {sig.isTcOccupied ? `OCCUPIED • ${sig.tcVoltage}` : `CLEAR • ${sig.tcVoltage}`}
                      </span>
                    </div>

                    {/* Proximity / Distance to Target Train */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">Approach:</span>
                      <span className="font-bold text-slate-800">{sig.approachText}</span>
                    </div>

                    {/* Live ETA */}
                    {sig.deltaMeters > 0 && (
                      <div className="flex items-center justify-between text-slate-500">
                        <span>ETA at Speed:</span>
                        <span className="font-bold text-irctc-blue">~{sig.etaSeconds}s</span>
                      </div>
                    )}
                  </div>

                  {/* Interactive Dispatcher Aspect Override Toolbar */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between gap-1">
                    <span className="text-[9px] uppercase font-bold text-slate-400">Override:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        title="Auto Telemetry"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSignalOverrides((prev) => ({ ...prev, [sig.id]: 'AUTO' }));
                        }}
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded cursor-pointer ${
                          !sig.isOverridden
                            ? 'bg-slate-800 text-white'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        AUTO
                      </button>
                      <button
                        type="button"
                        title="Force Green"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSignalOverrides((prev) => ({ ...prev, [sig.id]: 'GREEN' }));
                        }}
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded cursor-pointer ${
                          sig.isOverridden && isGreen
                            ? 'bg-emerald-600 text-white ring-1 ring-emerald-400'
                            : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        }`}
                      >
                        G
                      </button>
                      <button
                        type="button"
                        title="Force Double Yellow"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSignalOverrides((prev) => ({ ...prev, [sig.id]: 'DOUBLE_YELLOW' }));
                        }}
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded cursor-pointer ${
                          sig.isOverridden && isDoubleYellow
                            ? 'bg-amber-500 text-white ring-1 ring-amber-400'
                            : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        }`}
                      >
                        DY
                      </button>
                      <button
                        type="button"
                        title="Force Yellow"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSignalOverrides((prev) => ({ ...prev, [sig.id]: 'YELLOW' }));
                        }}
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded cursor-pointer ${
                          sig.isOverridden && isYellow
                            ? 'bg-amber-600 text-white ring-1 ring-amber-500'
                            : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        }`}
                      >
                        Y
                      </button>
                      <button
                        type="button"
                        title="Force Red"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSignalOverrides((prev) => ({ ...prev, [sig.id]: 'RED' }));
                        }}
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded cursor-pointer ${
                          sig.isOverridden && isRed
                            ? 'bg-rose-600 text-white ring-1 ring-rose-400'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                        }`}
                      >
                        R
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SECTION 2: 4 NAMED AI AGENTS & PARAMETRIC QUESTION SYSTEM     */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Named Agents Selector & Parametric Questions */}
        <div className="lg:col-span-5 space-y-5">
          {/* Active AI Agent Card */}
          <div className="rounded-xl p-4 bg-white shadow-sm border border-slate-200">
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-200">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-irctc-blue" />
                Active AI Agent
              </span>
              <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                DTRS Officer
              </span>
            </div>

            {/* Individual assistant selector division commented out as requested */}
            {/*
            <div className="grid grid-cols-2 gap-2.5 mb-3">
              {AGENTS.map((agent) => {
                const isSelected = selectedAgent === agent.id;
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => handleSelectAgent(agent.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      isSelected
                        ? `${agent.accentBg} ${agent.borderColor} ring-2 ring-irctc-blue/30 shadow-md`
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 shadow-2xs ${agent.letterBg}`}>
                      {agent.letter}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-900 leading-tight">
                        {agent.name}
                      </div>
                      <div className="text-[10px] text-slate-600 font-semibold mt-0.5 truncate">
                        {agent.role}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            */}

            {/* Active Agent Profile Banner */}
            <div className={`p-3 rounded-xl border ${currentAgent.accentBg} ${currentAgent.borderColor} flex items-center gap-3`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-base shadow-xs shrink-0 ${currentAgent.letterBg}`}>
                {currentAgent.letter}
              </div>
              <div className="min-w-0">
                <div className="font-black text-slate-900 text-xs flex items-center gap-2">
                  <span>Agent {currentAgent.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${currentAgent.badgeBg}`}>
                    {currentAgent.role}
                  </span>
                </div>
                <div className="text-xs text-slate-700 mt-0.5 leading-snug">
                  {currentAgent.description}
                </div>
              </div>
            </div>
          </div>

          {/* Parametric Question Builder (1 or 2 Variables) */}
          <div className="rounded-xl p-4 bg-white shadow-sm border border-slate-200">
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                  {currentAgent.name}&apos;s Scenario Scenarios
                </span>
              </div>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                1 or 2 Variables
              </span>
            </div>

            {/* Question Preset Buttons */}
            <div className="space-y-2 mb-3.5">
              {currentQuestions.map((q, idx) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setActiveQuestionIndex(idx)}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all flex items-center justify-between ${
                    activeQuestionIndex === idx
                      ? 'bg-irctc-blue text-white font-bold border-irctc-blue shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200 font-semibold'
                  }`}
                >
                  <span className="truncate pr-2">{q.title}</span>
                  <ChevronRight className={`w-4 h-4 shrink-0 ${activeQuestionIndex === idx ? 'text-amber-300' : 'text-slate-400'}`} />
                </button>
              ))}
            </div>

            {/* Active Question Prompt Display & Variable Dropdowns */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 mb-3.5 text-xs">
              <span className="font-extrabold text-slate-900 block mb-2 leading-snug text-xs sm:text-sm">
                &ldquo;{activeQuestion.prompt}&rdquo;
              </span>

              {/* Variable 1 & 2 Pickers - Stacked vertically for full visibility */}
              <div className="flex flex-col space-y-3 mt-2.5 pt-2.5 border-t border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Var 1: {activeQuestion.var1Label}
                  </label>
                  <select
                    value={var1Val}
                    onChange={(e) => setVar1Val(e.target.value)}
                    className="w-full bg-white text-slate-900 font-semibold text-xs py-2 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-irctc-blue cursor-pointer shadow-2xs"
                  >
                    {activeQuestion.var1Options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Var 2: {activeQuestion.var2Label}
                  </label>
                  <select
                    value={var2Val}
                    onChange={(e) => setVar2Val(e.target.value)}
                    className="w-full bg-white text-slate-900 font-semibold text-xs py-2 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-irctc-blue cursor-pointer shadow-2xs"
                  >
                    {activeQuestion.var2Options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Execute Analysis Action */}
            <button
              type="button"
              onClick={handleExecuteAnalysis}
              disabled={isSynthesizing}
              className="w-full bg-irctc-blue hover:bg-irctc-blue-dark text-white text-xs font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isSynthesizing ? 'animate-spin' : ''}`} />
              <span>{isSynthesizing ? `Agent ${currentAgent.name} is Computing...` : `Compute Dispatch Decision with ${currentAgent.name}`}</span>
            </button>
          </div>
        </div>

        {/* Right Column: AI Decision Directive & Detailed Deductions */}
        <div className="lg:col-span-7 space-y-5">
          {lastAnalysis && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-5 bg-white shadow-sm border border-slate-200 border-l-4 border-l-irctc-blue space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-irctc-orange" />
                  <div>
                    <span className="text-xs font-black uppercase text-slate-900 tracking-wider block">
                      Agent {lastAnalysis.agent.name}&apos;s Official Directive
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Evaluated for Train #{pageTrainNo} under live section constraints
                    </span>
                  </div>
                </div>
                <span className={`text-xs font-black px-3 py-1 rounded-full shadow-xs ${lastAnalysis.verdictClass}`}>
                  {lastAnalysis.verdict}
                </span>
              </div>

              {/* Primary & Secondary Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] uppercase font-bold text-slate-500 block truncate">
                    {lastAnalysis.primaryMetricTitle}
                  </span>
                  <span className="font-mono text-base font-black text-irctc-blue block mt-0.5">
                    {lastAnalysis.primaryMetricValue}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {lastAnalysis.primaryMetricSub}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] uppercase font-bold text-slate-500 block truncate">
                    {lastAnalysis.secondaryMetricTitle}
                  </span>
                  <span className="font-mono text-base font-black text-rose-700 block mt-0.5">
                    {lastAnalysis.secondaryMetricValue}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {lastAnalysis.secondaryMetricSub}
                  </span>
                </div>
              </div>

              {/* Chain of Thought Logic */}
              <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-xs font-black uppercase tracking-wider text-irctc-blue block">
                  {lastAnalysis.agent.name}&apos;s Step-by-Step Chain of Thought:
                </span>
                {lastAnalysis.chainOfThought.map((thought: string, i: number) => (
                  <div key={i} className="text-xs text-slate-800 flex items-start gap-2 leading-relaxed">
                    <span className="font-mono text-[10px] font-black text-irctc-blue bg-blue-100 px-1.5 py-0.2 rounded mt-0.5 shrink-0">
                      STEP {i + 1}
                    </span>
                    <span>{thought}</span>
                  </div>
                ))}
              </div>

              {/* Actionable Directives */}
              <div className="space-y-2 pt-1">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 block">
                  Mandated Section Action Orders:
                </span>
                <div className="space-y-1.5">
                  {lastAnalysis.recommendedDirectives.map((dir: string, i: number) => (
                    <div key={i} className="text-xs font-semibold text-slate-900 flex items-start gap-2 bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <span>{dir}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-mono gap-2">
                <span>Database Matched: {lastAnalysis.databaseCrossReference}</span>
                {/* <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Self-Computed (Zero API Keys)
                </span> */}
              </div>
            </motion.div>
          )}

          {/* ============================================================= */}
          {/* EXTENSIVE AI ASSISTANT SIMULATION & DYNAMIC GRAPHS CONSOLE     */}
          {/* ============================================================= */}
          {/* Specialized agent simulations are prominently showcased in Section 1 */}
          {false && (
          <div className="space-y-4">



            {/* 2. TRIPTI (T) - PLATFORM ASSISTANT SIMULATION */}
            {selectedAgent === 'platform' && (
              <div className="rounded-xl p-4 bg-white shadow-sm border border-slate-200 border-l-4 border-l-sky-500 space-y-4">
                <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200 gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-sky-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
                      T
                    </span>
                    <div>
                      <span className="text-xs font-black uppercase text-slate-900 tracking-wider block">
                        Agent Tripti &bull; Platform Assistant Simulation Console
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Terminal Dwell Gantt &bull; Inbound Outer Signal Holding &bull; Yard Turnaround
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-sky-100 text-sky-900 border border-sky-300 px-2.5 py-0.5 rounded-full">
                    SWR Station Operating Rules
                  </span>
                </div>

                {/* Simulation Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="font-bold text-slate-800 block mb-1.5">Terminal Station:</span>
                    <select
                      value={triptiStation}
                      onChange={(e) => setTriptiStation(e.target.value)}
                      className="w-full bg-white text-slate-900 font-semibold py-1.5 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-irctc-blue shadow-2xs"
                    >
                      <option value="NDLS">New Delhi (NDLS) &bull; 16 Platforms</option>
                      <option value="CNB">Kanpur Central (CNB) &bull; 10 Platforms</option>
                      <option value="NZM">Hazrat Nizamuddin (NZM) &bull; 7 Platforms</option>
                      <option value="BPL">Bhopal Jn (BPL) &bull; 6 Platforms</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5 font-bold text-slate-800">
                      <span>Platform 1 Dwell Delay:</span>
                      <span className="font-mono text-sky-800 font-black bg-sky-100 px-2 py-0.5 rounded border border-sky-200">
                        +{triptiDwellExtension} mins delay
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="45"
                      step="5"
                      value={triptiDwellExtension}
                      onChange={(e) => setTriptiDwellExtension(parseInt(e.target.value, 10))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                      <span>0m (On-Time)</span>
                      <span className="text-amber-700 font-bold">+15m Buffer Absorbed</span>
                      <span className="text-rose-700 font-bold">+45m Outer Hold</span>
                    </div>
                  </div>
                </div>

                {/* Platform Occupancy Gantt Chart Timeline */}
                <div className="p-3 bg-slate-900 rounded-xl text-white space-y-2 border border-slate-800">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold uppercase tracking-wider text-sky-400 text-[11px] flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5" />
                      Real-Time Platform Gantt Time-Block Timeline ({triptiStation})
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">10:00 - 12:30 IST Window</span>
                  </div>

                  {/* Gantt Timeline Visualizer */}
                  <div className="space-y-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs font-mono">
                    {/* Time Header */}
                    <div className="flex justify-between text-[10px] text-slate-400 border-b border-slate-800 pb-1 px-1">
                      <span className="w-12">Track</span>
                      <span>10:00</span>
                      <span>10:30</span>
                      <span>11:00</span>
                      <span>11:30</span>
                      <span>12:00</span>
                      <span>12:30</span>
                    </div>

                    {/* Platform Rows */}
                    {/* PF 1 - Active Train */}
                    <div className="flex items-center gap-2">
                      <span className="w-12 text-[11px] font-bold text-sky-400 shrink-0">PF 1</span>
                      <div className="flex-1 bg-slate-900 h-6 rounded relative overflow-hidden flex items-center">
                        <div
                          className="h-full bg-sky-600 rounded text-[10px] text-white font-bold flex items-center px-2 truncate transition-all duration-300"
                          style={{ width: `${Math.min(95, 30 + (triptiDwellExtension / 45) * 55)}%` }}
                        >
                          Train #{pageTrainNo} ({30 + triptiDwellExtension}m Dwell)
                        </div>
                        {triptiDwellExtension > 10 && (
                          <div className="absolute right-1 text-[9px] bg-rose-600 text-white px-1.5 py-0.5 rounded font-black animate-pulse">
                            CONFLICT +{triptiDwellExtension - 10}m
                          </div>
                        )}
                      </div>
                    </div>

                    {/* PF 2 - 12952 Rajdhani */}
                    <div className="flex items-center gap-2">
                      <span className="w-12 text-[11px] font-bold text-slate-400 shrink-0">PF 2</span>
                      <div className="flex-1 bg-slate-900 h-6 rounded relative overflow-hidden flex items-center">
                        <div className="h-full bg-emerald-600 rounded text-[10px] text-white font-bold flex items-center px-2 truncate w-[45%]">
                          12952 Rajdhani (10:15 - 10:45)
                        </div>
                      </div>
                    </div>

                    {/* PF 3 - 12919 Malwa Express */}
                    <div className="flex items-center gap-2">
                      <span className="w-12 text-[11px] font-bold text-slate-400 shrink-0">PF 3</span>
                      <div className="flex-1 bg-slate-900 h-6 rounded relative overflow-hidden flex items-center">
                        <div className="h-full bg-amber-600 rounded text-[10px] text-white font-bold flex items-center px-2 truncate ml-[25%] w-[55%]">
                          12919 Malwa Exp (Turnaround Rake Cleaning)
                        </div>
                      </div>
                    </div>

                    {/* PF 4 - Line Clear */}
                    <div className="flex items-center gap-2">
                      <span className="w-12 text-[11px] font-bold text-emerald-400 shrink-0">PF 4</span>
                      <div className="flex-1 bg-slate-900/60 h-6 rounded border border-dashed border-emerald-500/50 flex items-center px-2 text-[10px] text-emerald-400 font-bold">
                        LINE CLEAR &bull; AVAILABLE FOR INBOUND DIVERSION
                      </div>
                    </div>

                    {/* PF 5 - Stabled Freight */}
                    <div className="flex items-center gap-2">
                      <span className="w-12 text-[11px] font-bold text-slate-500 shrink-0">PF 5</span>
                      <div className="flex-1 bg-slate-900 h-6 rounded relative overflow-hidden flex items-center">
                        <div className="h-full bg-slate-700 rounded text-[10px] text-slate-300 font-bold flex items-center px-2 truncate w-[60%]">
                          BOXN Freight (Stabled &bull; Yard Shunting Active)
                        </div>
                      </div>
                    </div>
                  </div>

                  {triptiDwellExtension > 10 ? (
                    <div className="p-2 rounded bg-rose-950/80 border border-rose-500 text-xs text-rose-200 flex items-center gap-2">
                      <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>
                        <strong>Outer Signal Conflict Alert:</strong> Inbound Train #12424 Dibrugarh Rajdhani is held at Outer Home Signal ({triptiDwellExtension - 10}m detention) due to PF 1 lock.
                      </span>
                    </div>
                  ) : (
                    <div className="p-2 rounded bg-emerald-950/80 border border-emerald-500 text-xs text-emerald-200 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong>Clearance Buffers Nominal:</strong> Scheduled turnaround slack absorbs dwell without holding trailing inbound services.
                      </span>
                    </div>
                  )}
                </div>

                {/* Yard Turnaround & Platform Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Washing Pit Slot</span>
                    <span className="font-mono text-sm font-black text-slate-900 mt-0.5 block">180 Mins Req</span>
                    <span className="text-[10px] text-slate-500 font-medium">Secondary maintenance cycle</span>
                  </div>

                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Yard Lead Speed Limit</span>
                    <span className="font-mono text-sm font-black text-irctc-blue mt-0.5 block">15 km/h Max</span>
                    <span className="text-[10px] text-slate-500 font-medium">Shunting neck restriction</span>
                  </div>

                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Outer Stoppage Risk</span>
                    <span className={`font-mono text-sm font-black mt-0.5 block ${triptiDwellExtension > 20 ? 'text-rose-700' : (triptiDwellExtension > 10 ? 'text-amber-700' : 'text-emerald-700')}`}>
                      {triptiDwellExtension > 20 ? '92% (High Detention)' : (triptiDwellExtension > 10 ? '58% (Moderate)' : '4% (Clear)')}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Signal overlap safety lock</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. RIYA (R) - BLOCK ASSISTANT SIMULATION */}
            {selectedAgent === 'tracks' && (
              <div className="rounded-xl p-4 bg-white shadow-sm border border-slate-200 border-l-4 border-l-rose-500 space-y-4">
                <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200 gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-rose-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
                      R
                    </span>
                    <div>
                      <span className="text-xs font-black uppercase text-slate-900 tracking-wider block">
                        Agent Riya &bull; Block Assistant Simulation Console
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Safe Braking Distance (EBD) &bull; 180m Overlap Interlock &bull; 4-Aspect Cascades
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-rose-100 text-rose-900 border border-rose-300 px-2.5 py-0.5 rounded-full">
                    IR G&amp;SR Rule 3.38 Interlocked
                  </span>
                </div>

                {/* Simulation Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <div className="flex justify-between items-center mb-1.5 font-bold text-slate-800">
                      <span>Approach Speed:</span>
                      <span className="font-mono text-rose-800 font-black bg-rose-100 px-2 py-0.5 rounded border border-rose-200">
                        {riyaApproachSpeed} km/h
                      </span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="140"
                      step="5"
                      value={riyaApproachSpeed}
                      onChange={(e) => setRiyaApproachSpeed(parseInt(e.target.value, 10))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                      <span>40 km/h</span>
                      <span>100 km/h</span>
                      <span className="text-rose-700 font-bold">140 km/h MPS</span>
                    </div>
                  </div>

                  <div>
                    <span className="font-bold text-slate-800 block mb-1.5">Track Gradient:</span>
                    <select
                      value={riyaGradient}
                      onChange={(e) => setRiyaGradient(parseInt(e.target.value, 10))}
                      className="w-full bg-white text-slate-900 font-semibold py-1.5 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-irctc-blue shadow-2xs"
                    >
                      <option value="0">Level Track (0‰)</option>
                      <option value="-5">Falling Gradient (-1:200 &bull; -5‰)</option>
                      <option value="5">Rising Gradient (+1:200 &bull; +5‰)</option>
                    </select>
                    <span className="text-[10px] text-slate-500 font-medium block mt-1">
                      {riyaGradient < 0 ? 'Downhill extends braking distance.' : (riyaGradient > 0 ? 'Uphill assists braking force.' : 'Standard flat profile.')}
                    </span>
                  </div>

                  <div>
                    <span className="font-bold text-slate-800 block mb-1.5">Rail Adhesion (μ):</span>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: 'DRY', label: 'Dry (0.33)' },
                        { id: 'WET', label: 'Wet (0.22)' },
                        { id: 'FOG', label: 'Fog (0.15)' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setRiyaAdhesion(item.id as any)}
                          className={`py-1 rounded text-[11px] font-bold border transition-all ${
                            riyaAdhesion === item.id
                              ? 'bg-rose-600 text-white border-rose-700 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium block mt-1">
                      Wheel-rail friction coefficient
                    </span>
                  </div>
                </div>

                {/* Safe Braking Deceleration & Overlap Graph */}
                {(() => {
                  const adhesionFactor = riyaAdhesion === 'DRY' ? 1.0 : (riyaAdhesion === 'WET' ? 0.78 : 0.62);
                  const gradientAcc = (riyaGradient / 1000) * 9.81;
                  const ebdDecel = Math.max(0.4, (0.95 * adhesionFactor) - gradientAcc);
                  const svcDecel = Math.max(0.3, (0.65 * adhesionFactor) - gradientAcc);
                  const speedMs = riyaApproachSpeed * (1000 / 3600);

                  const ebdMeters = Math.round((Math.pow(speedMs, 2) / (2 * ebdDecel)) + (speedMs * 1.2));
                  const svcMeters = Math.round((Math.pow(speedMs, 2) / (2 * svcDecel)) + (speedMs * 2.0));
                  const totalEnvelope = ebdMeters + 180; // 180m mandatory IR overlap

                  return (
                    <div className="p-3 bg-slate-900 rounded-xl text-white space-y-2 border border-slate-800">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold uppercase tracking-wider text-rose-400 text-[11px] flex items-center gap-1.5">
                          <Split className="w-3.5 h-3.5" />
                          Emergency Braking Deceleration Profile &amp; 180m Overlap Cushion
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          EBD: {ebdMeters}m &bull; Overlap: 180m
                        </span>
                      </div>

                      {/* SVG Braking Curve */}
                      <div className="relative w-full h-36 bg-slate-950/80 rounded-lg p-2 border border-slate-800/80 overflow-hidden">
                        <svg viewBox="0 0 500 120" className="w-full h-full overflow-visible">
                          {/* 180m Overlap Zone Stripe */}
                          <rect x="420" y="10" width="80" height="95" fill="rgba(239, 68, 68, 0.25)" />
                          <line x1="420" y1="10" x2="420" y2="105" stroke="#f87171" strokeWidth="2" strokeDasharray="3 3" />
                          <text x="424" y="24" fill="#f87171" fontSize="9" fontWeight="bold">180m OVERLAP</text>

                          {/* Grid Lines */}
                          <line x1="0" y1="105" x2="500" y2="105" stroke="#334155" strokeWidth="1" />
                          <line x1="0" y1="55" x2="500" y2="55" stroke="#1e293b" strokeDasharray="3 3" />

                          {/* Service Braking Curve (Blue-Green) */}
                          {(() => {
                            const maxDist = Math.max(1400, svcMeters + 250);
                            const ptsSvc = [0, 0.2, 0.4, 0.6, 0.8, 1.0].map(frac => {
                              const dist = svcMeters * frac;
                              const x = (dist / maxDist) * 500;
                              const spd = riyaApproachSpeed * Math.sqrt(Math.max(0, 1 - frac));
                              const y = 105 - (spd / 140) * 90;
                              return `${x},${y}`;
                            }).join(' ');

                            const ptsEbd = [0, 0.2, 0.4, 0.6, 0.8, 1.0].map(frac => {
                              const dist = ebdMeters * frac;
                              const x = (dist / maxDist) * 500;
                              const spd = riyaApproachSpeed * Math.sqrt(Math.max(0, 1 - frac));
                              const y = 105 - (spd / 140) * 90;
                              return `${x},${y}`;
                            }).join(' ');

                            const stopX = (ebdMeters / maxDist) * 500;

                            return (
                              <>
                                <polyline fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 2" points={ptsSvc} />
                                <polyline fill="none" stroke="#f43f5e" strokeWidth="2.5" points={ptsEbd} />
                                <circle cx={stopX} cy={105} r="4.5" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.5" />
                                <text x={Math.max(10, stopX - 30)} y={92} fill="#fecdd3" fontSize="10" fontWeight="bold">
                                  EBD {ebdMeters}m
                                </text>
                              </>
                            );
                          })()}

                          {/* Axis Labels */}
                          <text x="5" y="116" fill="#94a3b8" fontSize="9">Mast 0m</text>
                          <text x="220" y="116" fill="#94a3b8" fontSize="9">Deceleration Run</text>
                          <text x="430" y="116" fill="#f87171" fontSize="9" fontWeight="bold">Fouling Mark</text>
                        </svg>
                      </div>

                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-0.5 bg-rose-500 inline-block" />
                          Red Solid: Emergency Braking ({ebdMeters}m)
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-0.5 bg-sky-400 inline-block border-t border-dashed" />
                          Cyan Dashed: Full Service Application ({svcMeters}m)
                        </span>
                      </div>

                      {/* EBD Breakdown Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800">
                        <div className="p-2 bg-slate-950 rounded border border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-bold">EMERGENCY STOP (EBD)</span>
                          <span className="font-mono text-sm font-bold text-rose-400">{ebdMeters} meters</span>
                        </div>
                        <div className="p-2 bg-slate-950 rounded border border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-bold">INTERLOCKED OVERLAP</span>
                          <span className="font-mono text-sm font-bold text-amber-400">+180m Safe Cushion</span>
                        </div>
                        <div className="p-2 bg-slate-950 rounded border border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-bold">TOTAL SAFETY ENVELOPE</span>
                          <span className="font-mono text-sm font-bold text-emerald-400">{totalEnvelope} meters</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 4-Aspect Headway Separation Cascade */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-rose-600" />
                      Automatic 4-Aspect Block Cascade Headway Separation
                    </span>
                    <span className="font-mono text-xs text-rose-700 font-black bg-rose-100 px-2 py-0.5 rounded border border-rose-200">
                      {riyaHeadwayDistance} meters
                    </span>
                  </div>

                  <input
                    type="range"
                    min="600"
                    max="3800"
                    step="100"
                    value={riyaHeadwayDistance}
                    onChange={(e) => setRiyaHeadwayDistance(parseInt(e.target.value, 10))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
                  />

                  {/* Visual 4 Signals Chain */}
                  <div className="grid grid-cols-4 gap-2 pt-1 font-mono text-center">
                    <div className="p-2 rounded-lg bg-white border border-slate-300">
                      <span className="text-[10px] text-slate-500 font-bold block">S-101 Mast</span>
                      <span className="text-xs font-black text-rose-600 block mt-0.5">RED (Danger)</span>
                      <span className="text-[9px] text-slate-500">Train in Block &bull; 0 km/h</span>
                    </div>

                    <div className="p-2 rounded-lg bg-white border border-slate-300">
                      <span className="text-[10px] text-slate-500 font-bold block">S-103 IBS</span>
                      <span className={`text-xs font-black block mt-0.5 ${riyaHeadwayDistance > 1000 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {riyaHeadwayDistance > 1000 ? 'YELLOW (Caution)' : 'RED (Danger)'}
                      </span>
                      <span className="text-[9px] text-slate-500">30 km/h restriction</span>
                    </div>

                    <div className="p-2 rounded-lg bg-white border border-slate-300">
                      <span className="text-[10px] text-slate-500 font-bold block">S-105 Home</span>
                      <span className={`text-xs font-black block mt-0.5 ${riyaHeadwayDistance > 2000 ? 'text-amber-500' : (riyaHeadwayDistance > 1000 ? 'text-amber-600' : 'text-rose-600')}`}>
                        {riyaHeadwayDistance > 2000 ? 'DBL YELLOW' : (riyaHeadwayDistance > 1000 ? 'YELLOW' : 'RED')}
                      </span>
                      <span className="text-[9px] text-slate-500">50 km/h Attention</span>
                    </div>

                    <div className="p-2 rounded-lg bg-white border border-slate-300">
                      <span className="text-[10px] text-slate-500 font-bold block">S-107 Starter</span>
                      <span className={`text-xs font-black block mt-0.5 ${riyaHeadwayDistance > 3000 ? 'text-emerald-600' : 'text-amber-500'}`}>
                        {riyaHeadwayDistance > 3000 ? 'GREEN (Clear)' : 'DBL YELLOW'}
                      </span>
                      <span className="text-[9px] text-slate-500">130 km/h MPS</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. SMITA (S) - ROLLING STOCK ASSISTANT SIMULATION */}
            {selectedAgent === 'resource' && (
              <div className="rounded-xl p-4 bg-white shadow-sm border border-slate-200 border-l-4 border-l-emerald-500 space-y-4">
                <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200 gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
                      S
                    </span>
                    <div>
                      <span className="text-xs font-black uppercase text-slate-900 tracking-wider block">
                        Agent Smita &bull; Rolling Stock Assistant Simulation Console
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        WAP-7 Tractive Dynamics &bull; TSR Friction Drag &bull; Regenerative Energy Recovery
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                    RDSO / CLW Spec-0029
                  </span>
                </div>

                {/* Simulation Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="font-bold text-slate-800 block mb-1.5">Locomotive Class:</span>
                    <select
                      value={smitaLocoType}
                      onChange={(e) => setSmitaLocoType(e.target.value as any)}
                      className="w-full bg-white text-slate-900 font-semibold py-1.5 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-irctc-blue shadow-2xs"
                    >
                      <option value="WAP7">WAP-7 &bull; 6,350 HP (Passenger Co-Co)</option>
                      <option value="WAP5">WAP-5 &bull; 5,450 HP (Bo-Bo High Speed)</option>
                      <option value="WAG9">WAG-9 &bull; 6,120 HP (Freight Heavy Haul)</option>
                    </select>
                    <span className="text-[10px] text-slate-500 font-medium block mt-1">
                      {smitaLocoType === 'WAP7' ? '322 kN starting TE &bull; MPS 140 km/h' : (smitaLocoType === 'WAP5' ? '258 kN starting TE &bull; MPS 160 km/h' : '460 kN starting TE &bull; MPS 100 km/h')}
                    </span>
                  </div>

                  <div>
                    <span className="font-bold text-slate-800 block mb-1.5">TSR Caution Speed:</span>
                    <div className="grid grid-cols-3 gap-1">
                      {[20, 30, 50].map((spd) => (
                        <button
                          key={spd}
                          type="button"
                          onClick={() => setSmitaTsrSpeed(spd)}
                          className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            smitaTsrSpeed === spd
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {spd} km/h
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium block mt-1">
                      Caution Order enforcement
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5 font-bold text-slate-800">
                      <span>TSR Zone Length:</span>
                      <span className="font-mono text-emerald-800 font-black bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                        {smitaTsrLengthKm} km
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="4.0"
                      step="0.5"
                      value={smitaTsrLengthKm}
                      onChange={(e) => setSmitaTsrLengthKm(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                      <span>0.5 km</span>
                      <span>2.0 km</span>
                      <span>4.0 km</span>
                    </div>
                  </div>
                </div>

                {/* Tractive Effort (TE) vs Speed Graph */}
                {(() => {
                  const maxTE = smitaLocoType === 'WAG9' ? 460 : (smitaLocoType === 'WAP7' ? 322 : 258);
                  const maxHP = smitaLocoType === 'WAG9' ? 6120 : (smitaLocoType === 'WAP7' ? 6350 : 5450);
                  const baseSpeed = smitaLocoType === 'WAG9' ? 38 : (smitaLocoType === 'WAP7' ? 50 : 65);
                  const topSpeed = smitaLocoType === 'WAG9' ? 100 : (smitaLocoType === 'WAP7' ? 140 : 160);

                  // TSR Time Loss Calculations
                  // Decel from 130 km/h to smitaTsrSpeed:
                  const v1 = 130 * (1000 / 3600);
                  const v2 = smitaTsrSpeed * (1000 / 3600);
                  const decelLossSec = Math.round((v1 - v2) / (2 * 0.65));
                  const tsrTransitSec = Math.round((smitaTsrLengthKm * 1000) / v2);
                  const accelLossSec = Math.round((v1 - v2) / (2 * 0.38));
                  const nominalTransitSec = Math.round((smitaTsrLengthKm * 1000) / v1);
                  const totalDelaySec = (decelLossSec + tsrTransitSec + accelLossSec) - nominalTransitSec;
                  const totalDelayMins = Math.floor(totalDelaySec / 60);
                  const totalDelayRemSec = totalDelaySec % 60;

                  // Regenerative braking energy recovered: E = 0.5 * m * (v1^2 - v2^2) * 0.85
                  const rakeMassTonnes = 1150; // 22 LHB coaches + loco
                  const kineticEnergyJoules = 0.5 * (rakeMassTonnes * 1000) * (Math.pow(v1, 2) - Math.pow(v2, 2)) * 0.82;
                  const regenKwh = Math.round(kineticEnergyJoules / (3.6 * 1000000));
                  const inrSaved = Math.round(regenKwh * 8.4); // ₹8.4 per unit railway traction tariff

                  return (
                    <div className="space-y-4">
                      {/* SVG Chart */}
                      <div className="p-3 bg-slate-900 rounded-xl text-white space-y-2 border border-slate-800">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold uppercase tracking-wider text-emerald-400 text-[11px] flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5" />
                            {smitaLocoType} Tractive Effort (kN) vs Speed (km/h) Dynamics Curve
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            Starting TE: {maxTE} kN &bull; {maxHP} HP
                          </span>
                        </div>

                        <div className="relative w-full h-36 bg-slate-950/80 rounded-lg p-2 border border-slate-800/80 overflow-hidden">
                          <svg viewBox="0 0 500 120" className="w-full h-full overflow-visible">
                            {/* Grid Lines */}
                            <line x1="0" y1="105" x2="500" y2="105" stroke="#334155" strokeWidth="1" />
                            <line x1="0" y1="55" x2="500" y2="55" stroke="#1e293b" strokeDasharray="3 3" />
                            <line x1="0" y1="10" x2="500" y2="10" stroke="#1e293b" strokeDasharray="3 3" />

                            {/* Base Speed Line */}
                            {(() => {
                              const baseX = (baseSpeed / topSpeed) * 500;
                              return (
                                <>
                                  <line x1={baseX} y1="10" x2={baseX} y2="105" stroke="#059669" strokeWidth="1.5" strokeDasharray="3 3" />
                                  <text x={baseX + 4} y="22" fill="#34d399" fontSize="9">BASE {baseSpeed} km/h</text>
                                </>
                              );
                            })()}

                            {/* TE Curve */}
                            {(() => {
                              const pts: string[] = [];
                              for (let spd = 0; spd <= topSpeed; spd += 5) {
                                const x = (spd / topSpeed) * 500;
                                let te = maxTE;
                                if (spd > baseSpeed) {
                                  te = maxTE * (baseSpeed / spd);
                                }
                                const y = 105 - (te / (maxTE * 1.1)) * 95;
                                pts.push(`${x},${y}`);
                              }

                              const curSpd = 130;
                              const curX = (curSpd / topSpeed) * 500;
                              const curTE = Math.round(maxTE * (baseSpeed / curSpd));
                              const curY = 105 - (curTE / (maxTE * 1.1)) * 95;

                              return (
                                <>
                                  <polyline fill="none" stroke="#10b981" strokeWidth="2.5" points={pts.join(' ')} />
                                  <circle cx={curX} cy={curY} r="5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" className="animate-pulse" />
                                  <text x={Math.max(10, curX - 45)} y={curY - 10} fill="#6ee7b7" fontSize="10" fontWeight="bold">
                                    {curTE} kN @ 130 km/h
                                  </text>
                                </>
                              );
                            })()}

                            {/* X Axis */}
                            <text x="5" y="116" fill="#94a3b8" fontSize="9">0 km/h</text>
                            <text x="230" y="116" fill="#94a3b8" fontSize="9">Constant Power Hyperbolic Decay</text>
                            <text x="450" y="116" fill="#94a3b8" fontSize="9">{topSpeed} km/h</text>
                          </svg>
                        </div>

                        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                          <span className="text-emerald-400 font-semibold">
                            Zone 1 (0 to {baseSpeed} km/h): Constant Torque Maximum Starting Pull
                          </span>
                          <span className="text-slate-400">
                            Zone 2 ({baseSpeed} to {topSpeed} km/h): Constant Power (HP Limit)
                          </span>
                        </div>
                      </div>

                      {/* TSR Kinetic Delay & Regenerative Energy Recovery Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                          <span className="text-xs font-bold text-slate-900 block flex items-center justify-between">
                            <span>TSR Time Loss Penalty:</span>
                            <span className="font-mono text-rose-700 font-black text-sm">
                              +{totalDelayMins}m {totalDelayRemSec}s Net
                            </span>
                          </span>
                          <div className="text-[11px] text-slate-600 space-y-0.5 font-mono">
                            <div className="flex justify-between">
                              <span>Decel Loss (130 &rarr; {smitaTsrSpeed}):</span>
                              <span className="font-bold">{decelLossSec}s</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Caution Run ({smitaTsrLengthKm}km @ {smitaTsrSpeed}):</span>
                              <span className="font-bold">{tsrTransitSec}s</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Accel Recovery ({smitaTsrSpeed} &rarr; 130):</span>
                              <span className="font-bold">{accelLossSec}s</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl space-y-1.5">
                          <span className="text-xs font-bold text-emerald-950 block flex items-center justify-between">
                            <span>Regenerative Braking Grid Return:</span>
                            <span className="font-mono text-emerald-800 font-black text-sm">
                              +{regenKwh} kWh
                            </span>
                          </span>
                          <div className="text-[11px] text-emerald-900 space-y-0.5">
                            <p>
                              Kinetic energy fed back to 25 kV AC OHE catenary during deceleration from 130 km/h to {smitaTsrSpeed} km/h.
                            </p>
                            <div className="pt-1 font-mono font-bold text-emerald-800 flex justify-between border-t border-emerald-200">
                              <span>Energy Cost Saved:</span>
                              <span>&asymp; &#8377;{inrSaved.toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

          </div>
          )}

        </div>
      </div>
    </div>
  );
};

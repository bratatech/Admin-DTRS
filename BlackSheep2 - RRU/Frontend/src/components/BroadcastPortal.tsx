'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio,
  Send,
  Bell,
  BellRing,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Train,
  Users,
  ShieldAlert,
  Volume2,
  VolumeX,
  RefreshCw,
  Search,
  Filter,
  CheckCheck,
  Building,
  Bot,
  Zap,
  RadioTower,
  MessageSquare,
  CornerDownRight,
  Sparkles,
} from 'lucide-react';

export type BroadcastSeverity = 'CRITICAL' | 'WARNING' | 'ADVISORY' | 'INFO';

export interface BroadcastMessage {
  id: string;
  sender: string;
  senderRole: string;
  recipientChannel: string;
  severity: BroadcastSeverity;
  content: string;
  timestamp: string;
  isIncoming: boolean;
  acknowledged: boolean;
  ackCount?: number;
  totalTargetRecipients?: number;
}

export interface CorridorAlert {
  id: string;
  code: string;
  title: string;
  location: string;
  severity: BroadcastSeverity;
  time: string;
  status: 'ACTIVE' | 'INVESTIGATING' | 'RESOLVED';
  actionTaken: string;
}

const INITIAL_MESSAGES: BroadcastMessage[] = [
  {
    id: 'msg-1',
    sender: 'Sr. DOM / Section Controller',
    senderRole: 'Agra Division Control (HQ)',
    recipientChannel: 'All Corridor Trains (Sec 1-4)',
    severity: 'CRITICAL',
    content: 'EMERGENCY ADVISORY: Train #12001 Bhopal Shatabdi halted at Block 3 (Km 5.2). Aspect S-105 held at Danger (Red). All trailing trains reduce speed to 45 km/h.',
    timestamp: '21:32:15 IST',
    isIncoming: false,
    acknowledged: true,
    ackCount: 14,
    totalTargetRecipients: 16,
  },
  {
    id: 'msg-2',
    sender: 'Loco Pilot #12001 (WAP-7)',
    senderRole: 'Bhopal Shatabdi In-Cab Radio',
    recipientChannel: 'Divisional Control Office',
    severity: 'WARNING',
    content: 'Traction Motor Thermal Warning cleared after 22 mins coasting. Ready to proceed at restricted speed 30 km/h upon S-105 clearance.',
    timestamp: '21:33:02 IST',
    isIncoming: true,
    acknowledged: true,
  },
  {
    id: 'msg-3',
    sender: 'Station Master MTJ',
    senderRole: 'Mathura Junction Master Console',
    recipientChannel: 'All Corridor Trains (Sec 1-4)',
    severity: 'ADVISORY',
    content: 'Platform 2 reserved for Shatabdi #12001 rake inspection. Up Main Line kept clear for #12424 Dibrugarh Rajdhani green overtake wave.',
    timestamp: '21:33:45 IST',
    isIncoming: true,
    acknowledged: false,
  },
  {
    id: 'msg-4',
    sender: 'Agent Diya (Crew AI)',
    senderRole: 'Automated HOER Roster CMS',
    recipientChannel: 'Agra Cantt Crew Lobby',
    severity: 'WARNING',
    content: 'Loco pilot duty on Train #12001 has reached 9h 48m. Mandatory statutory 10h ceiling expires in 12 mins. Standby electric crew required at Agra Cantt PF 1.',
    timestamp: '21:34:00 IST',
    isIncoming: true,
    acknowledged: false,
  },
  {
    id: 'msg-5',
    sender: 'Loco Pilot #12919 (Malwa Exp)',
    senderRole: 'Malwa Express Cab Radio',
    recipientChannel: 'Station Master MTJ',
    severity: 'INFO',
    content: 'Acknowledged loop divert directive. Passing point 102 into Loop Line 1 at 30 km/h. Main line clear for Rajdhani overtake.',
    timestamp: '21:34:18 IST',
    isIncoming: true,
    acknowledged: true,
  },
];

const INITIAL_ALERTS: CorridorAlert[] = [
  {
    id: 'alt-1',
    code: 'SEC-3-RED-LOCK',
    title: 'Block 3 Overlap Safety Interlock Active',
    location: 'Km 5.2 (Protected by S-105 Mast)',
    severity: 'CRITICAL',
    time: '21:30 IST',
    status: 'ACTIVE',
    actionTaken: 'Trailing signals S-103 and S-101 cascade throttled to Yellow and Attention.',
  },
  {
    id: 'alt-2',
    code: 'FOG-PASS-DEPLOY',
    title: 'Fog Vision Device & Audio Detonator Armed',
    location: 'Section 2 (Km 2.5 - Km 4.8)',
    severity: 'WARNING',
    time: '21:15 IST',
    status: 'ACTIVE',
    actionTaken: 'MPS capped at 60 km/h under dense fog visibility <50m.',
  },
  {
    id: 'alt-3',
    code: 'CREW-HOER-LIMIT',
    title: 'HOER Statutory Continuous Duty Warning',
    location: 'Train #12001 Cab (9h 48m)',
    severity: 'WARNING',
    time: '21:28 IST',
    status: 'INVESTIGATING',
    actionTaken: 'Relief crew alert dispatched to Agra Cantt crew lobby.',
  },
];

const PRESET_BROADCASTS = [
  {
    title: 'Dense Fog Advisory (MPS 60 km/h)',
    severity: 'WARNING' as BroadcastSeverity,
    channel: 'All Corridor Trains (Sec 1-4)',
    text: 'DENSE FOG ADVISORY: Visibility below 60m between Mathura and Agra. Fog-Pass instruments active. Maximum Permissible Speed strictly restricted to 60 km/h.',
  },
  {
    title: 'Dynamic Loop Divert Order',
    severity: 'WARNING' as BroadcastSeverity,
    channel: 'Loco Pilot #12919 (Malwa Exp)',
    text: 'DISPATCH ORDER: Divert Train #12919 to Station B Loop 1 at 30 km/h. Clear Up Main Line for high-priority #12424 Rajdhani overtake.',
  },
  {
    title: 'Emergency Stop All Traffic (Red)',
    severity: 'CRITICAL' as BroadcastSeverity,
    channel: 'All Corridor Trains (Sec 1-4)',
    text: 'EMERGENCY ALL-STOP: Unidentified track obstacle reported at Km 5.2. All trains in Section 1, 2, 3 stop immediately at next signal mast.',
  },
  {
    title: 'Corridor Clear (130 km/h MPS Resumed)',
    severity: 'INFO' as BroadcastSeverity,
    channel: 'All Corridor Trains (Sec 1-4)',
    text: 'ALL CLEAR: Block Section 3 obstacle cleared. Track circuit voltage normal (1.85V). 130 km/h MPS authorized under Green Aspect Wave.',
  },
];

export const BroadcastPortal: React.FC = () => {
  const [messages, setMessages] = useState<BroadcastMessage[]>(INITIAL_MESSAGES);
  const [alerts, setAlerts] = useState<CorridorAlert[]>(INITIAL_ALERTS);
  const [channel, setChannel] = useState<string>('All Corridor Trains (Sec 1-4)');
  const [severity, setSeverity] = useState<BroadcastSeverity>('WARNING');
  const [customText, setCustomText] = useState<string>('');
  const [requireAck, setRequireAck] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CRITICAL' | 'INCOMING' | 'OUTGOING'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);
  const [broadcastSuccessNotice, setBroadcastSuccessNotice] = useState<string | null>(null);

  // Play synthesized web audio chime if sound is enabled
  const playChime = (type: 'send' | 'alert') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'alert') {
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.setValueAtTime(659, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } else {
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1);
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      }
    } catch {
      // AudioContext policy fallback
    }
  };

  const handleSendBroadcast = () => {
    if (!customText.trim()) return;

    setIsTransmitting(true);
    playChime('send');

    setTimeout(() => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} IST`;

      const newMsg: BroadcastMessage = {
        id: `msg-${Date.now()}`,
        sender: 'Chief Section Controller (DTRS)',
        senderRole: 'Corridor Traffic Operations Desk',
        recipientChannel: channel,
        severity,
        content: customText.trim(),
        timestamp: timeStr,
        isIncoming: false,
        acknowledged: false,
        ackCount: 1,
        totalTargetRecipients: channel.includes('All') ? 16 : 4,
      };

      setMessages((prev) => [newMsg, ...prev]);
      setCustomText('');
      setIsTransmitting(false);
      setBroadcastSuccessNotice(`Broadcast dispatched successfully to ${channel}. Radio beacon transmitted.`);

      setTimeout(() => setBroadcastSuccessNotice(null), 4000);
    }, 600);
  };

  const handleApplyPreset = (preset: typeof PRESET_BROADCASTS[0]) => {
    setCustomText(preset.text);
    setSeverity(preset.severity);
    setChannel(preset.channel);
  };

  const handleToggleAck = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, acknowledged: !m.acknowledged } : m))
    );
  };

  const handleSimulateIncoming = () => {
    playChime('alert');
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} IST`;

    const sampleIncomings = [
      {
        sender: 'Guard #12424 (Rajdhani)',
        role: 'Rear Brake Van Telemetry',
        channel: 'Section Controller Desk',
        severity: 'INFO' as BroadcastSeverity,
        content: 'BPC Air Pressure 5.0 kg/cm² nominal. Cleared Km 2.8 at 125 km/h. Up line clear behind us.',
      },
      {
        sender: 'Station Master AGC',
        role: 'Agra Cantt Panel Interlock',
        channel: 'All Corridor Trains (Sec 1-4)',
        severity: 'ADVISORY' as BroadcastSeverity,
        content: 'Platform 1 cleared. Route set and locked for #12001. Starter Signal cleared to Double Yellow.',
      },
      {
        sender: 'Kavach Radio Block Centre (RBC)',
        role: 'Automated Track Beacon #09',
        channel: 'Corridor Safety Hub',
        severity: 'CRITICAL' as BroadcastSeverity,
        content: 'Distance-to-go speed supervision updated for 4 trains. Headway safe buffer locked at 480m.',
      },
    ];

    const pick = sampleIncomings[Math.floor(Math.random() * sampleIncomings.length)];

    const incomingMsg: BroadcastMessage = {
      id: `msg-${Date.now()}`,
      sender: pick.sender,
      senderRole: pick.role,
      recipientChannel: pick.channel,
      severity: pick.severity,
      content: pick.content,
      timestamp: timeStr,
      isIncoming: true,
      acknowledged: false,
    };

    setMessages((prev) => [incomingMsg, ...prev]);
  };

  const filteredMessages = messages.filter((m) => {
    if (activeFilter === 'CRITICAL' && m.severity !== 'CRITICAL') return false;
    if (activeFilter === 'INCOMING' && !m.isIncoming) return false;
    if (activeFilter === 'OUTGOING' && m.isIncoming) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        m.content.toLowerCase().includes(q) ||
        m.sender.toLowerCase().includes(q) ||
        m.recipientChannel.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const criticalCount = messages.filter((m) => m.severity === 'CRITICAL').length;
  const pendingAckCount = messages.filter((m) => !m.acknowledged).length;

  return (
    <div className="space-y-5">
      {/* 1. Header Banner */}
      <div className="rounded-2xl p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 opacity-10 pointer-events-none flex items-center justify-center">
          <RadioTower className="w-64 h-64 text-white" />
        </div>

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-rose-600/90 text-white flex items-center justify-center shadow-lg border border-rose-400/40 shrink-0">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black uppercase tracking-wide text-white">
                  DTRS Operational Broadcast &amp; Alert Notification Portal
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                  RADIO LIVE
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Indian Railways Section Dispatch &bull; In-Cab Radio Link &bull; Station Master Telemetry &bull; Automated Emergency SOS Broadcast
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono text-[11px] bg-slate-800/90 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              VHF 161.150 MHz Interlocked
            </span>
            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              title={soundEnabled ? 'Mute Chimes' : 'Enable Chimes'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>
            <button
              type="button"
              onClick={handleSimulateIncoming}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Simulate Incoming Radio
            </button>
          </div>
        </div>

        {/* Live Ticker Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-rose-400 uppercase text-[10px] tracking-wider shrink-0 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              Active Signal Alert:
            </span>
            <span className="text-slate-300 truncate font-mono text-[11px]">
              Block 3 (Km 5.2): S-105 Home Red aspect active &bull; #12001 TM recovery coasting &bull; Trailing trains speed throttled.
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono shrink-0 pl-2">
            AES-256 Railway Telematics
          </span>
        </div>
      </div>

      {/* 2. Success Banner if sent */}
      <AnimatePresence>
        {broadcastSuccessNotice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center justify-between shadow-xs"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{broadcastSuccessNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setBroadcastSuccessNotice(null)}
              className="text-emerald-700 hover:text-emerald-900 font-black cursor-pointer"
            >
              &times;
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Main Workspace Grid: Left = Broadcast Transmitter, Right = Live Incomings & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN (7 cols): Outgoing Broadcast Console */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-rose-600" />
                <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">
                  Transmit Live Corridor Broadcast
                </h2>
              </div>
              <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                Authorized Dispatch Desk
              </span>
            </div>

            {/* Recipient Channel Selector */}
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-800 block">
                Target Recipient Channel:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  'All Corridor Trains (Sec 1-4)',
                  'Loco Pilots & Guards (Cab Radio)',
                  'Station Masters & Yard (MTJ, AGC)',
                  '4 DTRS AI Agents (D, T, R, S)',
                  'Divisional Control Office (Sr. DOM)',
                  'Emergency Distress SOS (All Units)',
                ].map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setChannel(ch)}
                    className={`p-2 rounded-lg text-left text-[11px] font-bold border transition-all cursor-pointer truncate ${
                      channel === ch
                        ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity Level */}
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-800 block">
                Broadcast Severity &amp; Audible Beacon:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['CRITICAL', 'WARNING', 'ADVISORY', 'INFO'] as BroadcastSeverity[]).map((sev) => {
                  const colors = {
                    CRITICAL: 'bg-rose-600 border-rose-700 text-white',
                    WARNING: 'bg-amber-500 border-amber-600 text-white',
                    ADVISORY: 'bg-blue-600 border-blue-700 text-white',
                    INFO: 'bg-emerald-600 border-emerald-700 text-white',
                  };
                  const inactive = {
                    CRITICAL: 'hover:bg-rose-50 text-rose-800 border-rose-200 bg-rose-50/50',
                    WARNING: 'hover:bg-amber-50 text-amber-900 border-amber-200 bg-amber-50/50',
                    ADVISORY: 'hover:bg-blue-50 text-blue-900 border-blue-200 bg-blue-50/50',
                    INFO: 'hover:bg-emerald-50 text-emerald-900 border-emerald-200 bg-emerald-50/50',
                  };
                  return (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setSeverity(sev)}
                      className={`py-2 px-2.5 rounded-lg text-xs font-black border transition-all cursor-pointer text-center ${
                        severity === sev ? colors[sev] + ' shadow-xs' : inactive[sev]
                      }`}
                    >
                      {sev === 'CRITICAL' && '🚨 '}
                      {sev === 'WARNING' && '⚠️ '}
                      {sev === 'ADVISORY' && 'ℹ️ '}
                      {sev === 'INFO' && '✅ '}
                      {sev}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Radio Preset Pills */}
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700 flex items-center justify-between">
                <span>Quick Operational Message Presets:</span>
                <span className="text-[10px] text-slate-400 font-normal">Click to insert</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESET_BROADCASTS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors cursor-pointer group"
                  >
                    <span className="font-bold text-[11px] text-slate-800 block group-hover:text-rose-700">
                      {preset.title}
                    </span>
                    <span className="text-[10px] text-slate-500 line-clamp-1">
                      {preset.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Text Input */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center font-bold text-slate-800">
                <label>Broadcast Message Body:</label>
                <span className="text-[10px] font-mono text-slate-400">
                  {customText.length} characters
                </span>
              </div>
              <textarea
                rows={4}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Type operational transmission to corridor units, loco pilots, or station masters..."
                className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-sans text-xs bg-slate-50 text-slate-900 resize-none shadow-2xs"
              />
            </div>

            {/* Transmission Options & Send Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireAck}
                  onChange={(e) => setRequireAck(e.target.checked)}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                />
                <span>Demand Mandatory In-Cab Digital Acknowledgement (ACK)</span>
              </label>

              <button
                type="button"
                onClick={handleSendBroadcast}
                disabled={isTransmitting || !customText.trim()}
                className={`px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer ${
                  !customText.trim()
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-rose-600 hover:bg-rose-700 text-white active:scale-95'
                }`}
              >
                {isTransmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Broadcasting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Transmit Broadcast</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Active Section Alerts Box */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold uppercase text-slate-900">
                  Corridor Interlock Alerts ({alerts.length})
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500">Live Telemetry Hook</span>
            </div>

            <div className="space-y-2">
              {alerts.map((alt) => (
                <div
                  key={alt.id}
                  className={`p-3 rounded-xl border text-xs space-y-1 ${
                    alt.severity === 'CRITICAL'
                      ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                      : 'bg-amber-50/70 border-amber-200 text-amber-950'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold">
                      {alt.severity === 'CRITICAL' ? (
                        <AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      )}
                      <span>{alt.title}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/80 border border-slate-300/60">
                      {alt.time}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono">
                    <span>{alt.location}</span>
                    <span className="font-bold text-[10px] uppercase text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded">
                      {alt.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 font-sans leading-tight">
                    {alt.actionTaken}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5 cols): Live Incomings & Radio Stream */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase text-slate-900">
                  Incoming Radio Transmissions &amp; Log
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                {messages.length} Messages
              </span>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="space-y-2">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-[11px]">
                {(['ALL', 'CRITICAL', 'INCOMING', 'OUTGOING'] as const).map((flt) => (
                  <button
                    key={flt}
                    type="button"
                    onClick={() => setActiveFilter(flt)}
                    className={`flex-1 py-1 rounded-md font-bold transition-all cursor-pointer text-center ${
                      activeFilter === flt
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {flt}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter messages, units, trains..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Messages Feed */}
            <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
              {filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-xl border transition-all text-xs space-y-1.5 ${
                    msg.severity === 'CRITICAL'
                      ? 'bg-rose-50/60 border-rose-200'
                      : (msg.severity === 'WARNING' ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50/80 border-slate-200')
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        msg.severity === 'CRITICAL' ? 'bg-rose-500 animate-ping' : (msg.severity === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500')
                      }`} />
                      <div>
                        <span className="font-bold text-slate-900 block leading-tight text-[11px]">
                          {msg.sender}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium block">
                          {msg.senderRole}
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-slate-400 shrink-0">
                      {msg.timestamp}
                    </span>
                  </div>

                  <p className="text-slate-800 text-[11px] leading-relaxed font-sans">
                    {msg.content}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px]">
                    <span className="text-slate-500 font-mono truncate max-w-[170px]">
                      &rarr; {msg.recipientChannel}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleAck(msg.id)}
                      className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        msg.acknowledged
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                      }`}
                    >
                      {msg.acknowledged ? (
                        <>
                          <CheckCheck className="w-3 h-3 text-emerald-600" />
                          <span>Acknowledged</span>
                        </>
                      ) : (
                        <span>Mark ACK</span>
                      )}
                    </button>
                  </div>
                </div>
              ))}

              {filteredMessages.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No broadcast transmissions match the selected filter.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default BroadcastPortal;

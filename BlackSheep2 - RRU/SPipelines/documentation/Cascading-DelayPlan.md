# Cascading (Knock-On) Delay Simulation Pipeline Architecture

This document outlines the architecture, mathematical formulations, and execution sequence for modeling realistic secondary railway delay propagation across Indian Railways network.

---

## 1. Cascading Delay Pipeline Overview

Delays in railway networks do not occur in isolation. When an initial disturbance (weather, TSR, or traction failure) impacts a train, it creates ripple effects across physical tracks, stations, rolling stock, and crew rosters.

```
                                [Primary Disturbance: Weather, TSR, Congestion]
                                                       │
                                                       ▼
   [05CascadeBlockHeadway.py]         ──► Following trains delayed by signaling headway
                                                       │
                                                       ▼
   [06CascadeJunctionStarvation.py]    ──► Arriving trains held at outer signals for platforms
                                                       │
                                                       ▼
   [07CascadeTurnaroundLinkage.py]     ──► Paired return services delayed by late rake arrival
                                                       │
                                                       ▼
   [08CascadeCrossingConflicts.py]     ──► Opposing trains held on single-line loop tracks
                                                       │
                                                       ▼
   [09CascadeCrewDutyExpiry.py]       ──► Duty hour timeouts trigger 45-90 min relief halts
                                                       │
                                                       ▼
   [10CascadePipelineSimulation.py]    ──► Master simulation runner & API endpoint adapter
```

---

## 2. Module Specifications

### Module 05: Block Section Headway Queuing (`05CascadeBlockHeadway.py`)
- **Mechanism**: Corridors are partitioned into signaling block sections. If Train $A$ (leading) experiences delay, trailing Train $B$ traveling in the same direction cannot enter the block section until the mandatory safety headway ($t_{headway} \approx 7\text{--}10\text{ mins}$) has elapsed.
- **Formulation**:
  $$\Delta_{headway} = \max(0, t_{dep, A} + \Delta_A + t_{headway} - (t_{dep, B} + \Delta_B))$$
- In addition, restrictive signal aspects (yellow/double-yellow) impose kinetic deceleration and acceleration penalties ($\sim 3\text{--}8\text{ mins}$).
- **Output**: `HeadwayDelay.csv`

---

### Module 06: Junction & Platform Starvation (`06CascadeJunctionStarvation.py`)
- **Mechanism**: Major terminals and junctions have finite platform tracks. When an arriving delayed train occupies a platform beyond its scheduled departure plus dwell clearance buffer, succeeding incoming trains are held at the home/outer signal.
- **Formulation**:
  $$\Delta_{junction} = \max(0, \text{Actual Clearance Time of Preceding Train} - \text{Scheduled Arrival of Following Train})$$
- **Output**: `PlatformAllocDelay.csv`

---

### Module 07: Rake & Locomotive Turnaround Linkage (`07CascadeTurnaroundLinkage.py`)
- **Mechanism**: Train rakes are shared across paired services (e.g., Up/Down pairs like 12001 $\leftrightarrow$ 12002). Mandatory turnaround maintenance and cleaning buffers are enforced (30–60 mins for Shatabdi/Vande Bharat, 120–180 mins for Mail/Express).
- **Formulation**:
  $$\Delta_{turnaround, outbound} = \max(0, t_{arr, inbound} + \Delta_{inbound} + t_{turnaround\_buffer} - t_{dep, outbound})$$
- **Output**: `ServicingDelay.csv`

---

### Module 08: Single-Track / Crossing Conflicts (`08CascadeCrossingConflicts.py`)
- **Mechanism**: On bidirectional single-line track corridors, opposing trains (Up vs Down) must cross at crossing loop stations. If one train is late, the oncoming train is detained on the loop line until the block section is vacated.
- **Precedence Rule**: Higher tier trains (`T1_PREMIUM` > `T2_SUPERFAST` > `T3_EXPRESS`) receive precedence at the crossing station, shifting delay onto the lower-tier service.
- **Output**: `SingleTrackDelay.csv`

---

### Module 09: Crew & Loco Pilot Duty Expiry (`09CascadeCrewDutyExpiry.py`)
- **Mechanism**: Enforces Indian Railways Hours of Employment and Regulation (HOER) statutory 10-hour continuous running duty limit.
- **Formulation**:
  $$\text{Total Duty Time} = \text{Scheduled Duration} + \text{Cumulative Delay}$$
  $$\text{If } \text{Total Duty Time} > 600\text{ mins (10 hrs)} \implies \Delta_{crew} = \text{Uniform}(45, 90)\text{ mins (Lobby Relief)}$$
- **Output**: `TiredCrewDelay.csv`

---

### Module 10: Master Pipeline Simulation & Endpoint Adapter (`10CascadePipelineSimulation.py`)
- **Purpose**: Chains all modules sequentially. Accepts dynamic parameters (adverse weather, corridor congestion, headway sensitivity, crew duty limits) to produce comprehensive network delay predictions.
- **Exposed Function**: `simulate_cascading_pipeline(weather='Clear', priority_congestion='None', tsr_level='None', ...)`
- **Output**: `FinalOrchestraOutput.csv` with complete audit trail of primary vs cascading delay components and final timetable status (`ON_TIME` vs `LATE`).
- **Exposed Function**: `simulate_cascading_pipeline(weather='Clear', priority_congestion='None', tsr_level='None', ...)`
- **Output**: `FinalOrchestraOutput.csv` with complete audit trail of primary vs cascading delay components and final timetable status (`ON_TIME` vs `LATE`).

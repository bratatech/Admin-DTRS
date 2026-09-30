# Indian Railways Delay Pipeline: Complete Architectural Specification

This document provides a comprehensive technical breakdown of every script in the `BlackSheep/Pipelines/` directory. It details the operational purpose of each module, the input files referenced, the output files created, and every attribute and metric calculated throughout the multi-stage simulation pipeline.

---

## 1. Executive Pipeline Architecture Overview

The Indian Railways Cascade Simulation Engine operates on a **Three-Tier Computational Architecture**:

1. **Primary Shock Layer**: Models localized, exogenous physical disturbances (weather penalties, track speed restrictions / TSR, locomotive tractive effort, and kinetic deceleration/acceleration braking cycles).
2. **Secondary Cascading Propagation Layer**: Propagates knock-on network ripple delays through 5 sequential bottleneck stages (block headway, platform starvation, rake turnaround, single-track crossing conflicts, and crew duty timeout).
3. **Timetable Slack (EA) Absorption & Net ETA Layer**: Balances gross accumulated disturbances against allotted timetable cushioning (`extra_time_mins` and `net_slack_mins`) using tier-calibrated recovery factors to determine final punctual arrival (`ON_TIME` vs `LATE`).

```
+-------------------------------------------------------------------------------+
|                             RAW SOURCE DATASETS                               |
|   TrainsMetadata_DND.csv (10,620 trains) | TrainSchedules_DND.csv (210k halts)|
+---------------------------------------+---------------------------------------+
                                        |
                                        v
                           [01Preprocess.py]
                                        |
             +--------------------------+--------------------------+
             |                                                     |
             v                                                     v
[GenerateTRETARoutes.py]                              [01bKineticAccelDecelDelay.py]
(TRETARoutes.csv, TRETAZoneElements.csv)             (SlowAccDelay.csv - Kinetic Drag)
             |                                                     |
             +--------------------------+--------------------------+
                                        |
                                        v
                          [02GeneratePermutations.py]
                           (PnCOutput.csv - 45 Permutations)
                                        |
                                        v
                    +---------------------------------------+
                    |       CASCADING DELAY PIPELINE        |
                    |                                       |
                    |  Stage 1: [05CascadeBlockHeadway.py]  |
                    |           --> HeadwayDelay.csv        |
                    |                                       |
                    |  Stage 2: [06CascadeJunctionStarv.py] |
                    |           --> PlatformAllocDelay.csv  |
                    |                                       |
                    |  Stage 3: [07CascadeTurnaround.py]    |
                    |           --> ServicingDelay.csv      |
                    |                                       |
                    |  Stage 4: [08CascadeCrossingConf.py]  |
                    |           --> SingleTrackDelay.csv    |
                    |                                       |
                    |  Stage 5: [09CascadeCrewDutyExpiry.py]|
                    |           --> TiredCrewDelay.csv      |
                    +-------------------+-------------------+
                                        |
                                        v
                                 [Orchestrar.py]
                                        |
                    +-------------------+-------------------+
                    |                                       |
                    v                                       v
        [FinalOrchestraOutput.csv]             [GenerateMasterPnC.py]
      (Net Delay, ETA, Status)            (masterPnC.csv - 38,880 Matrix)
```

---

## 2. Exhaustive Per-File Analysis

### 2.1. `01Preprocess.py`
* **File Name**: `BlackSheep/Pipelines/01Preprocess.py`
* **Exact Role & Purpose**:
  The foundational data engineering script for the entire codebase. It parses raw, non-standardized NTES timetable strings, merges schedule halt records with fleet metadata, assigns operational priority tiers (`T1_PREMIUM`, `T2_SUPERFAST`, `T3_EXPRESS`), and calculates the physical running parameters, scheduled halt durations, kinetic braking allowances, and the true calibrated Extra Time / Net Slack (`EA`).
* **Referenced Files (Inputs)**:
  - `Train-Data/TrainsMetadata_DND.csv`: Raw NTES train metadata for 10,620 trains (travel time, train types, source/destination).
  - `Train-Data/TrainSchedules_DND.csv`: Raw timetable halt sequences and distances across 210,746 station stops.
* **Created Files (Outputs)**:
  - `Train-Data/EACalculation.csv`: Master preprocessed dataset containing base physical metrics and calibrated timetable slack for all 10,620 trains.
* **Attributes & Features Created / Calculated**:
  | Attribute Name | Data Type | Formula / Description |
  | :--- | :--- | :--- |
  | `duration_mins` | Integer | Total scheduled journey time parsed from `travel_time` (e.g. `40:45 Hrs.` -> `2445` mins). |
  | `halt_mins` | Integer | Dwell duration at each station stop parsed from `halt_time` (e.g. `10 Min` -> `10`, `01:10 Hr` -> `70`). |
  | `total_halt_count` | Integer | Total count of scheduled halts (`count(sr_no)`). |
  | `total_halt_duration` | Integer | Sum of all scheduled halt dwell times across the journey (`sum(halt_mins)`). |
  | `total_distance_km` | Float | Maximum cumulative route distance (`max(dist_km)`). |
  | `train_tier` | String | Priority classification: `T1_PREMIUM` (Vande Bharat, Rajdhani, Shatabdi, Duronto), `T2_SUPERFAST`, or `T3_EXPRESS`. |
  | `effective_speed_kmph`| Float | Realistic commercial cruising speed: `90.0` (T1), `68.0` (T2), `55.0` (T3). |
  | `halt_kinetic_rate` | Float | Kinetic stopping and starting penalty: `1.85` mins (T1), `2.15` mins (T2), `2.35` mins (T3). |
  | `ideal_running_mins` | Float | Pure cruising motion time at booked speed: `(total_distance_km / effective_speed_kmph) * 60` (capped at 88% of duration). |
  | `accel_decel_delay_mins`| Float | Kinetic time lost braking to and accelerating from halts: `(total_halt_count - 1) * halt_kinetic_rate + halt_kinetic_rate`. |
  | `gross_physical_mins`| Float | Physical travel time: `ideal_running_mins + total_halt_duration + accel_decel_delay_mins`. |
  | `extra_time_mins` | Float | Gross timetable buffer over pure cruising: `max(0, duration_mins - ideal_running_mins)`. |
  | `net_slack_mins` | Float | **Calibrated Net Slack / Cushion (EA)**: Timetable margin remaining after subtracting cruising, scheduled halts, AND kinetic deceleration/acceleration: `max(0, duration_mins - gross_physical_mins)`. |

---

### 2.2. `01bKineticAccelDecelDelay.py`
* **File Name**: `BlackSheep/Pipelines/01bKineticAccelDecelDelay.py`
* **Exact Role & Purpose**:
  Simulates Newtonian physical dynamics of heavy locomotive traction and braking deceleration. Uses the **Davis Drag Equation** ($R = A + Bv + Cv^2$) and locomotive tractive effort curves (WAP-7, WAP-5, WAP-4, WDP-4D) to compute the exact kinetic time loss per scheduled stop and unplanned Temporary Speed Restriction (TSR) caution order.
  *Key Operational Principle*: It separates the nominal kinetic time already budgeted into the Indian Railways Working Time Table (WTT) from the **unplanned kinetic delay** caused by train overload drag and unscheduled TSR slow-down cycles.
* **Referenced Files (Inputs)**:
  - `Train-Data/EACalculation.csv`: Train tiers, halt counts, and route endpoints.
* **Created Files (Outputs)**:
  - `Train-Data/SlowAccDelay.csv`: Physical kinetic acceleration and deceleration profile dataset.
* **Attributes & Features Created / Calculated**:
  | Attribute Name | Data Type | Formula / Description |
  | :--- | :--- | :--- |
  | `governing_cruise_speed_kmph` | Float | `min(track_speed_limit, coach_max_speed, loco_max_speed)`. |
  | `total_train_weight_tonnes` | Float | Rolling stock mass: locomotive tare weight + coach tare + passenger payload (tonnes). |
  | `braking_deceleration_ms2` | Float | Emergency/service braking deceleration rate: `0.80` (T1 disc), `0.70` (T2 air), `0.60` (T3 clasp). |
  | `effective_acceleration_ms2`| Float | Net tractive acceleration after Davis aerodynamic and rolling resistance: `(TractiveEffort - DavisDrag) / (RotaryInertia * TotalMass)`. |
  | `actual_loss_per_stop_mins` | Float | Physical time loss per full stop cycle: `(v1 / 2) * (1/d + 1/a) / 60`. |
  | `wtt_budgeted_allowance_mins`| Float | WTT schedule budgeted allowance: `1.80` mins (T1), `2.15` mins (T2/T3). |
  | `net_unplanned_delay_per_stop_mins` | Float | Excess kinetic stopping time beyond schedule allowance: `max(0, actual_loss - wtt_budgeted)`. |
  | `gross_physical_kinetic_time_mins` | Float | Fleet gross kinetic time spent stopping and starting across all halts (`~5.8 hrs` on long-haul routes). |
  | `unplanned_halt_excess_delay_mins` | Float | Total unplanned excess halt drag across the journey. |
  | `tsr_accel_decel_delay_mins` | Float | Unscheduled kinetic deceleration from cruising speed to 30 km/h caution order and re-acceleration. |
  | `total_accel_decel_delay_mins` | Float | Total unplanned kinetic delay: `unplanned_halt_excess_delay_mins + tsr_accel_decel_delay_mins` (`d_accel_decel`). |

---

### 2.3. `02GeneratePermutations.py`
* **File Name**: `BlackSheep/Pipelines/02GeneratePermutations.py`
* **Exact Role & Purpose**:
  Generates the **45 discrete operational scenario permutations** ($5 \text{ Weather} \times 3 \text{ Congestion} \times 3 \text{ TSR}$) for each train across the fleet ($10,620 \times 45 = 477,900$ scenario evaluations). It incorporates corridor sensitivity coefficients (e.g. Fog multiplier on Delhi-Howrah corridor = 3.0) and applies a 5% baseline timetable buffer deduction.
* **Referenced Files (Inputs)**:
  - `Train-Data/EACalculation.csv`: Fleet metadata, train tiers, durations, and stations.
* **Created Files (Outputs)**:
  - `Train-Data/PnCOutput.csv`: Master matrix of 477,900 evaluated scenario permutations.
* **Attributes & Features Created / Calculated**:
  | Attribute Name | Data Type | Formula / Description |
  | :--- | :--- | :--- |
  | `weather` | String | Scenario weather condition: `Clear`, `Fog`, `Heavy_Rain`, `Thunderstorm`, `Snow`. |
  | `priority_congestion` | String | Line capacity / Overtake density: `None`, `Low`, `High`. |
  | `tsr_level` | String | Speed restriction intensity: `None`, `Minor` (2 zones), `Major` (4 zones). |
  | `d_weather` | Float | Weather shock penalty scaled by corridor-specific weather coefficients. |
  | `d_priority` | Float | Overtake siding detention based on train priority tier (T1 = 0m, T2 = 15-35m, T3 = 30-75m). |
  | `d_tsr_accel` | Float | Speed restriction traversal overhead (`7.5` mins per TSR zone). |
  | `predicted_delay_mins` | Integer | Baseline primary delay: `max(0, d_weather + d_priority + d_tsr_accel - 0.05 * duration_mins)`. |

---

### 2.4. `05CascadeBlockHeadway.py`
* **File Name**: `BlackSheep/Pipelines/05CascadeBlockHeadway.py`
* **Exact Role & Purpose**:
  **Cascading Stage 1 (M05)**: Simulates block section headway queuing and signal aspect deceleration. When a leading train is delayed on a route corridor zone, trailing trains traveling in the same direction cannot enter the block until the mandatory safety headway separation (default: 8.0 mins) is restored.
  *Key Operational Principle*: Implements the **Track Occupancy Rule**: if a train blocking the route zone is delayed by $X$ minutes, the trailing train directly inherits that delay plus a 3.0-minute signal aspect caution drag.
* **Referenced Files (Inputs)**:
  - `Train-Data/TrainSchedules_DND.csv`: Real station halt sequences and departure times.
  - `Train-Data/EACalculation.csv`: Fleet metadata and tiers.
  - `Train-Data/PnCOutput.csv`: Initial primary delay per train for the specified scenario.
  - `Train-Data/TRETARoutes.csv`: Canonical route identifiers and zone mappings.
* **Created Files (Outputs)**:
  - `Train-Data/HeadwayDelay.csv`: Headway conflict simulation results.
* **Attributes & Features Created / Calculated**:
  | Attribute Name | Data Type | Formula / Description |
  | :--- | :--- | :--- |
  | `treta_zone_id` | String | Directional station-hop block section (`station_code -> next_station`). |
  | `actual_dep_mins` | Float | Scheduled departure time plus accumulated primary delay (`dep_mins + primary_delay_mins`). |
  | `headway_delay_mins` | Float | Detention incurred when `prev_actual_dep + headway > scheduled_dep`: `max(prev_primary_delay, prev_actual_dep + headway - dep_mins)`. |
  | `signal_aspect_delay_mins` | Float | Deceleration penalty (`3.0` mins) incurred approaching yellow/double-yellow aspects behind an occupied block. |
  | `sections_with_headway_conflict`| Integer | Total count of route block sections where headway queuing occurred. |
  | `max_single_headway_delay` | Float | Maximum single headway detention on any block section. |
  | `total_headway_delay_mins` | Float | Fleet-aggregated headway queuing delay (capped at 120.0 mins). |
  | `cumulative_delay_after_m05`| Float | Running total delay: `primary_delay_mins + total_headway_delay_mins`. |

---

### 2.5. `06CascadeJunctionStarvation.py`
* **File Name**: `BlackSheep/Pipelines/06CascadeJunctionStarvation.py`
* **Exact Role & Purpose**:
  **Cascading Stage 2 (M06)**: Simulates platform allocation bottlenecks and outer home signal detention at major railway junctions and terminal hubs (e.g. New Delhi, Howrah, Mumbai CSMT).
  *Key Operational Principle*: Uses an event-driven **Min-Heap Priority Queue** tracking real-time platform release times. When all physical platforms at a station are occupied by delayed trains, incoming arrivals are held at outer home signals until a reception line is cleared.
* **Referenced Files (Inputs)**:
  - `Train-Data/HeadwayDelay.csv`: Upstream cumulative delays from Stage 1.
  - `Train-Data/TrainSchedules_DND.csv`: Station arrival timings, dwell times, and station traffic densities.
* **Created Files (Outputs)**:
  - `Train-Data/PlatformAllocDelay.csv`: Junction platform starvation simulation results.
* **Attributes & Features Created / Calculated**:
  | Attribute Name | Data Type | Formula / Description |
  | :--- | :--- | :--- |
  | `platform_capacity` | Integer | Dynamically assigned platform berths based on call volume (e.g. $\ge 400$ calls = 12 platforms; $\ge 200$ = 8; $\ge 100$ = 5). |
  | `platform_release_mins` | Float | Timestamp when a berthing train vacates the platform: `actual_arr_mins + dwell_mins + clearance_margin_mins`. |
  | `outer_signal_delay_mins`| Float | Detention spent waiting at the home signal: `max(0, earliest_free_platform_time - actual_arr_mins)`. |
  | `junctions_starved` | Integer | Number of junction stations where outer home signal detention was suffered. |
  | `max_junction_delay` | Float | Maximum detention experienced at any single junction. |
  | `total_junction_delay_mins`| Float | Total platform starvation delay across the trip (capped at 45.0 mins). |
  | `cumulative_delay_after_m06`| Float | Running total delay: `cumulative_delay_after_m05 + total_junction_delay_mins`. |

---

### 2.6. `07CascadeTurnaroundLinkage.py`
* **File Name**: `BlackSheep/Pipelines/07CascadeTurnaroundLinkage.py`
* **Exact Role & Purpose**:
  **Cascading Stage 3 (M07)**: Simulates secondary propagation across shared rolling stock rakes.
  *Key Operational Principle*: Identifies paired reverse train services (e.g. 12001 NDLS-BPL Shatabdi paired with 12002 BPL-NDLS Shatabdi). When an inbound train arrives late at its terminal, the paired outbound service cannot depart on time if the remaining layover is shorter than the mandatory pit-line maintenance, secondary examination, and cleaning buffer (60 mins for T1, 90 mins for T2, 120 mins for T3).
* **Referenced Files (Inputs)**:
  - `Train-Data/PlatformAllocDelay.csv`: Upstream cumulative delays from Stage 2.
  - `Train-Data/EACalculation.csv`: Fleet tiers and endpoint stations.
  - `Train-Data/TrainSchedules_DND.csv`: Origin departure and destination arrival timetable records.
* **Created Files (Outputs)**:
  - `Train-Data/ServicingDelay.csv`: Rake turnaround linkage simulation results.
* **Attributes & Features Created / Calculated**:
  | Attribute Name | Data Type | Formula / Description |
  | :--- | :--- | :--- |
  | `paired_train_no` | Integer | Matched paired service sharing the same physical rake (`cand = t1 + 1 if t1 % 2 != 0 else t1 - 1`). |
  | `actual_dest_arr_mins` | Float | Inbound train actual arrival time at terminal: `dest_arr_mins + cumulative_delay_after_m06`. |
  | `origin_dep_mins` | Float | Scheduled outbound departure time of paired service. |
  | `turnaround_delay_mins`| Float | Delay propagated to outbound service: `max(0, required_buffer - (outbound_sched_dep - inbound_actual_arr))` (capped at 120.0 mins). |
  | `cumulative_delay_after_m07`| Float | Running total delay: `cumulative_delay_after_m06 + turnaround_delay_mins`. |

---

### 2.7. `08CascadeCrossingConflicts.py`
* **File Name**: `BlackSheep/Pipelines/08CascadeCrossingConflicts.py`
* **Exact Role & Purpose**:
  **Cascading Stage 4 (M08)**: Simulates bidirectional track conflicts on single-line corridors.
  *Key Operational Principle*: Detects simultaneous opposing movements (UP vs DOWN trains) entering a single-track block between two stations. Resolves crossing precedence using **Tier Precedence Ranking** (`T1_PREMIUM` > `T2_SUPERFAST` > `T3_EXPRESS`). The subordinate train is held in a crossing loop siding while the higher-priority opposing train traverses the single line.
* **Referenced Files (Inputs)**:
  - `Train-Data/ServicingDelay.csv`: Upstream cumulative delays from Stage 3.
  - `Train-Data/TrainSchedules_DND.csv`: Station sequence timings and directions.
  - `Train-Data/EACalculation.csv`: Fleet tiers for precedence ranking.
* **Created Files (Outputs)**:
  - `Train-Data/SingleTrackDelay.csv`: Crossing conflict simulation results.
* **Attributes & Features Created / Calculated**:
  | Attribute Name | Data Type | Formula / Description |
  | :--- | :--- | :--- |
  | `corridor` | String | Undirected block segment identifier (`station_A <-> station_B`). |
  | `direction` | String | Traffic direction: `UP` (alphabetical order) or `DOWN`. |
  | `rank` | Integer | Precedence ranking: `3` (T1 Premium), `2` (T2 Superfast), `1` (T3 Express). |
  | `crossing_conflicts_count` | Integer | Total count of crossing loop stops endured by the subordinate train. |
  | `max_single_crossing_delay` | Float | Maximum single siding wait time awaiting opposing train clearance. |
  | `total_crossing_delay_mins` | Float | Total crossing loop detention across the route: `(Opposing Delay + Traversal Time + Clearance)` (capped at 45.0 mins). |
  | `cumulative_delay_after_m08`| Float | Running total delay: `cumulative_delay_after_m07 + total_crossing_delay_mins`. |

---

### 2.8. `09CascadeCrewDutyExpiry.py`
* **File Name**: `BlackSheep/Pipelines/09CascadeCrewDutyExpiry.py`
* **Exact Role & Purpose**:
  **Cascading Stage 5 (M09)**: Simulates continuous duty timeouts of running staff (Loco Pilots, Assistant Loco Pilots, and Train Managers) under statutory Indian Railways **Hours of Employment and Regulation (HOER)** rules (statutory 10-hour limit).
  *Key Operational Principle*: When cumulative operational delays push continuous duty beyond 10 hours and cumulative delay exceeds 45 minutes, the train is halted at the nearest crew lobby awaiting mobilization of an emergency standby relief crew (45 to 75 minutes penalty).
* **Referenced Files (Inputs)**:
  - `Train-Data/SingleTrackDelay.csv`: Upstream cumulative delays from Stage 4.
  - `Train-Data/EACalculation.csv`: Journey durations, distances, and allotted buffers.
* **Created Files (Outputs)**:
  - `Train-Data/TiredCrewDelay.csv`: Crew duty expiry simulation results.
* **Attributes & Features Created / Calculated**:
  | Attribute Name | Data Type | Formula / Description |
  | :--- | :--- | :--- |
  | `duty_limit_exceeded` | Boolean | True if `(duration_mins + cumulative_delay_after_m08 > 600.0)` AND `cumulative_delay_after_m08 >= 45.0`. |
  | `crew_relief_delay_mins` | Float | Emergency crew lobby mobilization wait time (random uniform `45.0` to `75.0` mins). |
  | `total_cascading_delay_mins`| Float | Total accumulated cascading delay: `d_headway + d_junction + d_turnaround + d_crossing + d_crew`. |
  | `gross_delay_mins` | Float | Total Gross Disturbance: `primary_delay_mins + total_cascading_delay_mins`. |
  | `cumulative_delay_after_m09`| Float | Equal to `gross_delay_mins`. |

---

### 2.9. `CalculateExtraTime.py`
* **File Name**: `BlackSheep/Pipelines/CalculateExtraTime.py`
* **Exact Role & Purpose**:
  Auditing and statistical verification utility for timetable slack engineering. Compares hypothetical operational policies:
  1. Nominal Average Speeds (85 km/h for T1, 45 km/h for T2/T3).
  2. 90% of Maximum Permissible Speed (MPS: 117 km/h for T1, 99 km/h for T2/T3).
  *Key Result*: Proves that nominal average speeds yield negative extra time for 100% of Superfast trains (because Indian Railways statutory Superfast minimum commercial speed is 55 km/h), confirming why the calibrated physics-based formula in `01Preprocess.py` is mathematically required.
* **Referenced Files (Inputs)**:
  - `Train-Data/EACalculation.csv`: Fleet metadata, durations, distances, halts, and slack values.
* **Created Files (Outputs)**:
  - Outputs audit tables directly to terminal/logs (does not overwrite CSVs).
* **Attributes & Features Evaluated**:
  - `nom_ideal`, `nom_extra`, `neg_pct`, `eff_v`, `Negative Buffer %`.

---

### 2.10. `GenerateMasterPnC.py`
* **File Name**: `BlackSheep/Pipelines/GenerateMasterPnC.py`
* **Exact Role & Purpose**:
  Constructs the comprehensive **Master Permutation & Combination Matrix (`master_pnc`)** across **10 discrete operational disturbance dimensions** ($3 \times 5 \times 3 \times 3 \times 4 \times 3 \times 3 \times 2 \times 2 \times 2 = 38,880 \text{ unique combinations}$).
  Computes the exact deterministic compounding delay resolution for every permutation and uploads the result directly to Neon PostgreSQL table `master_pnc` with a local CSV backup.
* **Referenced Files (Inputs)**:
  - None (Generates pure Cartesian product algorithmically).
* **Created Files (Outputs)**:
  - `Train-Data/masterPnC.csv`: 38,880 rows of scenario disturbance resolutions (~6.5 MB).
  - Neon PostgreSQL Table: `master_pnc` (with primary key on `combination_id`).
* **Attributes & Features Created / Calculated**:
  | Attribute Name | Category | Description |
  | :--- | :--- | :--- |
  | `combination_id` | Identifier | Unique surrogate key (1 to 38,880). |
  | `train_tier` | Dimension | `T1_PREMIUM`, `T2_SUPERFAST`, `T3_EXPRESS_PASSENGER`. |
  | `weather` | Dimension | `Clear`, `Fog`, `Heavy_Rain`, `Thunderstorm`, `Snow`. |
  | `tsr_level` | Dimension | `None`, `Minor`, `Major`. |
  | `priority_congestion` | Dimension | `None`, `Low`, `High`. |
  | `treta_block_occupancy` | Dimension | `Track_Clear`, `Preceding_Delayed_Minor`, `Preceding_Delayed_Moderate`, `Preceding_Delayed_Severe`. |
  | `crossing_conflict` | Dimension | `Double_Quad_Track`, `Minor_Crossing_Wait`, `Major_Crossing_Wait`. |
  | `alarm_chain_pulling` | Dimension | `0_Events`, `1_Event`, `2_Events`. |
  | `engine_failure` | Dimension | `Nominal`, `Failure`. |
  | `terminal_platform_hold` | Dimension | `Platform_Available`, `Outer_Holding`. |
  | `crew_duty_status` | Dimension | `Duty_Valid`, `Duty_Exceeded`. |
  | `primary_delay_mins` | Metric | `d_weather + d_tsr + d_acp + d_engine_failure`. |
  | `cascade_delay_mins` | Metric | `d_headway_treta + d_crossing + d_platform_hold + d_crew_delay`. |
  | `gross_delay_mins` | Metric | `primary_delay_mins + cascade_delay_mins`. |
  | `nominal_ea_buffer_mins`| Metric | Nominal timetable buffer: 45m (T1), 90m (T2), 135m (T3). |
  | `absorbed_by_ea_mins` | Metric | Buffer recovery: `min(gross_delay * recovery_rate, nominal_ea * 0.20)`. |
  | `net_delay_mins` | Metric | `max(0, gross_delay - absorbed_by_ea)`. |
  | `arrival_status` | Metric | Strict lateness classification: `ON_TIME` if `net_delay <= 5.0` mins, else `LATE`. |

---

### 2.11. `GenerateTRETARoutes.py`
* **File Name**: `BlackSheep/Pipelines/GenerateTRETARoutes.py`
* **Exact Role & Purpose**:
  Generates the canonical **`TRETAroutenumber`** identifier for all 10,620 trains and partitions each train's route into sequential station-hop **`treta_zone_element`** segments.
  This establishes the common spatial coordinate system enabling the simulation of trailing headway queuing, engine failure shockwaves, and track occupancy ripple effects.
* **Referenced Files (Inputs)**:
  - `Train-Data/TrainSchedules_DND.csv`: Real timetable stops and sequences.
  - `Train-Data/TrainsMetadata_DND.csv`: Source and destination endpoints.
  - `Train-Data/EACalculation.csv`: Existing preprocessed dataset (to inject `treta_route_number`).
* **Created Files (Outputs)**:
  - `Train-Data/TRETARoutes.csv`: Mapping of each train to its canonical `treta_route_number` and total route zones.
  - `Train-Data/TRETAZoneElements.csv`: Detailed table of 200,126 directional station-to-station block hops.
  - Updates `Train-Data/EACalculation.csv` with column `treta_route_number`.
* **Attributes & Features Created / Calculated**:
  | Attribute Name | Data Type | Formula / Description |
  | :--- | :--- | :--- |
  | `treta_zone_element` | String | Block segment identifier: `station_code -> next_stn` (e.g. `NDLS->AGC`). |
  | `hop_index` | Integer | Sequential index of the block hop along the train's route (1 to $N$). |
  | `total_treta_zones` | Integer | Total number of block zones along the entire route. |
  | `treta_route_number` | String | Canonical route identifier: `TRETA-<SRC>-<DST>-Z<total_zones>-<train_no>` (e.g. `TRETA-NDLS-BPL-Z10-12001`). |

---

### 2.12. `MLCompoundDelayModel.py`
* **File Name**: `BlackSheep/Pipelines/MLCompoundDelayModel.py`
* **Exact Role & Purpose**:
  The core object-oriented machine learning simulation engine (`RailwayDelayMLSimulator`). Encapsulates:
  - Multi-domain scenario vector evaluation across 6 operational domains (Weather, Track, Dispatch, Traction, Terminal, Crew).
  - Live simulation of abnormal failure events:
    - **Alarm Chain Pulling (ACP)**: Direct +15.0 mins primary shock per event.
    - **Preceding Train Block on TRETA Zone**: Trailing train directly inherits blocking train delay.
    - **Locomotive Engine Failure**: +15.0 mins direct delay plus +12.5 mins downstream zone ripple propagation.
  - Matrix generation utility (`--generate_matrix`) producing `Train-Data/MLCompoundPermutations.csv`.
* **Referenced Files (Inputs)**:
  - `Train-Data/EACalculation.csv`: Preprocessed fleet metadata and calibrated EA slack.
* **Created Files (Outputs)**:
  - `Train-Data/MLCompoundPermutations.csv` (when executed with `--generate_matrix`).
* **Attributes & Features Created / Calculated**:
  - Breakdown dictionaries: `primary_breakdown` (`d_weather`, `d_track`, `d_traction`, `d_kinetic`, `d_chain_pulling`, `d_engine_failure`, `PrimaryDelay`).
  - Cascading breakdown: `cascade_breakdown` (`d_headway`, `d_junction`, `d_turnaround`, `d_crossing`, `d_crew`, `CascadeDelay`).
  - Mathematical resolution: `math_resolution` (`grossDelay`, `EA_allotted_mins`, `Absorbed_by_EA`, `NetDelay`, `Compound_ETA`, `Arrival_Status`).

---

### 2.13. `Orchestrar.py`
* **File Name**: `BlackSheep/Pipelines/Orchestrar.py`
* **Exact Role & Purpose**:
  The **Master Pipeline Orchestrator**. Dynamically imports and executes the entire cascading pipeline sequentially:
  1. `01bKineticAccelDecelDelay` $\rightarrow$ Computes kinetic drag (`SlowAccDelay.csv`).
  2. `05CascadeBlockHeadway` $\rightarrow$ Simulates headway queuing (`HeadwayDelay.csv`).
  3. `06CascadeJunctionStarvation` $\rightarrow$ Simulates platform outer signal detention (`PlatformAllocDelay.csv`).
  4. `07CascadeTurnaroundLinkage` $\rightarrow$ Simulates rake turnaround delay (`ServicingDelay.csv`).
  5. `08CascadeCrossingConflicts` $\rightarrow$ Simulates single-line crossing loop detention (`SingleTrackDelay.csv`).
  6. `09CascadeCrewDutyExpiry` $\rightarrow$ Simulates HOER relief timeout (`TiredCrewDelay.csv`).
  7. **Consolidation**: Computes `PrimaryDelay`, `CascadeDelay`, `grossDelay`, applies tier-based recovery factors against calibrated Net Slack (`EA_allotted_mins`), and derives `NetDelay`, `Final_ETA_mins`, and `Arrival_Status`.
* **Referenced Files (Inputs)**:
  - `Train-Data/EACalculation.csv`, `Train-Data/TrainSchedules_DND.csv`, `Train-Data/PnCOutput.csv`, `Train-Data/TRETARoutes.csv`.
  - Upstream intermediate files generated during the pipeline run.
* **Created Files (Outputs)**:
  - `Train-Data/FinalOrchestraOutput.csv`: The master consolidated fleet prediction dataset for all 10,620 trains.
* **Attributes & Features Created / Calculated**:
  | Attribute Name | Formula / Description |
  | :--- | :--- |
  | `d_weather_tsr_priority` | Upstream primary shock delay from weather, speed restrictions, and overtake sidings. |
  | `d_accel_decel` | Unplanned kinetic deceleration & acceleration loss from `SlowAccDelay.csv`. |
  | `PrimaryDelay` | Total primary disturbance: `d_weather_tsr_priority + d_accel_decel`. |
  | `d_headway` | Block section headway queuing delay (Stage 1). |
  | `d_junction` | Outer home signal detention from occupied junction platforms (Stage 2). |
  | `d_turnaround` | Delayed departure caused by late inbound paired rake turnaround (Stage 3). |
  | `d_crossing` | Single-track crossing loop detention awaiting opposing higher-priority train (Stage 4). |
  | `d_crew` | Emergency relief crew standby waiting penalty when 10-hr HOER duty is exceeded (Stage 5). |
  | `CascadeDelay` | `d_headway + d_junction + d_turnaround + d_crossing + d_crew`. |
  | `grossDelay` | Total physical disturbance: `PrimaryDelay + CascadeDelay`. |
  | `EA_allotted_mins` | Calibrated Net Slack buffer from `EACalculation.csv`. |
  | `Absorbed_by_EA_mins` | Buffer recovery: `min(grossDelay * recovery_rate, EA_allotted_mins * 0.50)` where recovery rate = `0.40` (T1), `0.25` (T2), `0.15` (T3). |
  | `NetDelay` | Net destination arrival delay: `max(0.0, grossDelay - Absorbed_by_EA_mins)`. |
  | `ScheduledArrival_mins` | Timetable scheduled arrival timestamp (equal to journey `duration_mins`). |
  | `Final_ETA_mins` | Predicted actual arrival timestamp: `ScheduledArrival_mins + NetDelay`. |
  | `Arrival_Status` | Punctuality verdict: `ON_TIME` if `NetDelay <= 5.0` mins, else `LATE`. |

---

### 2.14. `__init__.py`
* **File Name**: `BlackSheep/Pipelines/__init__.py`
* **Exact Role & Purpose**:
  Python package initialization marker. Allows modules within `Pipelines/` to be cleanly imported across `AppServer.py`, `SheepBand.py`, and root scripts as a native Python namespace package.
* **Referenced Files**: None.
* **Created Files**: None.
* **Attributes Created**: None.

---

## 3. End-to-End File Dependency & Artifact Matrix

| Script Name | Input Files Referenced | Output Files Generated / Updated | Core Output Attributes |
| :--- | :--- | :--- | :--- |
| `01Preprocess.py` | `TrainsMetadata_DND.csv`<br/>`TrainSchedules_DND.csv` | `Train-Data/EACalculation.csv` | `duration_mins`, `total_halt_count`, `total_halt_duration`, `ideal_running_mins`, `extra_time_mins`, `net_slack_mins`, `train_tier` |
| `01bKineticAccelDecelDelay.py`| `EACalculation.csv` | `Train-Data/SlowAccDelay.csv` | `governing_cruise_speed_kmph`, `total_train_weight_tonnes`, `actual_loss_per_stop_mins`, `total_accel_decel_delay_mins` |
| `02GeneratePermutations.py` | `EACalculation.csv` | `Train-Data/PnCOutput.csv` | `weather`, `priority_congestion`, `tsr_level`, `predicted_delay_mins` (45 permutations/train) |
| `05CascadeBlockHeadway.py` | `TrainSchedules_DND.csv`<br/>`EACalculation.csv`<br/>`PnCOutput.csv`<br/>`TRETARoutes.csv` | `Train-Data/HeadwayDelay.csv` | `treta_zone_id`, `actual_dep_mins`, `headway_delay_mins`, `total_headway_delay_mins`, `cumulative_delay_after_m05` |
| `06CascadeJunctionStarvation.py`| `HeadwayDelay.csv`<br/>`TrainSchedules_DND.csv` | `Train-Data/PlatformAllocDelay.csv` | `platform_capacity`, `outer_signal_delay_mins`, `total_junction_delay_mins`, `cumulative_delay_after_m06` |
| `07CascadeTurnaroundLinkage.py` | `PlatformAllocDelay.csv`<br/>`EACalculation.csv`<br/>`TrainSchedules_DND.csv` | `Train-Data/ServicingDelay.csv` | `paired_train_no`, `turnaround_delay_mins`, `cumulative_delay_after_m07` |
| `08CascadeCrossingConflicts.py` | `ServicingDelay.csv`<br/>`TrainSchedules_DND.csv`<br/>`EACalculation.csv` | `Train-Data/SingleTrackDelay.csv` | `corridor`, `crossing_conflicts_count`, `total_crossing_delay_mins`, `cumulative_delay_after_m08` |
| `09CascadeCrewDutyExpiry.py` | `SingleTrackDelay.csv`<br/>`EACalculation.csv` | `Train-Data/TiredCrewDelay.csv` | `duty_limit_exceeded`, `crew_relief_delay_mins`, `total_cascading_delay_mins`, `gross_delay_mins` |
| `CalculateExtraTime.py` | `EACalculation.csv` | *None (Audit Report)* | `nom_ideal`, `nom_extra`, `Negative Buffer %` evaluation |
| `GenerateMasterPnC.py` | *None (Combinatorial generator)* | `Train-Data/masterPnC.csv`<br/>*Neon DB Table: `master_pnc`* | `combination_id`, 10 condition dimensions, `primary_delay_mins`, `cascade_delay_mins`, `gross_delay_mins`, `net_delay_mins`, `arrival_status` (38,880 rows) |
| `GenerateTRETARoutes.py` | `TrainSchedules_DND.csv`<br/>`TrainsMetadata_DND.csv`<br/>`EACalculation.csv` | `Train-Data/TRETARoutes.csv`<br/>`Train-Data/TRETAZoneElements.csv`<br/>*Updates `EACalculation.csv`* | `treta_route_number`, `treta_zone_element`, `hop_index`, `total_treta_zones` |
| `MLCompoundDelayModel.py` | `EACalculation.csv` | `Train-Data/MLCompoundPermutations.csv` *(Optional)* | Multi-domain delay vectors, ACP and engine failure breakdown, `grossDelay`, `Absorbed_by_EA`, `NetDelay`, `Arrival_Status` |
| `Orchestrar.py` | All upstream pipeline artifacts & intermediate CSVs | `Train-Data/FinalOrchestraOutput.csv` | Master synthesis: `PrimaryDelay`, `CascadeDelay`, `grossDelay`, `EA_allotted_mins`, `Absorbed_by_EA_mins`, `NetDelay`, `Final_ETA_mins`, `Arrival_Status` |

---

## 4. Mathematical Compounding Delay Resolution Summary

The cascading pipeline resolves every train journey through six governing mathematical formulations:

```text
[PRIMARY DISTURBANCES]
D_Primary = d_weather + d_TSR + d_overtake + d_accel_decel + d_ACP + d_engine

[SECONDARY CASCADING PROPAGATION]
D_Cascade = d_headway + d_junction + d_turnaround + d_crossing + d_crew

[TOTAL GROSS DISTURBANCE]
D_Gross = D_Primary + D_Cascade

[TIMETABLE SLACK (EA) RECOVERY]
D_Absorbed = min(D_Gross * R_Tier, 0.50 * EA_allotted)
  where R_Tier:
    • T1_PREMIUM    = 0.40  (40% dynamic buffer recovery)
    • T2_SUPERFAST  = 0.25  (25% dynamic buffer recovery)
    • T3_EXPRESS    = 0.15  (15% dynamic buffer recovery)

[FINAL NET DESTINATION DELAY]
D_Net = max(0.0, D_Gross - D_Absorbed)

[ESTIMATED TIME OF ARRIVAL & STATUS]
Final_ETA = Scheduled_Arrival + D_Net
Arrival_Status = "ON_TIME" if D_Net <= 5.0 mins else "LATE"
```

---

> [!NOTE]
> **Summary of Key Takeaways**:
> 1. All physical, speed restriction, and kinetic loss delays feed into **`PrimaryDelay`**.
> 2. All corridor headway, outer signal holding, paired rake servicing, single-track crossing, and crew timeout delays feed into **`CascadeDelay`**.
> 3. Timetable slack (**`EA`**) dynamically absorbs disturbances based on dispatch priority tiers.
> 4. The strict lateness threshold across Indian Railways simulation is **5.0 minutes**.


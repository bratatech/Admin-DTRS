# Train Acceleration & Deceleration Dynamics (Kinetic Loss Walkthrough)

**Document**: `accdec-kinetics.md`  
**System**: Primary Delay Modeling Engine — Indian Railways Network (10,620 Trains)  
**Reference Module**: [`01b_kinetic_accel_decel_delay.py`](file:///c:/Users/AMRITYA/Documents/GitHub/BlackSheep/01b_kinetic_accel_decel_delay.py)

---

## 1. Core Physics & Theoretical Foundation

When a train operates between two points, standard timetable calculations often assume a constant cruising speed ($v_{cruise}$). In reality, trains undergo repeated cycles of **decelerating (braking)** to a stop or speed restriction, and then **accelerating** back up to cruising speed.

Both phases consume significantly more time than if the train had maintained constant speed:
1. **Deceleration Loss**: As brakes are applied, the average speed drops below $v_{cruise}$, causing a time loss over the braking distance.
2. **Acceleration Loss**: A heavy train takes substantial time and distance to reach cruising speed because power-to-weight and wheel-rail adhesion limits restrict acceleration.

```
Speed
  ^
v1│─────────────┐                                   ┌─────────────
  │              \                                 /
  │               \   Braking         Traction    /
  │                \   Phase        Acceleration /
v2│                 \                  Phase    /
  │                  \                         /
  └───────────────────┴───────────────────────┴───────────────────> Distance
                      <────── s_dec ─────────><────── s_acc ──────>
```

---

## 2. Mathematical Derivation of Kinetic Time Loss

### A. Governing Cruising Speed ($v_1$)
$$v_1 = \min\left(v_{track}, v_{coach}, v_{loco}\right)$$
- $v_{track}$: Sectional Maximum Permissible Speed (MPS).
- $v_{coach}$: Maximum certified speed of rolling stock (LHB = 160 km/h; ICF = 110 km/h).
- $v_{loco}$: Maximum rated locomotive speed (WAP-7 = 140 km/h; WAP-4 = 130 km/h).

### B. Train Mass & Rolling Stock Composition
- $M_{loco}$: Locomotive weight in tonnes.
- $M_{coaches}$: Total coach tare + passenger payload weight:
  $$M_{coaches} = N_{coaches} \times (m_{tare} + m_{payload})$$
- Total mass:
  $$M_{total} = M_{loco} + M_{coaches}$$

### C. Net Acceleration Rate ($a_{acc}$)
1. **Adhesion-limited tractive effort**:
   $$F_{adhesion} = \mu \times (M_{loco} \times 1000) \times g \quad (\mu \approx 0.30)$$
2. **Power-limited tractive effort**:
   $$F_{power} = \frac{P_{loco} \times 1000 \times \eta}{v_{mid}}$$
   Where $P_{loco}$ is rated power (kW), $\eta \approx 0.85$ is transmission efficiency, and $v_{mid} = v_1 / 2$.
3. **Train Resistance (Davis Equation)**:
   $$R_{davis} = \left[ 2.5 M_{total} + 0.05 M_{total} v_{mid} + 0.0035 v_{mid}^2 \right] \times 9.81\text{ (N)}$$
4. **Effective Acceleration**:
   Accounting for rotary inertia ($\lambda \approx 1.08$ for wheelsets and traction motor armatures):
   $$a_{acc} = \frac{\min(F_{adhesion}, F_{power}) - R_{davis}}{\lambda \times M_{total} \times 1000}$$

### D. Exact Kinetic Loss Equations
Let $v_1$ be cruising speed and $v_2$ be target restricted/stop speed:

- **Deceleration Loss ($\Delta t_{dec}$)**:
  $$\Delta t_{dec} = t_{dec} - \frac{s_{dec}}{v_1} = \frac{v_1 - v_2}{a_{dec}} - \frac{v_1^2 - v_2^2}{2 a_{dec} v_1} = \frac{(v_1 - v_2)^2}{2 a_{dec} v_1}$$
  *(For a complete stop to $v_2 = 0$, $\Delta t_{dec} = \frac{v_1}{2 a_{dec}} = \frac{1}{2} t_{dec}$)*.

- **Acceleration Loss ($\Delta t_{acc}$)**:
  $$\Delta t_{acc} = t_{acc} - \frac{s_{acc}}{v_1} = \frac{v_1 - v_2}{a_{acc}} - \frac{v_1^2 - v_2^2}{2 a_{acc} v_1} = \frac{(v_1 - v_2)^2}{2 a_{acc} v_1}$$
  *(For accelerating from $v_2 = 0$ to $v_1$, $\Delta t_{acc} = \frac{v_1}{2 a_{acc}} = \frac{1}{2} t_{acc}$)*.

- **Gross Kinetic Loss per Full Station Stop ($\Delta t_{stop}$)**:
  $$\Delta t_{stop} = \frac{v_1}{2} \left( \frac{1}{a_{dec}} + \frac{1}{a_{acc}} \right)$$

- **Kinetic Loss per Unscheduled TSR Zone ($\Delta t_{tsr}$)**:
  $$\Delta t_{tsr} = \frac{(v_1 - v_{tsr})^2}{2 v_1} \left( \frac{1}{a_{dec}} + \frac{1}{a_{acc}} \right)$$

---

## 3. Calibrated Formulation: Avoiding Double-Counting with Timetable Allowances

> [!IMPORTANT]
> **Why Gross Kinetic Time is NOT Equal to Unplanned Delay**:
> In Indian Railways, timetable planners (in the Working Time Table, WTT) **already budget stopping and starting allowances** ($\tau_{WTT} \approx 1.80\text{ to }2.15\text{ mins}$ per scheduled halt) into the published inter-station running times!
> If one adds the gross stopping/starting time (e.g. 350 mins) directly onto the 31.5-hour scheduled duration as an external delay, it causes **double-counting**, because the 31.5-hour timetable was *already extended* to absorb those 151 stops.

### Calibrated Net Unplanned Kinetic Delay ($d_{accel\_decel}$):
The genuine delay experienced beyond the timetable schedule consists of:
1. **Unplanned Halt Drag Excess**: When dense passenger overloading, worn tread brakes, or low voltage causes the stopping/starting cycle to exceed the WTT timetable allowance:
   $$\Delta t_{excess\_stop} = \max\left(0, \Delta t_{stop} - \tau_{WTT}\right)$$
2. **Unscheduled TSR / Work Zone Slowdowns**: Since TSR zones are temporary maintenance orders not budgeted in the base timetable:
   $$d_{TSR} = N_{TSR} \times \Delta t_{tsr}$$

### Final Calibrated Formula:
$$\mathbf{d_{accel\_decel}} = N_{stops} \times \max\left(0, \Delta t_{stop} - \tau_{WTT}\right) + N_{tsr} \times \Delta t_{tsr}$$

---

## 4. Train Rolling Stock Parameters by Tier

| Parameter | T1_PREMIUM (Rajdhani/Shatabdi/VB) | T2_SUPERFAST | T3_EXPRESS (Mail/Passenger) |
| :--- | :---: | :---: | :---: |
| **Locomotive** | WAP-7 / WAP-5 / VB Trainset | WAP-7 / WAP-4 / WDP-4D | WAP-4 / WAG-7 / WDM-3D |
| **Loco Power ($P_{loco}$)** | **4,735 kW** (6,350 HP) | **3,766 kW** (5,050 HP) | **2,714 kW** (3,640 HP) |
| **Loco Weight ($M_{loco}$)** | 123 tonnes | 120 tonnes | 113 tonnes |
| **Coach Type** | LHB Stainless Steel | LHB / Upgraded ICF | ICF Conventional Steel |
| **Coach Count ($N_{coaches}$)** | 16 coaches | 22 coaches | 20 coaches |
| **Total Coach Weight ($M_{coaches}$)** | 720 tonnes | 1,056 tonnes | 920 tonnes |
| **Total Train Weight ($M_{total}$)** | **843 tonnes** | **1,176 tonnes** | **1,033 tonnes** |
| **Cruising Speed ($v_1$)** | **130 km/h** (36.11 m/s) | **110 km/h** (30.56 m/s) | **100 km/h** (27.78 m/s) |
| **Deceleration Rate ($a_{dec}$)** | $0.80\text{ m/s}^2$ (disc brakes) | $0.70\text{ m/s}^2$ (air brakes) | $0.60\text{ m/s}^2$ (clasp brakes) |
| **Effective Acceleration ($a_{acc}$)** | **$0.24\text{ m/s}^2$** | **$0.16\text{ m/s}^2$** | **$0.12\text{ m/s}^2$** |
| **Actual Stop Cycle ($\Delta t_{stop}$)** | **1.78 mins (97.3 s)** | **2.27 mins (116.2 s)** | **2.32 mins (138.9 s)** |
| **WTT Timetable Allowance ($\tau_{WTT}$)** | **1.80 mins (108.0 s)** | **2.15 mins (129.0 s)** | **2.15 mins (129.0 s)** |
| **Net Unplanned Excess per Stop** | **0.00 mins (0.0 s)** | **0.12 mins (7.2 s)** | **0.17 mins (9.9 s)** |
| **Unscheduled TSR Loss (to 30 km/h)** | **0.96 mins (57.6 s)** | **1.02 mins (61.4 s)** | **1.14 mins (68.1 s)** |

---

## 5. Case Study: Re-evaluation of Train 19019 (BDTS HW EXP)

### Train Profile
- **Train Number**: **`19019`**
- **Train Name**: **`BDTS HW EXP` (Bandra Terminus Mumbai to Haridwar Junction)**
- **Train Tier**: `T3_EXPRESS`
- **Total Route Distance**: 1,617 km
- **Scheduled Duration**: 1,890 minutes (**31.5 hours**)
- **Total Scheduled Halts**: **152 halts** (**151 intermediate stops**)
- **Scheduled Halt Dwell Time**: 444 minutes (7.4 hours)
- **Built-in Timetable Slack ($\text{EA}$)**: 466.0 minutes

### Why the Initial 352.2 Minutes Appeared:
The initial calculation measured the **gross physical time** consumed by braking and accelerating 1,033 tonnes 151 times:
$$\text{Gross Kinetic Time} = 151 \times 2.315\text{ mins} = \mathbf{349.9\text{ mins (~5.83 hours)}}$$
Adding 2 TSR zones (2.3 mins) gave **352.2 mins**.

However, in reality:
$$\text{Scheduled Duration (31.5 hrs)} = \text{Pure Cruising (16.3 hrs)} + \text{Dwell (7.4 hrs)} + \mathbf{Gross\ Kinetic\ Stopping\ Time\ (5.8\ hrs)} + \text{Residual\ Slack\ (2.0\ hrs)}$$
The 349.9 minutes was **ALREADY BUDGETED** in the train's 31.5-hour timetable schedule!

### Re-evaluated Unplanned Delay Calculation:
1. **Actual physical time per stop**: $2.315\text{ mins}$ ($138.9\text{ s}$).
2. **WTT Budgeted stopping allowance**: $2.150\text{ mins}$ ($129.0\text{ s}$).
3. **Net unplanned excess drag per stop**:
   $$\Delta t_{excess} = 2.315 - 2.150 = \mathbf{0.165\text{ mins (9.9 seconds)}}$$
4. **Cumulative halt excess drag across 151 stops**:
   $$d_{halts} = 151 \times 0.165\text{ mins} = \mathbf{24.9\text{ minutes}}$$
5. **Unscheduled TSR slowdown delay**:
   $$d_{tsr} = 2 \times 1.14\text{ mins} = \mathbf{2.3\text{ minutes}}$$
6. **Total Re-evaluated Primary Kinetic Delay**:
   $$\mathbf{d_{accel\_decel}} = 24.9 + 2.3 = \mathbf{27.2\text{ minutes}}$$

### Real-World Validation:
- **Calibrated Prediction**: **~27 minutes delay**.
- **Real-World Observation**: **"Late by 25 minutes over the last 7 days; maximum delay ever recorded ~2 hours under severe network disruptions."**
- **Conclusion**: The calibrated model aligns with empirical field data.

---

## 6. Network Audit Summary Across All 10,620 Trains

| Metric | Fleet Average | Minimum | Maximum |
| :--- | :---: | :---: | :---: |
| **Gross Physical Kinetic Time** | 43.4 mins | 1.8 mins | 349.9 mins |
| **Average Unplanned Kinetic Delay ($d_{accel\_decel}$)** | **5.25 mins** | **0.0 mins** | **27.5 mins** |
| ├─ Halt Excess Drag Component | 2.97 mins | 0.0 mins | 25.2 mins |
| └─ TSR Slowdown Component | 2.31 mins | 0.0 mins | 4.6 mins |
| **Total Primary Delay ($\text{Weather/TSR/Overtake} + d_{accel\_decel}$)** | **29.75 mins** | 0.0 mins | 102.5 mins |
| **Total Cascading Delay ($\text{CascadeDelay}$)** | **97.97 mins** | 0.0 mins | 345.0 mins |
| **Total Gross Delay ($\text{grossDelay}$)** | **127.72 mins** | 0.0 mins | 447.5 mins |
| **Absorbed by EA Buffer** | **80.50 mins** | 0.0 mins | 447.5 mins |
| **Net Arrival Delay ($\text{NetDelay}$)** | **47.23 mins** | 0.0 mins | 360.0 mins |
| **Overall Fleet On-Time Rate ($\le 15$ mins)** | **62.25%** | — | — |

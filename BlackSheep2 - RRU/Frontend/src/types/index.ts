export interface TrainSearchResult {
  train_no: string;
  train_name: string;
  train_tier: string;
  source: string;
  destination: string;
  corridor_slug: string;
  corridor_name: string;
}

export interface RouteSegment {
  treta_segment_number: string;
  train_no?: string;
  corridor?: string;
  corridor_slug?: string;
  segment_type?: string;
  from_station_code: string;
  from_station_name: string;
  from_state?: string;
  from_state_border_key?: string;
  to_station_code: string;
  to_station_name: string;
  to_state?: string;
  to_state_border_key?: string;
  is_border_crossing: number | string;
  state_border_transition?: string;
  segment_distance_km: number | string;
  arr_time?: string;
  dep_time?: string;
  day?: number | string;
  label?: string;
}

export interface TrainInfo {
  error?: string;
  train_no: string;
  train_no_raw: string;
  train_name: string;
  train_tier: string;
  source_station: string;
  destination_station: string;
  total_distance_km: number;
  total_halts: number;
  EA_allotted_mins: number;
  scheduled_arrival: string;
  scheduled_arrival_day: number;
  relevant_corridor_slug: string;
  relevant_corridor_name: string;
  default_is_border_crossing: number;
  available_segments_count: number;
  segments: RouteSegment[];
  inherited_delay_info?: DbComparisonResult;
  default_speedup_recovery_mins?: number;
}

export interface WinDbRowRecord {
  source: string;
  train_no: string;
  segment?: string;
  baseline_delay_mins?: number;
  sim_delay_mins?: number;
  arrival_status: string;
  updated_at?: string | null;
}

export interface CascadedEffectRecord {
  id: number;
  trigger_train_no: string;
  trigger_segment: string;
  affected_train_no: string;
  affected_train_name: string;
  affected_tier: string;
  conflict_type: string;
  transmitted_delay_mins: number;
  pushed_at: string;
}

export interface DbComparisonResult {
  train_no: string;
  clean_train_no: string;
  has_inherited_delay: boolean;
  inherited_delay_mins: number;
  conflict_type: string;
  trigger_train_no: string;
  source_explanation: string;
  win_db_master: WinDbRowRecord;
  win_sim_db: WinDbRowRecord;
  cascaded_records: CascadedEffectRecord[];
}

export interface OperationalCases {
  train_tier: string;
  weather: string;
  tsr_level: string;
  priority_congestion: string;
  treta_block_occupancy: string;
  crossing_conflict: string;
  alarm_chain_pulling: string;
  engine_failure: string;
  terminal_platform_hold: string;
  crew_duty_status: string;
  treta_segment_number?: string;
  section_delay_mins?: number;
  speedup_recovery_mins?: number;
  multi_station_injections_count?: number;
}

export interface PrimaryBreakdown {
  d_inherited_cascade?: number;
  d_weather: number;
  d_tsr: number;
  d_chain_pulling: number;
  d_engine_failure: number;
  d_section_delay?: number;
  section_delay_reason?: string;
  PrimaryDelay: number;
}

export interface CascadeBreakdown {
  d_headway: number;
  d_crossing: number;
  d_platform_hold: number;
  d_crew: number;
  CascadeDelay: number;
}

export interface MathResolution {
  grossDelay: number;
  speedup_recovered_mins?: number;
  effective_grossDelay?: number;
  Absorbed_by_EA: number;
  NetDelay: number;
  ScheduledDestinationArrival: string;
  Predicted_ETA: string;
  Arrival_Status: 'ON_TIME' | 'LATE';
}

export interface SegmentBreakdown {
  treta_segment_number: string;
  corridor: string;
  segment_type: string;
  from_station: string;
  from_state_border: string;
  to_station: string;
  to_state_border: string;
  is_border_crossing: number;
  state_border_transition: string;
  segment_distance_km: number;
  segment_primary_delay: number;
  segment_cascade_delay: number;
  segment_gross_delay: number;
  segment_absorbed_ea: number;
  segment_net_delay: number;
  segment_scheduled_arrival: string;
  segment_predicted_eta: string;
  segment_status: 'ON_TIME' | 'LATE';
}

export interface ExplanationResponse {
  status: string;
  net_delay_mins: number;
  gross_delay_mins: number;
  primary_reasons: string[];
  cascade_reasons: string[];
  recovery_summary: string;
  segment_context: string;
  dispatch_directive: string;
  full_narrative: string;
}

export interface CascadedTrain {
  train_no: string;
  train_name: string;
  train_tier: string;
  segment_hop?: string;
  station_section?: string;
  corridor_segment?: string;
  scheduled_window: string;
  conflict_type: string;
  transmitted_delay_mins: number;
  impact_severity?: string;
}

export interface CascadingChainNode {
  order: number;
  role: string;
  train_no: string;
  train_name: string;
  train_tier: string;
  delay_mins: number;
  impact: string;
  propagated_eta_impact: string;
}

export interface CascadedDelays {
  target_segment_number: string;
  total_affected_trains: number;
  cumulative_knock_on_mins: number;
  has_cascading_delay?: boolean;
  overlaid_trains: CascadedTrain[];
  cascading_chain?: CascadingChainNode[];
}

export interface StationCircumstance {
  station_code: string;
  station_name?: string;
  segment_number?: string;
  segment_label?: string;
  weather?: string;
  tsr_level?: string;
  priority_congestion?: string;
  treta_block_occupancy?: string;
  crossing_conflict?: string;
  alarm_chain_pulling?: string;
  engine_failure?: string;
  terminal_platform_hold?: string;
  crew_duty_status?: string;
  speedup_recovery_mins?: number;
  section_delay_mins?: number;
  reason?: string;
}

export interface StationAhead {
  seq: number;
  station_code: string;
  station_name: string;
  dist_km: number;
  is_ahead: boolean;
  is_origin: boolean;
  scheduled_arr: string;
  day: number;
  incoming_delay_mins?: number;
  gross_delay_mins: number;
  speedup_recovered_mins?: number;
  absorbed_ea_mins: number;
  net_delay_mins: number;
  predicted_arrival: string;
  delay_absorbed: boolean;
  status: string;
  note: string;
  circumstance_tags?: string[];
}

export interface PredictionResult {
  train_no: string;
  train_name: string;
  train_tier: string;
  source_station: string;
  destination_station: string;
  total_distance_km: number;
  total_halts: number;
  EA_allotted_mins: number;
  relevant_corridor_slug: string;
  relevant_corridor_name: string;
  applied_cases: OperationalCases;
  primary_breakdown: PrimaryBreakdown;
  cascade_breakdown: CascadeBreakdown;
  math_resolution: MathResolution;
  segment_breakdown: SegmentBreakdown | null;
  delay_origin_station?: string;
  ahead_stations?: StationAhead[];
  explanation: ExplanationResponse;
  cascaded_delays: CascadedDelays;
  d_inherited_cascade?: number;
  inherited_from_sim_db?: boolean;
  db_comparison?: DbComparisonResult;
}

export interface DbSimulationStatus {
  mode: 'PRISTINE' | 'SIMULATION_MODIFIED';
  modifications_count: number;
  last_updated: string | null;
  pushed_records_count: number;
  is_pristine: boolean;
  baseline_db?: string;
  simulation_db: string;
  [key: string]: any;
}

export interface NationalCorridor {
  corridor: string;
  corridor_slug: string;
  total_state_borders_crossed: number;
  state_borders_sequence: string;
  states_list: string;
}

export interface StateBorderDivision {
  state_border_key: string;
  state_name: string;
  state_code: string;
  total_stations_clubbed: number;
  corridor_stations_count: number;
  total_halt_events: number;
  primary_railway_zones: string;
  major_junctions: string;
  corridor_stations_list: string;
}


// -----------------------------------------------------------------------------
// LIVE GPS TELEMETRY & MATCHING TYPES
// -----------------------------------------------------------------------------

export interface LiveCurrentLocation {
  stationCode: string;
  stationName?: string;
  sequence: number;
  status: string;
  isHalt: boolean;
  isDiverted: boolean;
  isActualPosition: boolean;
  segmentProgress: number;
  speedKmh: number;
  bearingDegrees: number;
}

export interface LiveHalt {
  stationCode: string;
  stationName: string;
  sequence: number;
  distance: number;
}

export interface LiveException {
  type: string;
  message: string;
  diverted?: any;
}

export interface LiveRouteStation {
  sequence: number;
  stationCode: string;
  stationName: string;
  isHalt: boolean;
  scheduledArrival: string | null;
  scheduledDeparture: string | null;
  actualArrival: string | null;
  actualDeparture: string | null;
  delayArrival: number | null;
  delayDeparture: number | null;
  status: string;
  distance: number;
}

export interface LiveTelemetryData {
  trainNumber: string;
  trainName: string;
  startDate: string;
  lastUpdatedAt: string;
  status: string;
  delayMinutes: number;
  train?: any;
  currentLocation: LiveCurrentLocation;
  previousHalt?: LiveHalt | null;
  nextHalt?: LiveHalt | null;
  exceptions: LiveException[];
  route: LiveRouteStation[];
  isLive: boolean;
  meta?: any;
}

export interface LiveFrozenControls {
  corridor: string;
  border_crossing: string;
  selected_segment: string;
  segment_label: string;
  from_station_code: string;
  to_station_code: string;
  cases: OperationalCases;
  is_frozen: boolean;
  has_live_telemetry?: boolean;
  section_delay_mins?: number;
  lock_reason: string;
}

export interface LiveMatchResponse {
  [key: string]: any;
  success: boolean;
  train_no: string;
  train_name: string;
  raw_telemetry?: LiveTelemetryData;
  matched_combination: {
    combination_id: number;
    train_tier: string;
    weather: string;
    tsr_level: string;
    priority_congestion: string;
    treta_block_occupancy: string;
    crossing_conflict: string;
    alarm_chain_pulling: string;
    engine_failure: string;
    terminal_platform_hold: string;
    crew_duty_status: string;
    pnc_gross_delay: number;
    pnc_net_delay: number;
    has_diverted_exception: boolean;
  };
  frozen_controls: LiveFrozenControls;
  prediction: PredictionResult;
  sandbox_logged_db: string;
}

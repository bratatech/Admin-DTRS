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
}

export interface PrimaryBreakdown {
  d_weather: number;
  d_tsr: number;
  d_chain_pulling: number;
  d_engine_failure: number;
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

export interface CascadedDelays {
  target_segment_number: string;
  total_affected_trains: number;
  cumulative_knock_on_mins: number;
  overlaid_trains: CascadedTrain[];
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
  explanation: ExplanationResponse;
  cascaded_delays: CascadedDelays;
}

export interface DbSimulationStatus {
  mode: 'PRISTINE' | 'SIMULATION_MODIFIED';
  modifications_count: number;
  last_updated: string | null;
  pushed_records_count: number;
  is_pristine: boolean;
  master_db: string;
  simulation_db: string;
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


export interface DeonticModality {
  obligation: string[];
  prohibition: string[];
  permission: string[];
}

export interface BehavioralContract {
  preconditions: string[];
  postconditions: string[];
  error_conditions: string[];
  rate_limits: string[];
  deprecation_notices: string[];
  constraints: string[];
  modalities: DeonticModality;
}

export interface CodeMigration {
  language: string;
  v1_snippet: string;
  v2_snippet: string;
  explanation: string;
}

export interface BehavioralDifference {
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  is_breaking: boolean;
  v1_context?: string;
  v2_context?: string;
  explanation: string;
}

export interface EndpointChange {
  path: string;
  method: string;
  change_type: 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED';
  is_breaking: boolean;
  breaking_type: 'STRUCTURAL_BREAKING' | 'BEHAVIORAL_BREAKING' | 'DUAL_BREAKING' | 'NON_BREAKING' | 'UNCHANGED';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  confidence_score: number;
  v1_summary?: string;
  v2_summary?: string;
  v1_description?: string;
  v2_description?: string;
  semantic_similarity?: number;
  semantic_drift?: number;
  structural_changes: string[];
  v1_contracts?: BehavioralContract;
  v2_contracts?: BehavioralContract;
  behavioral_changes: BehavioralDifference[];
  consumer_impact: string;
  migration_recommendation: string;
  code_migration?: Record<string, CodeMigration>;
}

export interface ComparisonResponse {
  id: string;
  created_at: string;
  name?: string;
  description?: string;
  v1_filename: string;
  v2_filename: string;
  v1_title: string;
  v2_title: string;
  v1_version: string;
  v2_version: string;
  total_endpoints: number;
  total_changes: number;
  breaking_count: number;
  potentially_breaking_count: number;
  non_breaking_count: number;
  structural_breaking_count: number;
  behavioral_breaking_count: number;
  structural_changes_count: number;
  semantic_changes_count: number;
  risk_score: number;
  executive_summary: string;
  warnings: string[];
  endpoints: EndpointChange[];
  category_breakdown: Record<string, number>;
  severity_breakdown: Record<string, number>;
  raw_v1?: string;
  raw_v2?: string;
  model_info?: {
    model_name: string;
    is_loaded: boolean;
    backend: string;
  };
  metadata?: {
    analysis_id: string;
    created_at: string;
    api_name?: string;
    description?: string;
    v1_title: string;
    v1_version: string;
    v1_filename: string;
    v2_title: string;
    v2_version: string;
    v2_filename: string;
    processing_duration_ms: number;
    embedding_model: string;
    warnings: string[];
  };
  summary?: {
    total_endpoints: number;
    added_endpoints: number;
    removed_endpoints: number;
    modified_endpoints: number;
    structural_changes_count: number;
    semantic_drift_count: number;
    behavioral_changes_count: number;
    breaking_count: number;
    potentially_breaking_count: number;
    non_breaking_count: number;
    needs_review_count: number;
    overall_risk_score: number;
  };
  structural_changes?: any[];
  semantic_findings?: any[];
  behavioral_findings?: any[];
  impact_records?: any[];
}

export interface HistoryItemSummary {
  id: string;
  created_at: string;
  name?: string;
  v1_title: string;
  v2_title: string;
  v1_version: string;
  v2_version: string;
  v1_filename?: string;
  v2_filename?: string;
  total_endpoints: number;
  breaking_count: number;
  potentially_breaking_count?: number;
  non_breaking_count?: number;
  risk_score: number;
  status: string;
}

export interface ValidationResponse {
  is_valid: boolean;
  title: string;
  version: string;
  spec_type: string;
  endpoints_count: number;
  endpoints: string[];
  errors: string[];
  warnings: string[];
}

export interface SemanticTestResponse {
  semantic_similarity: number;
  semantic_drift: number;
  is_breaking: boolean;
  v1_contracts: BehavioralContract;
  v2_contracts: BehavioralContract;
  behavioral_changes: BehavioralDifference[];
  explanation: string;
}

export interface DashboardStatsResponse {
  total_analyses: number;
  total_structural_changes: number;
  total_semantic_changes: number;
  total_breaking_changes: number;
  total_potentially_breaking: number;
  total_non_breaking: number;
  successful_analyses: number;
  category_distribution: { name: string; value: number; fill: string }[];
  breaking_vs_non_breaking: { name: string; value: number; fill: string }[];
  recent_analyses: HistoryItemSummary[];
}

export interface EvaluationItem {
  endpoint_name: string;
  description_v1: string;
  description_v2: string;
  change_type: string;
  ground_truth_breaking: boolean;
  predicted_breaking_nlp: boolean;
  predicted_breaking_structural_only: boolean;
  semantic_similarity: number;
  detected_behavioral_reasons: string[];
}

export interface EvaluationMetrics {
  total_cases: number;
  nlp_enhanced: {
    precision: number;
    recall: number;
    f1_score: number;
    accuracy: number;
  };
  structural_only: {
    precision: number;
    recall: number;
    f1_score: number;
    accuracy: number;
  };
  confusion_matrix_nlp: {
    tp: number;
    fp: number;
    fn: number;
    tn: number;
  };
  confusion_matrix_structural: {
    tp: number;
    fp: number;
    fn: number;
    tn: number;
  };
  benchmark_dataset: EvaluationItem[];
  scientific_conclusion: string;
}

export interface SamplePair {
  id: string;
  title: string;
  description: string;
  v1_filename: string;
  v2_filename: string;
  v1_content: string;
  v2_content: string;
}

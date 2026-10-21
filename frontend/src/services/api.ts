import axios from 'axios';
import type {
  ComparisonResponse,
  HistoryItemSummary,
  EvaluationMetrics,
  SamplePair,
  ValidationResponse,
  SemanticTestResponse,
  DashboardStatsResponse
} from '../types/api';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
});

export const checkHealth = async () => {
  const res = await api.get('/health');
  return res.data;
};

export const getDashboardStats = async (): Promise<DashboardStatsResponse> => {
  const res = await api.get<DashboardStatsResponse>('/dashboard/stats');
  return res.data;
};

export const validateSpecification = async (
  content: string,
  filename: string = 'spec.yaml'
): Promise<ValidationResponse> => {
  const res = await api.post<ValidationResponse>('/validate', {
    content,
    filename,
  });
  return res.data;
};

export const testSemanticAnalysis = async (
  text_v1: string,
  text_v2: string,
  summary_v1: string = '',
  summary_v2: string = ''
): Promise<SemanticTestResponse> => {
  const res = await api.post<SemanticTestResponse>('/semantic-test', {
    text_v1,
    text_v2,
    summary_v1,
    summary_v2,
  });
  return res.data;
};

export const runStructuralDiff = async (
  v1_content: string,
  v2_content: string
): Promise<any[]> => {
  const res = await api.post<any[]>('/analyses/structural', {
    v1_content,
    v2_content
  });
  return res.data;
};

export const runBehavioralAnalysis = async (
  text_v1: string,
  text_v2: string
): Promise<any> => {
  const res = await api.post<any>('/analyses/behavioral', {
    text_v1,
    text_v2
  });
  return res.data;
};

export const getSamples = async (): Promise<SamplePair[]> => {
  const res = await api.get<SamplePair[]>('/samples');
  return res.data;
};

export const compareSpecifications = async (
  v1_content: string,
  v2_content: string,
  v1_filename: string = 'api_v1.yaml',
  v2_filename: string = 'api_v2.yaml',
  api_name?: string,
  description?: string
): Promise<ComparisonResponse> => {
  const res = await api.post<ComparisonResponse>('/compare', {
    v1_content,
    v2_content,
    v1_filename,
    v2_filename,
    api_name,
    description,
  });
  return res.data;
};

export const getAnalysisHistory = async (): Promise<HistoryItemSummary[]> => {
  const res = await api.get<HistoryItemSummary[]>('/history');
  return res.data;
};

export const getHistoricalComparison = async (id: string): Promise<ComparisonResponse> => {
  const res = await api.get<ComparisonResponse>(`/history/${id}`);
  return res.data;
};

export const deleteHistoricalComparison = async (id: string): Promise<void> => {
  await api.delete(`/history/${id}`);
};

export const getBenchmarkMetrics = async (): Promise<EvaluationMetrics> => {
  const res = await api.get<EvaluationMetrics>('/evaluation/benchmark');
  return res.data;
};

export const getStudentModelsEvaluation = async (): Promise<any> => {
  const res = await api.get('/evaluation/student-models');
  return res.data;
};

export const getDatasetProvenance = async (): Promise<any> => {
  const res = await api.get('/evaluation/dataset-provenance');
  return res.data;
};

export const getExportUrl = (id: string, format: 'csv' | 'html' | 'json'): string => {
  return `/api/analysis/${id}/export?format=${format}`;
};

export default api;

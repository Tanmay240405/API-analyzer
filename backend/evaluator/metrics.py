from typing import Dict, Any, List
from backend.models.schemas import EvaluationMetrics, EvaluationItem
from backend.evaluator.benchmarks import BENCHMARK_CASES
from backend.nlp.extractor import LinguisticContractExtractor
from backend.nlp.behavioral_diff import BehavioralComparator
from backend.nlp.embeddings import embedding_engine

def run_academic_benchmark() -> EvaluationMetrics:
    extractor = LinguisticContractExtractor()
    behavioral_diff = BehavioralComparator()

    items: List[EvaluationItem] = []

    # Counters for NLP-enhanced
    tp_nlp, fp_nlp, fn_nlp, tn_nlp = 0, 0, 0, 0
    # Counters for Structural only
    tp_str, fp_str, fn_str, tn_str = 0, 0, 0, 0

    for case in BENCHMARK_CASES:
        d1 = case["description_v1"]
        d2 = case["description_v2"]
        gt = case["ground_truth_breaking"]
        str_detects = case["structural_diff_detects"]

        # Run NLP extraction & comparison
        c1 = extractor.extract_contracts(d1)
        c2 = extractor.extract_contracts(d2)
        sim, drift, behav_diffs, is_behav_breaking = behavioral_diff.compare_behaviors(
            "", d1, "", d2, c1, c2
        )

        nlp_predicted_breaking = str_detects or is_behav_breaking or (drift > 0.35)
        str_predicted_breaking = str_detects

        reasons = [b.explanation for b in behav_diffs]
        if str_detects:
            reasons.append("Structural breaking contract detected in schema.")

        # Update NLP metrics
        if nlp_predicted_breaking and gt:
            tp_nlp += 1
        elif nlp_predicted_breaking and not gt:
            fp_nlp += 1
        elif not nlp_predicted_breaking and gt:
            fn_nlp += 1
        else:
            tn_nlp += 1

        # Update Structural metrics
        if str_predicted_breaking and gt:
            tp_str += 1
        elif str_predicted_breaking and not gt:
            fp_str += 1
        elif not str_predicted_breaking and gt:
            fn_str += 1
        else:
            tn_str += 1

        items.append(EvaluationItem(
            endpoint_name=case["endpoint_name"],
            description_v1=d1,
            description_v2=d2,
            change_type=case["change_type"],
            ground_truth_breaking=gt,
            predicted_breaking_nlp=nlp_predicted_breaking,
            predicted_breaking_structural_only=str_predicted_breaking,
            semantic_similarity=round(sim, 3),
            detected_behavioral_reasons=reasons
        ))

    def calc_scores(tp, fp, fn, tn):
        total = tp + fp + fn + tn
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        acc = (tp + tn) / total if total > 0 else 0.0
        return {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1, 4),
            "accuracy": round(acc, 4)
        }

    nlp_scores = calc_scores(tp_nlp, fp_nlp, fn_nlp, tn_nlp)
    str_scores = calc_scores(tp_str, fp_str, fn_str, tn_str)

    conclusion = (
        f"Empirical evaluation shows that Pure Structural Diff achieves only {str_scores['recall']*100:.1f}% Recall "
        f"due to severe False Negatives on undocumented behavioral tightening and async shifts. "
        f"In contrast, the NLP-Enhanced system attains {nlp_scores['recall']*100:.1f}% Recall and {nlp_scores['f1_score']*100:.1f}% F1-Score, "
        "successfully bridging the semantic gap in API version evolution analysis."
    )

    return EvaluationMetrics(
        total_cases=len(BENCHMARK_CASES),
        nlp_enhanced=nlp_scores,
        structural_only=str_scores,
        confusion_matrix_nlp={"tp": tp_nlp, "fp": fp_nlp, "fn": fn_nlp, "tn": tn_nlp},
        confusion_matrix_structural={"tp": tp_str, "fp": fp_str, "fn": fn_str, "tn": tn_str},
        benchmark_dataset=items,
        scientific_conclusion=conclusion
    )

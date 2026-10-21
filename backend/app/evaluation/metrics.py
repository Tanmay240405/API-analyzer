from typing import List, Tuple
from backend.app.schemas.evaluation import SystemMetricScores, ConfusionMatrix

class MetricCalculator:
    """
    Computes standard academic classification metrics: Precision, Recall, F1, Accuracy, and Confusion Matrix.
    """

    @staticmethod
    def calculate(ground_truths: List[bool], predictions: List[bool]) -> Tuple[SystemMetricScores, ConfusionMatrix]:
        if len(ground_truths) != len(predictions):
            raise ValueError("Ground truths and predictions must have identical lengths.")

        tp = 0
        fp = 0
        tn = 0
        fn = 0

        for y_true, y_pred in zip(ground_truths, predictions):
            if y_true and y_pred:
                tp += 1
            elif not y_true and y_pred:
                fp += 1
            elif not y_true and not y_pred:
                tn += 1
            elif y_true and not y_pred:
                fn += 1

        total = len(ground_truths)
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        accuracy = (tp + tn) / total if total > 0 else 0.0

        scores = SystemMetricScores(
            precision=round(precision, 4),
            recall=round(recall, 4),
            f1_score=round(f1, 4),
            accuracy=round(accuracy, 4)
        )

        matrix = ConfusionMatrix(tp=tp, fp=fp, tn=tn, fn=fn)
        return scores, matrix

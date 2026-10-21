"""
Training Script for Student 3: Behavioral Contract & Consumer Breaking Impact Classifier
NLP Task: Deontic Modality Extraction & Downstream Breakage Risk Classification
Architecture: Deontic Lexical & N-Gram Vectorizer + Multi-Head Neural / Gradient Ensemble Classifiers
"""

import os
import json
import time
import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neural_network import MLPClassifier
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, accuracy_score, f1_score, precision_score, recall_score

class DualBehavioralModel:
    """Joint model predicting both Deontic Modality (OBLIGATION, PROHIBITION, etc.) and Severity (CRITICAL, HIGH, etc.)"""
    def __init__(self):
        self.modality_pipeline = Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 3), lowercase=True, max_features=1200)),
            ("clf", MLPClassifier(hidden_layer_sizes=(64, 32), activation="relu", max_iter=300, random_state=42))
        ])
        from sklearn.linear_model import LogisticRegression
        self.severity_pipeline = Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), lowercase=True, max_features=800)),
            ("clf", LogisticRegression(C=2.0, max_iter=500, random_state=42))
        ])

    def fit(self, X, y_mod, y_sev):
        self.modality_pipeline.fit(X, y_mod)
        self.severity_pipeline.fit(X, y_sev)
        return self

    def predict(self, X):
        return {
            "modalities": self.modality_pipeline.predict(X),
            "severities": self.severity_pipeline.predict(X)
        }

    def predict_single(self, text):
        mod = self.modality_pipeline.predict([text])[0]
        sev = self.severity_pipeline.predict([text])[0]
        # Softmax confidence
        mod_prob = float(np.max(self.modality_pipeline.predict_proba([text])[0]))
        sev_prob = float(np.max(self.severity_pipeline.predict_proba([text])[0]))
        return {
            "modality": mod,
            "modality_confidence": round(mod_prob, 3),
            "severity": sev,
            "severity_confidence": round(sev_prob, 3)
        }

def train_student3():
    print("=" * 70)
    print("STUDENT 3: TRAINING BEHAVIORAL CONTRACT & IMPACT CLASSIFIER")
    print("NLP Task: Deontic Modality & Consumer Breakage Risk Classification")
    print("=" * 70)

    corpus_path = os.path.join(os.path.dirname(__file__), "..", "data", "corpus", "api_behavioral_corpus.json")
    with open(corpus_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    train_data = data["train_samples"]
    test_data = data["test_samples"]

    X_train = [item["clause"] for item in train_data]
    y_mod_train = [item["modality"] for item in train_data]
    y_sev_train = [item["severity"] for item in train_data]

    X_test = [item["clause"] for item in test_data]
    y_mod_test = [item["modality"] for item in test_data]
    y_sev_test = [item["severity"] for item in test_data]

    print(f"Loaded Corpus: {len(X_train)} train clauses, {len(X_test)} test clauses.")
    print(f"Modality Classes: {sorted(list(set(y_mod_train)))}")
    print(f"Severity Classes: {sorted(list(set(y_sev_train)))}")

    model = DualBehavioralModel()

    start_time = time.time()
    print("Training dual-head behavioral classifier on deontic clauses...")
    model.fit(X_train, y_mod_train, y_sev_train)
    training_time = round(time.time() - start_time, 2)

    # Evaluate Modality
    pred_mod = model.modality_pipeline.predict(X_test)
    mod_acc = float(accuracy_score(y_mod_test, pred_mod))
    mod_f1 = float(f1_score(y_mod_test, pred_mod, average="weighted", zero_division=0))

    # Evaluate Severity
    pred_sev = model.severity_pipeline.predict(X_test)
    sev_acc = float(accuracy_score(y_sev_test, pred_sev))
    sev_f1 = float(f1_score(y_sev_test, pred_sev, average="weighted", zero_division=0))

    print(f"\n--- Student 3 Test Results ---")
    print(f"Deontic Modality Accuracy: {mod_acc * 100:.1f}% (F1: {mod_f1 * 100:.1f}%)")
    print(f"Impact Severity Accuracy:  {sev_acc * 100:.1f}% (F1: {sev_f1 * 100:.1f}%)")
    print(f"Combined Training Time:    {training_time}s")

    # Save artifact
    output_dir = os.path.join(os.path.dirname(__file__), "..", "models", "student3_behavioral")
    os.makedirs(output_dir, exist_ok=True)
    model_path = os.path.join(output_dir, "model.joblib")
    metrics_path = os.path.join(output_dir, "metrics.json")

    joblib.dump(model, model_path)

    metrics = {
        "student": "Student 3",
        "task_name": "API Behavioral Deontic & Consumer Breakage Risk Classifier",
        "model_architecture": "Dual-Head (MLPClassifier + GradientBoostingClassifier)",
        "dataset_name": data["dataset_name"],
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "modality_classes": sorted(list(set(y_mod_train))),
        "severity_classes": sorted(list(set(y_sev_train))),
        "modality_accuracy": mod_acc,
        "modality_f1": mod_f1,
        "severity_accuracy": sev_acc,
        "severity_f1": sev_f1,
        "training_duration_seconds": training_time,
        "saved_model_path": model_path
    }

    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print(f"[SUCCESS] Student 3 model saved to: {model_path}")
    print(f"[SUCCESS] Metrics saved to: {metrics_path}\n")
    return metrics

if __name__ == "__main__":
    train_student3()

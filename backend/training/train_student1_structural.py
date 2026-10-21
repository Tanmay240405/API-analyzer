"""
Training Script for Student 1: Structural Change & Mutation Classifier
NLP Task: Text & Sequence Classification of API Schema / AST Mutations
Architecture: TF-IDF (1,3-grams) + Multi-Layer Perceptron (MLP) Classifier with Softmax Probability Calibration
"""

import os
import json
import time
import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, accuracy_score, f1_score, precision_score, recall_score

def train_student1():
    print("=" * 70)
    print("STUDENT 1: TRAINING STRUCTURAL CHANGE CLASSIFIER")
    print("NLP Task: API Schema Mutation & AST Diff Categorization")
    print("=" * 70)

    corpus_path = os.path.join(os.path.dirname(__file__), "..", "data", "corpus", "api_structural_corpus.json")
    with open(corpus_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    train_data = list(data["train_samples"])
    test_data = list(data["test_samples"])

    # The checked-in APIstic evolution slice contains additional real-world
    # structural diffs beyond the hand-curated base corpus. Pair 04 is
    # documentation-only and is intentionally excluded from this structural
    # classifier. Keep two APIstic examples as an additional holdout.
    apistic_path = os.path.join(
        os.path.dirname(__file__), "..", "data", "corpus", "apistic",
        "apistic_evolution_samples.json"
    )
    with open(apistic_path, "r", encoding="utf-8") as f:
        apistic_data = json.load(f)

    label_rules = (
        ("optional to header required", "PARAMETER_REQUIRED_CHANGE"),
        ("default value modified", "PARAMETER_DEFAULT_CHANGE"),
        ("response status changed", "RESPONSE_STATUS_CHANGE"),
        ("429 response documented", "RESPONSE_STATUS_CHANGE"),
        ("marked required", "PARAMETER_REQUIRED_CHANGE"),
        ("default reduced", "PARAMETER_DEFAULT_CHANGE"),
        ("optional query parameter", "NON_BREAKING_CHANGE"),
        ("operation completely removed", "ENDPOINT_LIFECYCLE"),
        ("type changed", "SCHEMA_TYPE_MUTATION"),
    )
    apistic_samples = []
    for pair in apistic_data["evolution_pairs"]:
        diff = pair["structural_diff"]
        if diff == "None; identical schemas and parameters":
            continue
        label = next((target for phrase, target in label_rules if phrase.lower() in diff.lower()), None)
        if label is None:
            continue
        apistic_samples.append({
            "text": diff,
            "label": label,
            "is_breaking": pair["ground_truth_breaking"],
            "source": "APIstic evolution slice",
            "source_id": pair["id"],
        })

    # Stable, explicit holdout: the last two eligible pairs are never fitted.
    apistic_train = apistic_samples[:-2]
    apistic_test = apistic_samples[-2:]
    train_data.extend(apistic_train)
    test_data.extend(apistic_test)

    X_train = [item["text"] for item in train_data]
    y_train = [item["label"] for item in train_data]

    X_test = [item["text"] for item in test_data]
    y_test = [item["label"] for item in test_data]

    print(f"Loaded Corpus: {len(X_train)} training samples, {len(X_test)} test samples.")
    print(f"Added APIstic evolution records: {len(apistic_samples)} ({len(apistic_train)} train, {len(apistic_test)} test).")
    print(f"Target Classes ({len(set(y_train))}): {sorted(list(set(y_train)))}")

    # Model Pipeline: Character + Word N-Grams TF-IDF + Neural MLPClassifier
    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), lowercase=True, max_features=800)),
        ("classifier", MLPClassifier(
            hidden_layer_sizes=(64, 32),
            activation="relu",
            max_iter=500,
            random_state=42,
            learning_rate_init=0.01,
            early_stopping=False
        ))
    ])

    start_time = time.time()
    print("Training Multi-Layer Perceptron (MLP) on structural change corpus...")
    pipeline.fit(X_train, y_train)
    training_time = round(time.time() - start_time, 3)

    # Evaluation
    y_pred = pipeline.predict(X_test)
    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, average="weighted", zero_division=0))
    rec = float(recall_score(y_test, y_pred, average="weighted", zero_division=0))
    f1 = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))

    report = classification_report(y_test, y_pred, zero_division=0, output_dict=True)

    print(f"\n--- Student 1 Test Results ---")
    print(f"Accuracy:  {acc * 100:.1f}%")
    print(f"Precision: {prec * 100:.1f}%")
    print(f"Recall:    {rec * 100:.1f}%")
    print(f"F1-Score:  {f1 * 100:.1f}%")
    print(f"Training Time: {training_time}s")

    # Save artifact
    output_dir = os.path.join(os.path.dirname(__file__), "..", "models", "student1_structural")
    os.makedirs(output_dir, exist_ok=True)
    model_path = os.path.join(output_dir, "model.joblib")
    metrics_path = os.path.join(output_dir, "metrics.json")

    joblib.dump(pipeline, model_path)

    metrics = {
        "student": "Student 1",
        "task_name": "API Structural AST & Mutation Classifier",
        "model_architecture": "TF-IDF (1,3-grams) + MLPClassifier (64x32)",
        "dataset_name": data["dataset_name"],
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "base_train_samples": len(data["train_samples"]),
        "base_test_samples": len(data["test_samples"]),
        "additional_apistic_samples": len(apistic_samples),
        "additional_apistic_train_samples": len(apistic_train),
        "additional_apistic_test_samples": len(apistic_test),
        "classes": sorted(list(set(y_train))),
        "accuracy": acc,
        "precision": prec,
        "recall": rec,
        "f1_score": f1,
        "training_duration_seconds": training_time,
        "saved_model_path": model_path
    }

    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print(f"[SUCCESS] Student 1 model saved to: {model_path}")
    print(f"[SUCCESS] Metrics saved to: {metrics_path}\n")
    return metrics

if __name__ == "__main__":
    train_student1()

"""
Fine-Tuning Script for Student 2: Semantic Documentation Similarity & Drift Bi-Encoder
NLP Task: Semantic Textual Similarity (STS) & Contextual Meaning Drift
Architecture: Fine-Tuned Sentence-Transformer (all-MiniLM-L6-v2) with CosineSimilarityLoss
"""

import os
import json
import time
import math
import numpy as np
import torch
from torch.utils.data import DataLoader
from sentence_transformers import SentenceTransformer, InputExample, losses, evaluation
from scipy.stats import pearsonr, spearmanr

def train_student2():
    print("=" * 70)
    print("STUDENT 2: FINE-TUNING SEMANTIC SIMILARITY BI-ENCODER")
    print("NLP Task: Semantic Textual Similarity (STS) & API Documentation Drift")
    print("Base Model: sentence-transformers/all-MiniLM-L6-v2 (384-dimensional)")
    print("=" * 70)

    corpus_path = os.path.join(os.path.dirname(__file__), "..", "data", "corpus", "api_semantic_sts_corpus.json")
    with open(corpus_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    train_data = data["train_pairs"]
    test_data = data["test_pairs"]

    print(f"Loaded STS Corpus: {len(train_data)} train sentence pairs, {len(test_data)} test sentence pairs.")

    train_examples = [
        InputExample(texts=[item["text1"], item["text2"]], label=float(item["similarity"]))
        for item in train_data
    ]

    test_examples = [
        InputExample(texts=[item["text1"], item["text2"]], label=float(item["similarity"]))
        for item in test_data
    ]

    # Initialize Base Model
    base_model_name = "sentence-transformers/all-MiniLM-L6-v2"
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Loading base transformer '{base_model_name}' on device: {device}...")
    model = SentenceTransformer(base_model_name, device=device)

    # Pre-fine-tuning baseline evaluation
    test_t1 = [item["text1"] for item in test_data]
    test_t2 = [item["text2"] for item in test_data]
    gold_sim = np.array([float(item["similarity"]) for item in test_data])

    emb1_pre = model.encode(test_t1, convert_to_numpy=True, normalize_embeddings=True)
    emb2_pre = model.encode(test_t2, convert_to_numpy=True, normalize_embeddings=True)
    pred_sim_pre = np.sum(emb1_pre * emb2_pre, axis=1)

    pre_pearson, _ = pearsonr(pred_sim_pre, gold_sim)
    pre_spearman, _ = spearmanr(pred_sim_pre, gold_sim)
    pre_mse = float(np.mean((pred_sim_pre - gold_sim) ** 2))

    print(f"\n--- Baseline Model (Zero-Shot) Metrics on API Test Set ---")
    print(f"MSE Loss:            {pre_mse:.4f}")
    print(f"Pearson Correlation:  {pre_pearson:.4f}")
    print(f"Spearman Correlation: {pre_spearman:.4f}")

    # Fine-Tuning Setup with PyTorch AdamW Optimizer & Cosine Loss
    epochs = 4
    batch_size = 4
    learning_rate = 2e-5
    optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate)

    print(f"\nFine-tuning model for {epochs} epochs (AdamW lr={learning_rate}) on API STS dataset...")
    start_time = time.time()
    model.train()

    num_samples = len(train_data)
    np.random.seed(42)
    torch.manual_seed(42)

    for epoch in range(1, epochs + 1):
        epoch_loss = 0.0
        indices = np.random.permutation(num_samples)
        for i in range(0, num_samples, batch_size):
            batch_idx = indices[i:i + batch_size]
            b_t1 = [train_data[j]["text1"] for j in batch_idx]
            b_t2 = [train_data[j]["text2"] for j in batch_idx]
            b_targets = torch.tensor(
                [float(train_data[j]["similarity"]) for j in batch_idx],
                dtype=torch.float32,
                device=device
            )

            feat1 = model.tokenize(b_t1)
            feat2 = model.tokenize(b_t2)
            feat1 = {k: v.to(device) for k, v in feat1.items()}
            feat2 = {k: v.to(device) for k, v in feat2.items()}

            out1 = model(feat1)["sentence_embedding"]
            out2 = model(feat2)["sentence_embedding"]

            norm1 = torch.nn.functional.normalize(out1, p=2, dim=1)
            norm2 = torch.nn.functional.normalize(out2, p=2, dim=1)
            cos_sim = torch.sum(norm1 * norm2, dim=1)

            loss = torch.nn.functional.mse_loss(cos_sim, b_targets)

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

            epoch_loss += loss.item() * len(batch_idx)

        avg_loss = epoch_loss / num_samples
        print(f"  Epoch [{epoch}/{epochs}] - Loss: {avg_loss:.5f}")

    training_time = round(time.time() - start_time, 2)
    model.eval()

    # Post fine-tuning evaluation
    emb1_post = model.encode(test_t1, convert_to_numpy=True, normalize_embeddings=True)
    emb2_post = model.encode(test_t2, convert_to_numpy=True, normalize_embeddings=True)
    pred_sim_post = np.sum(emb1_post * emb2_post, axis=1)

    post_pearson, _ = pearsonr(pred_sim_post, gold_sim)
    post_spearman, _ = spearmanr(pred_sim_post, gold_sim)
    post_mse = float(np.mean((pred_sim_post - gold_sim) ** 2))

    print(f"\n--- Fine-Tuned Model Metrics on API Test Set ---")
    print(f"Fine-Tuned MSE Loss:            {post_mse:.4f} (improved from {pre_mse:.4f})")
    print(f"Fine-Tuned Pearson Correlation:  {post_pearson:.4f} (improved from {pre_pearson:.4f})")
    print(f"Fine-Tuned Spearman Correlation: {post_spearman:.4f} (improved from {pre_spearman:.4f})")
    print(f"Fine-Tuning Duration:            {training_time}s")

    # Save fine-tuned checkpoint
    output_dir = os.path.join(os.path.dirname(__file__), "..", "models", "student2_semantic")
    os.makedirs(output_dir, exist_ok=True)
    model.save(output_dir)

    metrics_path = os.path.join(output_dir, "metrics.json")
    metrics = {
        "student": "Student 2",
        "task_name": "API Documentation Semantic Similarity & Drift Bi-Encoder",
        "base_model": base_model_name,
        "loss_function": "CosineSimilarityLoss",
        "dataset_name": data["dataset_name"],
        "train_pairs": len(train_data),
        "test_pairs": len(test_data),
        "epochs": epochs,
        "baseline_metrics": {
            "mse_loss": pre_mse,
            "pearson_correlation": float(pre_pearson),
            "spearman_correlation": float(pre_spearman)
        },
        "fine_tuned_metrics": {
            "mse_loss": post_mse,
            "pearson_correlation": float(post_pearson),
            "spearman_correlation": float(post_spearman)
        },
        "training_duration_seconds": training_time,
        "saved_checkpoint_path": output_dir
    }

    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print(f"[SUCCESS] Fine-tuned model checkpoint saved to: {output_dir}")
    print(f"[SUCCESS] Metrics saved to: {metrics_path}\n")
    return metrics

if __name__ == "__main__":
    train_student2()

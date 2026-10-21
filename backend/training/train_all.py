"""
Master Training Script for NLP-Based API Change Analysis
Trains and fine-tunes all 3 student NLP models sequentially:
- Student 1: Structural Change & Schema Mutation Classifier (MLP Neural Net)
- Student 2: Semantic Documentation Similarity & Drift Bi-Encoder (Fine-Tuned Sentence-Transformer)
- Student 3: Behavioral Contract & Consumer Breaking Impact Classifier (Dual-Head Ensemble)
"""

import sys
import os
import time

# Ensure project root is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.training.train_student1_structural import train_student1
from backend.training.train_student2_semantic import train_student2
from backend.training.train_student3_behavioral import train_student3

def main():
    total_start = time.time()
    print("\n" + "#" * 80)
    print("NLP-BASED API CHANGE ANALYSIS - MULTI-STUDENT MODEL TRAINING PIPELINE")
    print("#" * 80 + "\n")

    # 1. Student 1
    m1 = train_student1()

    # 2. Student 2
    m2 = train_student2()

    # 3. Student 3
    m3 = train_student3()

    total_time = round(time.time() - total_start, 2)

    print("\n" + "=" * 80)
    print("ALL 3 STUDENT MODELS SUCCESSFULLY TRAINED & ARTIFACTS SAVED")
    print("=" * 80)
    print(f"{'Student':<12} | {'Task':<35} | {'Model Architecture':<30} | {'Test Metric'}")
    print("-" * 80)
    print(f"Student 1    | Structural Mutation Categorization | TF-IDF + Neural MLP (64x32)        | Accuracy: {m1['accuracy']*100:.1f}%, F1: {m1['f1_score']*100:.1f}%")
    print(f"Student 2    | Semantic Similarity & Meaning Drift| Fine-Tuned all-MiniLM-L6-v2 (384d) | Pearson: {m2['fine_tuned_metrics']['pearson_correlation']:.3f}, MSE: {m2['fine_tuned_metrics']['mse_loss']:.4f}")
    print(f"Student 3    | Behavioral Deontic & Risk Severity | Dual-Head MLP + GradientBoost      | Modality Acc: {m3['modality_accuracy']*100:.1f}%, Severity F1: {m3['severity_f1']*100:.1f}%")
    print("-" * 80)
    print(f"Total Pipeline Training Time: {total_time}s\n")

if __name__ == "__main__":
    main()

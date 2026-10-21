from fastapi import APIRouter
from backend.app.schemas.evaluation import EvaluationMetrics
from backend.app.evaluation.benchmark import benchmark_engine
from backend.app.repositories.analysis_repository import analysis_repository

router = APIRouter(tags=["Evaluation"])

@router.post("/evaluation/run", response_model=EvaluationMetrics)
@router.get("/evaluation/results", response_model=EvaluationMetrics)
@router.get("/evaluation/benchmark", response_model=EvaluationMetrics)
def run_evaluation_benchmark():
    """
    Executes benchmark evaluation against labeled test cases.
    Computes precision, recall, F1, accuracy, and confusion matrices for Baseline vs NLP.
    Records the evaluation run into SQLite history.
    """
    metrics = benchmark_engine.run_benchmark()
    try:
        analysis_repository.record_evaluation_run(metrics)
    except Exception:
        pass
    return metrics

@router.get("/evaluation/student-models")
def get_student_models_evaluation():
    """
    Returns the training, corpus, and evaluation metrics for each of the 3 student NLP models:
    - Student 1: Structural Change & Schema Mutation Classifier
    - Student 2: Semantic Documentation Similarity & Drift Bi-Encoder
    - Student 3: Behavioral Contract & Consumer Breaking Impact Classifier
    """
    import os
    import json
    models_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "models"))
    
    results = {}
    students = [
        ("student_1", "student1_structural"),
        ("student_2", "student2_semantic"),
        ("student_3", "student3_behavioral")
    ]
    
    for key, folder in students:
        metrics_file = os.path.join(models_dir, folder, "metrics.json")
        if os.path.exists(metrics_file):
            with open(metrics_file, "r", encoding="utf-8") as f:
                results[key] = json.load(f)
        else:
            results[key] = {
                "status": "not_trained",
                "message": f"Run 'python backend/training/train_{key}.py' to train and evaluate this model."
            }
            
    return results

@router.get("/evaluation/dataset-provenance")
def get_dataset_provenance():
    """
    Returns official dataset provenance, ACM MSR 2024 citation, Zenodo DOI,
    primary APIstic benchmark samples, and secondary Java API evolution taxonomy cross-validation.
    """
    import os
    import json
    base_data = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "corpus"))
    
    # Primary Dataset: APIstic
    apistic_dir = os.path.join(base_data, "apistic")
    apistic_meta_path = os.path.join(apistic_dir, "metadata.json")
    apistic_samples_path = os.path.join(apistic_dir, "apistic_evolution_samples.json")

    apistic_meta = {}
    if os.path.exists(apistic_meta_path):
        with open(apistic_meta_path, "r", encoding="utf-8") as f:
            apistic_meta = json.load(f)

    apistic_samples = {}
    if os.path.exists(apistic_samples_path):
        with open(apistic_samples_path, "r", encoding="utf-8") as f:
            apistic_samples = json.load(f)

    # Secondary Dataset: Java API Evolution Data Corpus
    java_dir = os.path.join(base_data, "java_evolution")
    java_meta_path = os.path.join(java_dir, "metadata.json")
    java_tax_path = os.path.join(java_dir, "taxonomy_mapping.json")

    java_meta = {}
    if os.path.exists(java_meta_path):
        with open(java_meta_path, "r", encoding="utf-8") as f:
            java_meta = json.load(f)

    java_tax = {}
    if os.path.exists(java_tax_path):
        with open(java_tax_path, "r", encoding="utf-8") as f:
            java_tax = json.load(f)

    return {
        "selected_datasets": [
            {
                "id": "apistic",
                "tier": "Primary Dataset (Native OpenAPI Evolution)",
                "name": "APIstic: Large-Scale OpenAPI Dataset",
                "publisher": "Software Institute, Università della Svizzera italiana (USI), Switzerland",
                "conference": "ACM MSR 2024 (Mining Software Repositories)",
                "zenodo_url": "https://zenodo.org/records/20525072",
                "doi": "10.5281/zenodo.20525072",
                "paper_doi": "10.1145/3643991.3644932",
                "dashboard_url": "http://openapi.inf.usi.ch/",
                "total_specs": 1200000,
                "role": "Direct OpenAPI specification diffing, real-world commit evolution pairs (Stripe, GitHub, Kubernetes, Box, Twilio), and training corpora for Student 1, 2, and 3 models.",
                "metadata": apistic_meta,
                "evolution_pairs": apistic_samples.get("evolution_pairs", [])
            },
            {
                "id": "java_evolution",
                "tier": "Secondary Dataset (Breaking Change Taxonomy Cross-Validation)",
                "name": "Java API Evolution Data Corpus",
                "publisher": "University of West Bohemia (Kiv) & University of Bordeaux (LaBRI CNRS)",
                "github_url": "https://github.com/labri-progress/api-evolution-data-corpus-improved",
                "original_url": "https://www.kiv.zcu.cz/en/research/downloads/product-detail-en.html?produkt_id=136",
                "total_cases": 251,
                "role": "Cross-validation of breaking change taxonomy. Maps empirical software breaking change categories (preconditions, overload removal, return type shifts) to OpenAPI REST equivalents.",
                "metadata": java_meta,
                "taxonomy_mappings": java_tax.get("mappings", [])
            }
        ],
        "dataset_selection_rationale": {
            "selected_count": 2,
            "primary": "APIstic (Zenodo 20525072 / ACM MSR 2024)",
            "secondary": "Java API Evolution Data Corpus (LaBRI / Kiv, 251 cases)",
            "excluded_candidates": [
                {
                    "name": "RustEvo²",
                    "reason": "Tailored for Rust compiler type systems and Rust code synthesis benchmarks; does not contain REST / OpenAPI schema contracts."
                },
                {
                    "name": "LibEvolutionEval",
                    "reason": "Evaluates Python code completion (PyTorch/Matplotlib) in LLM prompts; does not model HTTP client-server contract specifications."
                }
            ]
        }
    }


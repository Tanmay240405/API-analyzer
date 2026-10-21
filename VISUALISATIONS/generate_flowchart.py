"""
Generates the comprehensive end-to-end Implementation Flow Diagram
for 'NLP-Based Semantic and Behavioral Impact Analysis of API Changes'
"""

import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

VIS_DIR = os.path.dirname(os.path.abspath(__file__)) if "__file__" in locals() else r"c:\Users\Tanmay\Desktop\collegeProject\NLP\VISUALISATIONS"
OUTPUT_PATH = os.path.join(VIS_DIR, "implementation_flowchart.png")

def create_flowchart():
    fig = plt.figure(figsize=(16, 12), dpi=300)
    ax = fig.add_subplot(111)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    # Color Palette - Professional Modern Academic Tech
    c_bg = '#F8FAFC'           # Slate 50 background
    c_input_bg = '#EFF6FF'     # Blue 50
    c_input_border = '#3B82F6' # Blue 500
    c_norm_bg = '#F1F5F9'      # Slate 100
    c_norm_border = '#475569'  # Slate 600
    
    # Tier 1 - Tanmay (Structural AST)
    c_t1_bg = '#EFF6FF'        # Blue 50
    c_t1_border = '#1D4ED8'    # Blue 700
    c_t1_header = '#1E40AF'    # Blue 800
    
    # Tier 2 - Saatvik (Semantic STS)
    c_t2_bg = '#F0FDF4'        # Green 50
    c_t2_border = '#047857'    # Emerald 700
    c_t2_header = '#065F46'    # Emerald 800
    
    # Tier 3 - Arjun (Behavioral Deontic)
    c_t3_bg = '#FAF5FF'        # Purple 50
    c_t3_border = '#7E22CE'    # Purple 700
    c_t3_header = '#6B21A8'    # Purple 800
    
    # Synthesis & Risk
    c_synth_bg = '#FFFBEB'     # Amber 50
    c_synth_border = '#D97706' # Amber 600
    c_synth_header = '#92400E' # Amber 800

    # Migration
    c_mig_bg = '#F0F9FF'       # Sky 50
    c_mig_border = '#0284C7'   # Sky 600
    c_mig_header = '#075985'   # Sky 800

    # Presentation / Full-Stack
    c_ui_bg = '#F8FAFC'        # Slate 50
    c_ui_border = '#475569'    # Slate 600
    c_ui_header = '#1E293B'    # Slate 800

    # Background canvas
    fig.patch.set_facecolor(c_bg)
    ax.set_facecolor(c_bg)

    def draw_card(x, y, w, h, bg_color, border_color, border_width=1.5, radius=1.0):
        box = FancyBboxPatch((x, y), w, h,
                             boxstyle=f"round,pad={radius},rounding_size={radius}",
                             facecolor=bg_color, edgecolor=border_color,
                             linewidth=border_width, zorder=2)
        ax.add_patch(box)
        return box

    def draw_arrow(x1, y1, x2, y2, color='#475569', width=1.5, style='-|>', rad=0.0):
        connectionstyle = f"arc3,rad={rad}" if rad != 0.0 else "arc3"
        arrow = FancyArrowPatch((x1, y1), (x2, y2),
                                connectionstyle=connectionstyle,
                                arrowstyle=style,
                                mutation_scale=14,
                                color=color,
                                linewidth=width,
                                zorder=3)
        ax.add_patch(arrow)

    # -------------------------------------------------------------
    # 0. MAIN TITLE & SUBTITLE
    # -------------------------------------------------------------
    ax.text(50, 97.8, "NLP-BASED SEMANTIC AND BEHAVIORAL API CHANGE IMPACT ANALYSIS",
            ha='center', va='center', fontsize=15, weight='bold', color='#0F172A')
    ax.text(50, 95.8, "End-to-End System Implementation Flow & Multi-Tiered Specialist Pipeline",
            ha='center', va='center', fontsize=11, weight='bold', color='#2563EB')

    # -------------------------------------------------------------
    # 1. INPUT LAYER (Top: Y ~ 86.5 to 94.0)
    # Stacking V1 and V2 cleanly on the left
    # -------------------------------------------------------------
    # Input V1 (Top-Left)
    draw_card(3, 90.6, 20, 3.4, c_input_bg, c_input_border, radius=0.6)
    ax.text(13, 92.6, "OpenAPI / Swagger V1 (Prior)", ha='center', va='center', fontsize=9.0, weight='bold', color='#1E3A8A')
    ax.text(13, 91.2, "Baseline API Spec (JSON/YAML)", ha='center', va='center', fontsize=7.8, color='#334155')

    # Input V2 (Bottom-Left)
    draw_card(3, 86.2, 20, 3.4, c_input_bg, c_input_border, radius=0.6)
    ax.text(13, 88.2, "OpenAPI / Swagger V2 (Evolved)", ha='center', va='center', fontsize=9.0, weight='bold', color='#1E3A8A')
    ax.text(13, 86.8, "Target API Spec (JSON/YAML)", ha='center', va='center', fontsize=7.8, color='#334155')

    # Ingestion & Normalizer Engine (Right of inputs)
    draw_card(30, 86.0, 67, 8.0, c_norm_bg, c_norm_border, border_width=1.8, radius=0.8)
    ax.text(63.5, 92.5, "SPECIFICATION INGESTION & CANONICAL NORMALIZATION PIPELINE",
            ha='center', va='center', fontsize=10.0, weight='bold', color='#0F172A')
    norm_text = (
        "- Recursive JSON Pointer ($ref) Resolution: Inlines nested schemas & dereferences circular definitions\n"
        "- Cross-Version Schema Normalization: Harmonizes Swagger 2.0 definitions into canonical OpenAPI 3.0 models\n"
        "- AST Extraction: Parses Paths, HTTP Methods, Query/Path/Header Parameters, Request Bodies & Response Schemas\n"
        "- Dual Artifact Splitting: Generates aligned AST structural nodes and natural language docstring pairs"
    )
    ax.text(63.5, 88.5, norm_text, ha='center', va='center', fontsize=7.8, color='#334155', linespacing=1.25)

    # Arrows from Inputs to Normalizer
    draw_arrow(23.5, 92.3, 29.5, 91.0, color='#2563EB', width=1.6)
    draw_arrow(23.5, 87.9, 29.5, 89.0, color='#2563EB', width=1.6)

    # Main connector from Normalizer downward
    draw_arrow(63.5, 85.5, 63.5, 83.5, color='#475569', width=2.0)
    # Horizontal distributor bar at y = 83.5
    ax.plot([18, 82], [83.5, 83.5], color='#475569', linewidth=2.0, zorder=3)
    draw_arrow(18, 83.5, 18, 81.5, color='#1D4ED8', width=1.8)
    draw_arrow(50, 83.5, 50, 81.5, color='#047857', width=1.8)
    draw_arrow(82, 83.5, 82, 81.5, color='#7E22CE', width=1.8)

    # -------------------------------------------------------------
    # 2. THREE PARALLEL SPECIALIST TIERS (Middle: Y ~ 43.0 to 81.5)
    # -------------------------------------------------------------

    # TIER 1: STRUCTURAL AST (Tanmay Saxena)
    draw_card(3, 43.5, 30, 37.5, c_t1_bg, c_t1_border, border_width=2.0, radius=1.0)
    # Header Badge
    draw_card(4.5, 76.5, 27, 4.0, '#DBEAFE', c_t1_border, border_width=1.2, radius=0.6)
    ax.text(18, 79.2, "TIER 1: STRUCTURAL AST ENGINE", ha='center', va='center', fontsize=10, weight='bold', color=c_t1_header)
    ax.text(18, 77.4, "Tanmay Saxena - 1032233295", ha='center', va='center', fontsize=8.5, weight='bold', color='#1E40AF')

    # Sub-blocks inside Tier 1
    # 1.1 AST Tree Diffing
    draw_card(5, 68.2, 26, 7.0, '#FFFFFF', '#93C5FD', radius=0.6)
    ax.text(18, 73.5, "Deterministic AST Diffing", ha='center', va='center', fontsize=9.0, weight='bold', color='#1E3A8A')
    t1_1_text = (
        "- DeepDiff Hierarchical Tree Traversal\n"
        "- Path items, Verbs, Parameters, Schemas\n"
        "- Required flags, Types, Enums, Defaults"
    )
    ax.text(18, 70.3, t1_1_text, ha='center', va='center', fontsize=7.8, color='#334155')

    draw_arrow(18, 67.8, 18, 65.2, color='#1D4ED8', width=1.4)

    # 1.2 Feature Tokenization
    draw_card(5, 57.2, 26, 7.2, '#FFFFFF', '#93C5FD', radius=0.6)
    ax.text(18, 62.8, "N-Gram Feature Extraction", ha='center', va='center', fontsize=9.0, weight='bold', color='#1E3A8A')
    t1_2_text = (
        "- Character N-Grams (3-5 grams)\n"
        "- Word N-Grams (1-3 grams)\n"
        "- Scikit-Learn TfidfVectorizer (N=1000)"
    )
    ax.text(18, 59.4, t1_2_text, ha='center', va='center', fontsize=7.8, color='#334155')

    draw_arrow(18, 56.8, 18, 54.2, color='#1D4ED8', width=1.4)

    # 1.3 Neural Classifier
    draw_card(5, 45.0, 26, 8.4, '#FFFFFF', '#93C5FD', radius=0.6)
    ax.text(18, 51.6, "Multi-Layer Perceptron (MLP)", ha='center', va='center', fontsize=9.0, weight='bold', color='#1E3A8A')
    t1_3_text = (
        "- Architecture: 64 x 32 Hidden Units (ReLU)\n"
        "- Adam Optimizer & L2 Regularization\n"
        "- Output: 6 Mutation Classes (91.7% Acc)\n"
        "- Binary Breaking Severity Prediction"
    )
    ax.text(18, 47.7, t1_3_text, ha='center', va='center', fontsize=7.8, color='#334155')

    # TIER 2: SEMANTIC STS (Saatvik Madan)
    draw_card(35, 43.5, 30, 37.5, c_t2_bg, c_t2_border, border_width=2.0, radius=1.0)
    # Header Badge
    draw_card(36.5, 76.5, 27, 4.0, '#DCFCE7', c_t2_border, border_width=1.2, radius=0.6)
    ax.text(50, 79.2, "TIER 2: SEMANTIC STS ENGINE", ha='center', va='center', fontsize=10, weight='bold', color=c_t2_header)
    ax.text(50, 77.4, "Saatvik Madan - 103223398", ha='center', va='center', fontsize=8.5, weight='bold', color='#065F46')

    # Sub-blocks inside Tier 2
    # 2.1 Text Extraction & Preprocessing
    draw_card(37, 68.2, 26, 7.0, '#FFFFFF', '#86EFAC', radius=0.6)
    ax.text(50, 73.5, "Doc Text Preprocessing", ha='center', va='center', fontsize=9.0, weight='bold', color='#065F46')
    t2_1_text = (
        "- Endpoint summaries & param doc extraction\n"
        "- Markdown cleaning & contraction expansion\n"
        "- Sentence pair alignment (V1 vs. V2)"
    )
    ax.text(50, 70.3, t2_1_text, ha='center', va='center', fontsize=7.8, color='#334155')

    draw_arrow(50, 67.8, 50, 65.2, color='#047857', width=1.4)

    # 2.2 Bi-Encoder Transformer
    draw_card(37, 57.2, 26, 7.2, '#FFFFFF', '#86EFAC', radius=0.6)
    ax.text(50, 62.8, "Bi-Encoder Sentence Transformer", ha='center', va='center', fontsize=9.0, weight='bold', color='#065F46')
    t2_2_text = (
        "- all-MiniLM-L6-v2 (384-dim dense vectors)\n"
        "- Domain-adapted fine-tuning (PyTorch AdamW)\n"
        "- CosineSimilarityLoss (Validation MSE: 0.0376)"
    )
    ax.text(50, 59.4, t2_2_text, ha='center', va='center', fontsize=7.8, color='#334155')

    draw_arrow(50, 56.8, 50, 54.2, color='#047857', width=1.4)

    # 2.3 Semantic Drift & Decision Boundary
    draw_card(37, 45.0, 26, 8.4, '#FFFFFF', '#86EFAC', radius=0.6)
    ax.text(50, 51.6, "Semantic Drift Quantification", ha='center', va='center', fontsize=9.0, weight='bold', color='#065F46')
    t2_3_text = (
        "- Cosine Similarity = dot(v1, v2) / (|v1||v2|)\n"
        "- Drift Metric = 1.0 - CosineSimilarity\n"
        "- Calibrated Cutoff (tau = 0.75 operating point)\n"
        "- Flags Scope Narrowing & Contract Drifts"
    )
    ax.text(50, 47.7, t2_3_text, ha='center', va='center', fontsize=7.8, color='#334155')

    # TIER 3: BEHAVIORAL DEONTIC (KS Arjun)
    draw_card(67, 43.5, 30, 37.5, c_t3_bg, c_t3_border, border_width=2.0, radius=1.0)
    # Header Badge
    draw_card(68.5, 76.5, 27, 4.0, '#F3E8FF', c_t3_border, border_width=1.2, radius=0.6)
    ax.text(82, 79.2, "TIER 3: BEHAVIORAL ENGINE", ha='center', va='center', fontsize=10, weight='bold', color=c_t3_header)
    ax.text(82, 77.4, "KS Arjun - 1032232286", ha='center', va='center', fontsize=8.5, weight='bold', color='#6B21A8')

    # Sub-blocks inside Tier 3
    # 3.1 spaCy Dependency Parsing
    draw_card(69, 68.2, 26, 7.0, '#FFFFFF', '#D8B4FE', radius=0.6)
    ax.text(82, 73.5, "spaCy Linguistic Parsing", ha='center', va='center', fontsize=9.0, weight='bold', color='#6B21A8')
    t3_1_text = (
        "- Pipeline: en_core_web_sm dependency graph\n"
        "- Matcher for modals (must, shall, may, cannot)\n"
        "- Negation particles & condition clause tags"
    )
    ax.text(82, 70.3, t3_1_text, ha='center', va='center', fontsize=7.8, color='#334155')

    draw_arrow(82, 67.8, 82, 65.2, color='#7E22CE', width=1.4)

    # 3.2 Dual-Head Classifier
    draw_card(69, 57.2, 26, 7.2, '#FFFFFF', '#D8B4FE', radius=0.6)
    ax.text(82, 62.8, "Dual-Head Contract Classifier", ha='center', va='center', fontsize=9.0, weight='bold', color='#6B21A8')
    t3_2_text = (
        "- Head A: 6 Deontic Modalities (94.4% Acc)\n"
        "  (Obligation, Prohibition, Permission, etc.)\n"
        "- Head B: 5 Client Severity Classes (55.6% F1)"
    )
    ax.text(82, 59.4, t3_2_text, ha='center', va='center', fontsize=7.8, color='#334155')

    draw_arrow(82, 56.8, 82, 54.2, color='#7E22CE', width=1.4)

    # 3.3 Behavioral Comparator
    draw_card(69, 45.0, 26, 8.4, '#FFFFFF', '#D8B4FE', radius=0.6)
    ax.text(82, 51.6, "Behavioral Contract Comparator", ha='center', va='center', fontsize=9.0, weight='bold', color='#6B21A8')
    t3_3_text = (
        "- Restrictive Tightening Detection\n"
        "  (e.g., Permission -> Obligation = Breaking)\n"
        "- Rate limit additions & quota tightening\n"
        "- Synchronous to Asynchronous queue shift"
    )
    ax.text(82, 47.7, t3_3_text, ha='center', va='center', fontsize=7.8, color='#334155')

    # -------------------------------------------------------------
    # 3. SYNTHESIS & RISK ENGINE (Y ~ 26.5 to 39.5)
    # -------------------------------------------------------------
    # Merge arrows from 3 Tiers into Synthesis
    draw_arrow(18, 43.0, 18, 40.0, color='#1D4ED8', width=1.8)
    draw_arrow(50, 43.0, 50, 40.0, color='#047857', width=1.8)
    draw_arrow(82, 43.0, 82, 40.0, color='#7E22CE', width=1.8)

    # Horizontal synthesis collector bar
    ax.plot([18, 82], [40.0, 40.0], color='#D97706', linewidth=2.0, zorder=3)
    draw_arrow(50, 40.0, 50, 38.0, color='#D97706', width=2.2)

    # Synthesis Box
    draw_card(12, 26.5, 76, 11.2, c_synth_bg, c_synth_border, border_width=2.0, radius=1.0)
    ax.text(50, 35.8, "MULTI-SOURCE IMPACT SYNTHESIS & RISK SCORING ENGINE",
            ha='center', va='center', fontsize=11, weight='bold', color=c_synth_header)
    
    synth_text = (
        "Tri-Tier Evidence Fusion: AST Schema Diff Records + Dense Semantic Drift Vectors + Deontic Modal Shifts\n"
        "Holistic API Breaking Risk Score (0-100): Calibrated non-linear multi-factor weighting\n"
        "Taxonomic Categorization: STRUCTURAL_BREAKING  |  BEHAVIORAL_BREAKING  |  DUAL_BREAKING  |  NON_BREAKING\n"
        "Empirical Recall vs. Structural Diff Baseline: 71.4% vs. 28.6% (+42.8% boost), 95.2% Precision, 81.6% F1"
    )
    ax.text(50, 31.0, synth_text, ha='center', va='center', fontsize=8.3, color='#78350F', linespacing=1.35)

    # -------------------------------------------------------------
    # 4. DOWNSTREAM LAYER: REMEDIATION & SERVING (Y ~ 4.5 to 23.2)
    # -------------------------------------------------------------
    draw_arrow(31, 26.0, 31, 23.5, color='#0284C7', width=1.8)
    draw_arrow(69, 26.0, 69, 23.5, color='#475569', width=1.8)

    # 4.1 Migration Code Recommender (Left)
    draw_card(4, 4.5, 44, 18.2, c_mig_bg, c_mig_border, border_width=1.8, radius=0.9)
    ax.text(26, 20.8, "AUTOMATED CLIENT MIGRATION RECOMMENDER", ha='center', va='center', fontsize=10, weight='bold', color=c_mig_header)
    ax.text(26, 19.0, "Actionable Developer Remediation Code (KS Arjun)", ha='center', va='center', fontsize=8.5, weight='bold', color='#0284C7')

    mig_text = (
        "- Jinja2 Multi-Language Template Code Generation\n"
        "- Syntactically valid remediation snippets:\n"
        "   * cURL: Updated headers, auth & payload schemas\n"
        "   * Python: Requests library adapted client calls\n"
        "   * TypeScript: Axios promise-based client refactoring\n"
        "- 100% syntactic validity verified across all target runtimes\n"
        "- Eliminates silent consumer crashes & unhandled HTTP errors"
    )
    ax.text(26, 11.8, mig_text, ha='center', va='center', fontsize=8.0, color='#0C4A6E', linespacing=1.3)

    # 4.2 Presentation & Serving Architecture (Right)
    draw_card(52, 4.5, 44, 18.2, c_ui_bg, c_ui_border, border_width=1.8, radius=0.9)
    ax.text(74, 20.8, "FULL-STACK SERVING & DEVELOPER DASHBOARD", ha='center', va='center', fontsize=10, weight='bold', color=c_ui_header)
    ax.text(74, 19.0, "FastAPI High-Performance Engine + React 19 SPA", ha='center', va='center', fontsize=8.5, weight='bold', color='#334155')

    ui_text = (
        "- FastAPI REST Endpoints: /api/analyses, /api/semantic-test,\n"
        "  /api/evaluation, /api/health, /api/exports\n"
        "- SQLite Relational Storage: Historical runs, findings, metrics\n"
        "- React 19 + TypeScript + Vite Interactive UI:\n"
        "   * Recharts visual analytics (Category & Severity splits)\n"
        "   * Multi-criteria filtering (Method, Severity, Status)\n"
        "   * Independent semantic drift testing sandbox\n"
        "- Multi-format Export: JSON, CSV, Printable / PDF-ready HTML"
    )
    ax.text(74, 11.8, ui_text, ha='center', va='center', fontsize=8.0, color='#1E293B', linespacing=1.3)

    # Connecting arrow between Recommender and Dashboard
    draw_arrow(48.5, 13.6, 51.5, 13.6, color='#64748B', width=1.5, style='<|-|>', rad=0.0)

    plt.tight_layout()
    plt.savefig(OUTPUT_PATH, dpi=300, facecolor=fig.get_facecolor(), edgecolor='none', bbox_inches='tight')
    plt.close()
    print(f"Flowchart successfully regenerated at: {OUTPUT_PATH}")

if __name__ == "__main__":
    create_flowchart()

"""
Generates the publication-quality 'Aspects Analysed' Architectural Diagram
for Section 2.3 Methodology in the Panel A Report.
"""

import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

VIS_DIR = r"c:\Users\Tanmay\Desktop\collegeProject\NLP\VISUALISATIONS"
OUTPUT_PATH = os.path.join(VIS_DIR, "aspects_analysed_diagram.png")

def create_aspects_diagram():
    fig = plt.figure(figsize=(13, 9), dpi=300)
    ax = fig.add_subplot(111)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')
    fig.patch.set_facecolor('#FFFFFF')

    # Title Banner
    title_box = FancyBboxPatch((5, 90), 90, 8, boxstyle="round,pad=0.3,rounding_size=1.0",
                               facecolor='#1E3A8A', edgecolor='#1D4ED8', linewidth=1.5)
    ax.add_patch(title_box)
    ax.text(50, 94.5, "TAXONOMY OF API ASPECTS ANALYSED ACROSS THE DUAL-ENGINE PLATFORM",
            ha='center', va='center', fontsize=12, fontweight='bold', color='#FFFFFF', family='sans-serif')
    ax.text(50, 91.8, "Comprehensive multi-dimensional inspection spanning structural AST, semantic drift, deontic contracts, and consumer impact",
            ha='center', va='center', fontsize=8.5, color='#BFDBFE', family='sans-serif')

    # Pillars Setup
    # 4 Columns:
    # Col 1: Structural AST Aspects (Tanmay)
    # Col 2: Semantic NLP Aspects (Saatvik)
    # Col 3: Behavioral Deontic Aspects (Arjun)
    # Col 4: Impact Synthesis & Remediation (Integrated)

    columns = [
        {
            "header": "1. STRUCTURAL AST\nASPECTS",
            "owner": "Tanmay Saxena (Student 1)",
            "header_color": "#1E40AF",
            "bg_color": "#EFF6FF",
            "border_color": "#3B82F6",
            "x": 5, "w": 21,
            "items": [
                ("Endpoint Lifecycle", "Route additions, deletions, HTTP verb replacements, version deprecations"),
                ("Parameter Shifts", "Optional -> Required flags, parameter type shifts, enum removals"),
                ("Default Values", "Pagination limits, default timeouts, query boundary contractions"),
                ("Schema Properties", "Object attribute mutations, nested field additions/deletions"),
                ("Status Codes", "Response code transitions (e.g. 200 OK -> 202 Accepted, 429 added)")
            ]
        },
        {
            "header": "2. SEMANTIC NLP\nASPECTS",
            "owner": "Saatvik Madan (Student 2)",
            "header_color": "#065F46",
            "bg_color": "#F0FDF4",
            "border_color": "#10B981",
            "x": 28, "w": 21,
            "items": [
                ("Dense Embeddings", "384-dimensional bi-encoder vectors (all-MiniLM-L6-v2)"),
                ("Scope Narrowing", "Contraction from universal sets ('all') to conditional subsets ('available')"),
                ("Execution Models", "Synchronous settlement transitions to asynchronous worker queues"),
                ("Semantic Drift", "Cosine similarity tracking with calibrated decision threshold (tau = 0.75)"),
                ("Contradictions", "Explicit negation flipping and inclusion/exclusion reversals in docstrings")
            ]
        },
        {
            "header": "3. BEHAVIORAL DEONTIC\nASPECTS",
            "owner": "KS Arjun (Student 3)",
            "header_color": "#6B21A8",
            "bg_color": "#FAF5FF",
            "border_color": "#A855F7",
            "x": 51, "w": 21,
            "items": [
                ("Obligations", "Mandatory caller requirements ('must', 'shall', 'required to')"),
                ("Prohibitions", "Strict invariants & caller restrictions ('must not', 'cannot', 'forbidden')"),
                ("Permissions", "Discretionary caller capabilities ('may', 'can', 'optional')"),
                ("Preconditions", "Prerequisite operational states ('prior to invocation', 'auth bearer')"),
                ("Quotas & Limits", "Explicit rate limits, throttling windows, and quota caps (e.g. 50 req/min)")
            ]
        },
        {
            "header": "4. SYNTHESIS &\nREMEDIATION",
            "owner": "Holistic Platform Engine",
            "header_color": "#9A3412",
            "bg_color": "#FFF7ED",
            "border_color": "#F97316",
            "x": 74, "w": 21,
            "items": [
                ("Multi-Source Fusion", "Joint evidence aggregation across AST, bi-encoder, and spaCy trees"),
                ("Breaking Taxonomy", "STRUCTURAL, BEHAVIORAL, DUAL, or NON_BREAKING classifications"),
                ("Risk Scoring", "Composite 0-100 API Breaking Risk Score calibrated for release gating"),
                ("Impact Narrative", "Grounded consumer breakage explanation and severity attribution"),
                ("Code Migration", "Before/After code snippets in cURL, Python Requests, and TypeScript Axios")
            ]
        }
    ]

    for col in columns:
        x, w = col["x"], col["w"]
        
        # Outer Card Container
        card = FancyBboxPatch((x, 6), w, 81, boxstyle="round,pad=0.2,rounding_size=0.8",
                              facecolor=col["bg_color"], edgecolor=col["border_color"], linewidth=1.2)
        ax.add_patch(card)

        # Header Badge
        hdr_badge = FancyBboxPatch((x, 77.5), w, 9.5, boxstyle="round,pad=0.2,rounding_size=0.6",
                                   facecolor=col["header_color"], edgecolor='none')
        ax.add_patch(hdr_badge)
        ax.text(x + w/2, 83.5, col["header"], ha='center', va='center',
                fontsize=9.5, fontweight='bold', color='#FFFFFF', family='sans-serif', multialignment='center')
        ax.text(x + w/2, 79.2, col["owner"], ha='center', va='center',
                fontsize=7.2, color='#E2E8F0', family='sans-serif', style='italic')

        # Items inside Pillar
        y_pos = 73.5
        for idx, (title, desc) in enumerate(col["items"]):
            item_box = FancyBboxPatch((x + 0.8, y_pos - 10.5), w - 1.6, 11.5,
                                      boxstyle="round,pad=0.15,rounding_size=0.5",
                                      facecolor='#FFFFFF', edgecolor=col["border_color"], linewidth=0.7)
            ax.add_patch(item_box)
            
            # Badge icon/number
            num_circle = FancyBboxPatch((x + 1.3, y_pos - 2.5), 2.2, 2.2,
                                        boxstyle="circle,pad=0.1",
                                        facecolor=col["header_color"], edgecolor='none')
            ax.add_patch(num_circle)
            ax.text(x + 2.4, y_pos - 1.4, str(idx + 1), ha='center', va='center',
                    fontsize=6.5, fontweight='bold', color='#FFFFFF')

            # Item title
            ax.text(x + 4.2, y_pos - 1.4, title, ha='left', va='center',
                    fontsize=8.0, fontweight='bold', color='#0F172A', family='sans-serif')
            
            # Item description
            ax.text(x + 1.5, y_pos - 6.2, desc, ha='left', va='top',
                    fontsize=6.8, color='#475569', family='sans-serif', wrap=True)
            
            y_pos -= 13.3

    # Bottom summary tag
    summary_box = FancyBboxPatch((15, 1.2), 70, 3.8, boxstyle="round,pad=0.2,rounding_size=0.6",
                                 facecolor='#F1F5F9', edgecolor='#94A3B8', linewidth=1.0)
    ax.add_patch(summary_box)
    ax.text(50, 3.1, "Cross-Validated against APIstic (1.2M+ OpenAPI Specifications) and Java API Evolution Benchmark (251 Cases)",
            ha='center', va='center', fontsize=7.8, fontweight='bold', color='#334155', family='sans-serif')

    plt.tight_layout()
    plt.savefig(OUTPUT_PATH, dpi=300, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.close()
    print(f"[SUCCESS] Aspects Analysed diagram generated at: {OUTPUT_PATH}")

if __name__ == "__main__":
    create_aspects_diagram()

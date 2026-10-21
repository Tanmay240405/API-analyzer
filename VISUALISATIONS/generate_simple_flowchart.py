"""
Generates the clean, minimalist implementation flowchart diagram
matching the exact structure, layout, nodes, and style requested by the user.
"""

import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, PathPatch
from matplotlib.path import Path
import numpy as np

VIS_DIR = r"c:\Users\Tanmay\Desktop\collegeProject\NLP\VISUALISATIONS"
OUTPUT_PATH = os.path.join(VIS_DIR, "implementation_flowchart.png")

def create_simple_flowchart():
    # Width 6.5 inches, Height 12.5 inches at 300 DPI
    fig, ax = plt.subplots(figsize=(6.5, 12.5), dpi=300)
    fig.patch.set_facecolor('#FFFFFF')
    ax.set_facecolor('#FFFFFF')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    # Styling attributes matching user's image exactly
    box_face = '#ECECEC'      # Clean light grey fill
    box_edge = '#C4C4C4'      # Subtle grey border
    box_shadow = '#E2E2E2'    # Soft subtle drop shadow
    arrow_color = '#4A4A4A'   # Charcoal grey line
    text_color = '#111827'    # Crisp dark text
    font_name = 'Arial'

    def draw_node(cx, cy, w, h, text, fontsize=11, weight='normal'):
        x = cx - w / 2.0
        y = cy - h / 2.0
        
        # Subtle soft drop shadow
        shadow = FancyBboxPatch((x + 0.35, y - 0.35), w, h,
                                boxstyle="round,pad=0.0,rounding_size=0.8",
                                facecolor=box_shadow, edgecolor='none', zorder=1)
        ax.add_patch(shadow)
        
        # Main Node Box
        box = FancyBboxPatch((x, y), w, h,
                             boxstyle="round,pad=0.0,rounding_size=0.8",
                             facecolor=box_face, edgecolor=box_edge,
                             linewidth=1.2, zorder=2)
        ax.add_patch(box)
        
        # Centered Text
        ax.text(cx, cy, text, ha='center', va='center',
                fontsize=fontsize, color=text_color, family=font_name,
                weight=weight, linespacing=1.2, zorder=3)

    def draw_rounded_connector(p_start, p_end, waypoints, r=1.5):
        """
        Draws a connector from p_start to p_end through waypoints with rounded corners of radius r.
        waypoints is a list of intermediate points.
        The last segment ends with an arrowhead pointing to p_end.
        """
        all_pts = [p_start] + waypoints + [p_end]
        verts = [all_pts[0]]
        codes = [Path.MOVETO]

        for i in range(1, len(all_pts) - 1):
            p_prev = all_pts[i - 1]
            p_curr = all_pts[i]
            p_next = all_pts[i + 1]

            # Vector in from prev
            v_in = np.array(p_curr) - np.array(p_prev)
            d_in = np.linalg.norm(v_in)
            u_in = v_in / d_in if d_in > 0 else np.array([0, 0])

            # Vector out to next
            v_out = np.array(p_next) - np.array(p_curr)
            d_out = np.linalg.norm(v_out)
            u_out = v_out / d_out if d_out > 0 else np.array([0, 0])

            actual_r = min(r, d_in / 2.0, d_out / 2.0)
            pt_before = np.array(p_curr) - u_in * actual_r
            pt_after = np.array(p_curr) + u_out * actual_r

            # Line to before corner
            verts.append(tuple(pt_before))
            codes.append(Path.LINETO)

            # Quadratic bezier through the corner
            verts.append(tuple(p_curr))
            codes.append(Path.CURVE3)
            verts.append(tuple(pt_after))
            codes.append(Path.CURVE3)

        # Before final endpoint, stop slightly before so arrowhead fits cleanly
        p_penult = verts[-1]
        v_final = np.array(p_end) - np.array(p_penult)
        d_final = np.linalg.norm(v_final)
        u_final = v_final / d_final if d_final > 0 else np.array([0, -1])

        # Add line to near end
        arrow_start = np.array(p_end) - u_final * 1.5
        verts.append(tuple(arrow_start))
        codes.append(Path.LINETO)

        path = Path(verts, codes)
        patch = PathPatch(path, facecolor='none', edgecolor=arrow_color, linewidth=1.2, zorder=2)
        ax.add_patch(patch)

        # Arrowhead
        arrow = FancyArrowPatch(tuple(arrow_start), p_end,
                                arrowstyle='-|>',
                                mutation_scale=13,
                                color=arrow_color,
                                linewidth=1.2,
                                zorder=2)
        ax.add_patch(arrow)

    def draw_straight_arrow(p_start, p_end):
        arrow = FancyArrowPatch(p_start, p_end,
                                arrowstyle='-|>',
                                mutation_scale=13,
                                color=arrow_color,
                                linewidth=1.2,
                                zorder=2)
        ax.add_patch(arrow)

    # ---------------------------------------------------------
    # Layout Coordinates
    # ---------------------------------------------------------
    
    # 1. Top row: Old API Documentation (left) & New API Documentation (right)
    w_top = 29.0
    h_top = 7.2
    y_top = 94.0
    cx_old = 29.0
    cx_new = 71.0
    draw_node(cx_old, y_top, w_top, h_top, "Old API\nDocumentation", fontsize=11)
    draw_node(cx_new, y_top, w_top, h_top, "New API\nDocumentation", fontsize=11)

    # 2. Preprocessing
    w_pre = 26.0
    h_pre = 5.2
    y_pre = 84.5
    cx_pre = 50.0
    draw_node(cx_pre, y_pre, w_pre, h_pre, "Preprocessing", fontsize=11)

    # Connectors from Old & New to Preprocessing
    # Exits from center-bottom of each, goes down, turns towards center, turns down into Preprocessing
    draw_rounded_connector((cx_old, y_top - h_top/2.0),
                           (cx_pre - 5.5, y_pre + h_pre/2.0),
                           [(cx_old, 88.8), (cx_pre - 5.5, 88.8)], r=1.5)

    draw_rounded_connector((cx_new, y_top - h_top/2.0),
                           (cx_pre + 5.5, y_pre + h_pre/2.0),
                           [(cx_new, 88.8), (cx_pre + 5.5, 88.8)], r=1.5)

    # 3. Change Extraction
    w_ext = 29.0
    h_ext = 7.0
    y_ext = 74.0
    cx_ext = 50.0
    draw_node(cx_ext, y_ext, w_ext, h_ext, "Change\nExtraction", fontsize=11)
    draw_straight_arrow((cx_pre, y_pre - h_pre/2.0), (cx_ext, y_ext + h_ext/2.0))

    # 4. Three branches:
    # Left: Structural Changes (cx=20.0, y=50.5)
    # Middle: Semantic Changes (cx=49.0, y=62.5)
    # Right: Behavioral Changes (cx=78.0, y=62.5)
    w_struct = 26.5
    h_struct = 7.0
    cx_struct = 20.0
    y_struct = 50.5

    w_sem = 25.5
    h_sem = 7.0
    cx_sem = 49.0
    y_sem = 62.5

    w_beh = 25.5
    h_beh = 7.0
    cx_beh = 78.0
    y_beh = 62.5

    draw_node(cx_struct, y_struct, w_struct, h_struct, "Structural\nChanges", fontsize=11)
    draw_node(cx_sem, y_sem, w_sem, h_sem, "Semantic\nChanges", fontsize=11)
    draw_node(cx_beh, y_beh, w_beh, h_beh, "Behavioral\nChanges", fontsize=11)

    # Branch connectors from Change Extraction:
    # To Structural Changes (left)
    draw_rounded_connector((cx_ext - 8.0, y_ext - h_ext/2.0),
                           (cx_struct + 5.0, y_struct + h_struct/2.0),
                           [(cx_ext - 8.0, 68.3), (cx_struct + 5.0, 68.3)], r=1.8)

    # To Semantic Changes (middle)
    draw_straight_arrow((cx_sem, y_ext - h_ext/2.0), (cx_sem, y_sem + h_sem/2.0))

    # To Behavioral Changes (right)
    draw_rounded_connector((cx_ext + 8.0, y_ext - h_ext/2.0),
                           (cx_beh, y_beh + h_beh/2.0),
                           [(cx_ext + 8.0, 68.3), (cx_beh, 68.3)], r=1.8)

    # 5. NLP Model (below Semantic and Behavioral changes)
    w_nlp = 26.0
    h_nlp = 5.5
    cx_nlp = 63.5
    y_nlp = 50.5
    draw_node(cx_nlp, y_nlp, w_nlp, h_nlp, "NLP Model", fontsize=11)

    # Connectors from Semantic & Behavioral to NLP Model
    draw_rounded_connector((cx_sem, y_sem - h_sem/2.0),
                           (cx_nlp - 5.5, y_nlp + h_nlp/2.0),
                           [(cx_sem, 55.8), (cx_nlp - 5.5, 55.8)], r=1.5)

    draw_rounded_connector((cx_beh, y_beh - h_beh/2.0),
                           (cx_nlp + 5.5, y_nlp + h_nlp/2.0),
                           [(cx_beh, 55.8), (cx_nlp + 5.5, 55.8)], r=1.5)

    # 6. Impact Analysis (below Structural Changes and NLP Model)
    w_imp = 28.0
    h_imp = 5.2
    cx_imp = 50.0
    y_imp = 40.0
    draw_node(cx_imp, y_imp, w_imp, h_imp, "Impact Analysis", fontsize=11)

    # Connectors from Structural Changes and NLP Model to Impact Analysis
    draw_rounded_connector((cx_struct + 5.0, y_struct - h_struct/2.0),
                           (cx_imp - 7.0, y_imp + h_imp/2.0),
                           [(cx_struct + 5.0, 44.5), (cx_imp - 7.0, 44.5)], r=1.8)

    draw_rounded_connector((cx_nlp, y_nlp - h_nlp/2.0),
                           (cx_imp + 7.0, y_imp + h_imp/2.0),
                           [(cx_nlp, 44.5), (cx_imp + 7.0, 44.5)], r=1.8)

    # 7. Consumer Impact Analysis
    w_con = 28.0
    h_con = 6.8
    cx_con = 50.0
    y_con = 30.5
    draw_node(cx_con, y_con, w_con, h_con, "Consumer\nImpact Analysis", fontsize=11)
    draw_straight_arrow((cx_imp, y_imp - h_imp/2.0), (cx_con, y_con + h_con/2.0))

    # 8. Migration Recommendation
    w_mig = 28.0
    h_mig = 6.8
    cx_mig = 50.0
    y_mig = 20.0
    draw_node(cx_mig, y_mig, w_mig, h_mig, "Migration\nRecommendation", fontsize=11)
    draw_straight_arrow((cx_con, y_con - h_con/2.0), (cx_mig, y_mig + h_mig/2.0))

    # 9. Final Analysis Report
    w_rep = 28.0
    h_rep = 6.8
    cx_rep = 50.0
    y_rep = 9.5
    draw_node(cx_rep, y_rep, w_rep, h_rep, "Final Analysis\nReport", fontsize=11)
    draw_straight_arrow((cx_mig, y_mig - h_mig/2.0), (cx_rep, y_rep + h_rep/2.0))

    plt.tight_layout()
    plt.savefig(OUTPUT_PATH, dpi=300, facecolor='#FFFFFF', edgecolor='none', bbox_inches='tight')
    plt.close()
    print(f"Minimalist flowchart successfully updated at: {OUTPUT_PATH}")

if __name__ == "__main__":
    create_simple_flowchart()

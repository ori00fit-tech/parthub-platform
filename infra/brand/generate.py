# PartHub logo mark: generates the SVG masters in this folder.
#   python3 infra/brand/generate.py
# Then copy the printed paths into packages/shared/src/brand/index.jsx
# (RING, BODY, ACCENT) and the favicons (apps/*/public/favicon.svg).
# Guidelines: infra/docs/brand.md.
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
import math
NAVY, BLUE = "#102D4B", "#2875E5"
CX, CY = 36, 27          # gear centre
R_OUT, R_ROOT, R_HOLE = 21, 16.5, 8.5
TEETH = 8
ACCENT = 1               # index of the blue tooth (upper right)
OFFSET = -math.pi/2 + math.pi/TEETH   # teeth between top and upper right

def pt(r, a): return f"{CX + r*math.cos(a):.2f},{CY + r*math.sin(a):.2f}"

def tooth(i):
    step = 2*math.pi/TEETH
    a = OFFSET + i*step
    w_root, w_tip = step*0.30, step*0.20
    return f"M{pt(R_ROOT-1, a-w_root)}L{pt(R_OUT, a-w_tip)}L{pt(R_OUT, a+w_tip)}L{pt(R_ROOT-1, a+w_root)}Z"

ring = (f"M{CX+R_ROOT},{CY}A{R_ROOT},{R_ROOT} 0 1 0 {CX-R_ROOT},{CY}A{R_ROOT},{R_ROOT} 0 1 0 {CX+R_ROOT},{CY}Z"
        f"M{CX+R_HOLE},{CY}A{R_HOLE},{R_HOLE} 0 1 1 {CX-R_HOLE},{CY}A{R_HOLE},{R_HOLE} 0 1 1 {CX+R_HOLE},{CY}Z")
# P stem: from the top of the bowl down, cut at an angle at the foot.
stem = "M12,8H23V50L12,58Z"
teeth = "".join(tooth(i) for i in range(TEETH) if i != ACCENT)

def mark(main, accent, size=None, bg=None, radius=14):
    s = f' width="{size}" height="{size}"' if size else ""
    tile = f'<rect width="64" height="64" rx="{radius}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"{s}>{tile}'
            f'<path fill="{main}" fill-rule="evenodd" d="{ring}"/>'
            f'<path fill="{main}" d="{stem}{teeth}"/>'
            f'<path fill="{accent}" d="{tooth(ACCENT)}"/></svg>')

open("mark.svg","w").write(mark(NAVY, BLUE))
open("mark-white.svg","w").write(mark("#FFFFFF", "#5B9BFF"))
open("mark-mono.svg","w").write(mark("#111827", "#111827"))
open("favicon.svg","w").write(mark(NAVY, BLUE, bg="#FFFFFF"))
print("RING  =", ring)
print("BODY  =", stem + teeth)
print("ACCENT=", tooth(ACCENT))

#!/usr/bin/env python3
"""Export the repo's skills so they work outside kit-studio.

    python3 tools/export_skills.py

Builds, from .claude/skills/:
  skills-export/<name>.zip        one zip per skill, ready for claude.ai > Settings > Capabilities > Skills > Upload
  plugin/vamos-studio/            a Claude Code plugin (listed by .claude-plugin/marketplace.json at the repo root)

Skills that drive the motion/ engine get the parts they need bundled inside them, and their
"lives in motion/" note is rewritten, so each export is self-contained.
"""
import json, re, shutil, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / ".claude" / "skills"
ZIPS = ROOT / "skills-export"
PLUGIN = ROOT / "plugin" / "vamos-studio"
MOTION = ROOT / "motion"
SKIP = {"__pycache__", "node_modules", "dist", ".DS_Store"}

NOTE = re.compile(r"\n> \*\*kit-studio:\*\*.*?\n", re.S)
BUNDLES = {  # skill -> (folders/files from motion/ to copy in, note that replaces the kit-studio one)
    "sound-design": (["sfx"], "The `sfx/` engine is bundled in this skill folder. Copy `sfx/` into the project root (or run from this folder), then every path below works as written."),
    "web-sims": (["sims"], "The `sims/` kit is bundled in this skill folder. Copy `sims/` into the project root; it needs Node and Playwright with Chromium."),
    "review-loop": (["scripts/sheet.mjs", "scripts/wave.mjs"], "`scripts/sheet.mjs` and `scripts/wave.mjs` are bundled in this skill folder. Copy them into the project's `scripts/` and add the `draft`, `sheet`, `still` and `wave` npm scripts to a Remotion project."),
    "motion-design": ([], "These rules assume a Remotion project with a `timeline.json`; the helpers named here (`sp`, `C`) are conventions to create in the project, not a library."),
}


def ignore(_, names):
    return [n for n in names if n in SKIP or n.endswith(".pyc")]


def build(name, src, dst):
    shutil.copytree(src, dst, ignore=ignore)
    if name in BUNDLES:
        parts, note = BUNDLES[name]
        for part in parts:
            p = MOTION / part
            (shutil.copytree(p, dst / part, ignore=ignore) if p.is_dir()
             else (dst / part).parent.mkdir(parents=True, exist_ok=True) or shutil.copy2(p, dst / part))
        md = dst / "SKILL.md"
        md.write_text(NOTE.sub(f"\n> **Bundled:** {note}\n", md.read_text(encoding="utf-8"), count=1), encoding="utf-8")


def main():
    skills = sorted(p for p in SRC.iterdir() if (p / "SKILL.md").is_file())
    for d in (ZIPS, PLUGIN):
        shutil.rmtree(d, ignore_errors=True)
    ZIPS.mkdir(parents=True)
    (PLUGIN / "skills").mkdir(parents=True)

    for s in skills:
        dst = PLUGIN / "skills" / s.name
        build(s.name, s, dst)
        with zipfile.ZipFile(ZIPS / f"{s.name}.zip", "w", zipfile.ZIP_DEFLATED) as z:
            for f in sorted(dst.rglob("*")):
                if f.is_file():
                    z.write(f, Path(s.name) / f.relative_to(dst))
        print(f"{s.name:28s} {(ZIPS / f'{s.name}.zip').stat().st_size // 1024:5d} KB")

    (PLUGIN / ".claude-plugin").mkdir()
    (PLUGIN / ".claude-plugin" / "plugin.json").write_text(json.dumps({
        "name": "vamos-studio",
        "description": "VAMOS brand, motion design (Remotion, procedural sound, review loop, web sims), the VAMOS kit-story pipeline, and a full YouTube toolkit.",
        "version": "1.0.0",
        "author": {"name": "VAMOS"},
        "keywords": ["vamos", "motion", "remotion", "youtube", "shorts", "brand"],
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\n{len(skills)} skills -> {ZIPS.relative_to(ROOT)}/ and {PLUGIN.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()

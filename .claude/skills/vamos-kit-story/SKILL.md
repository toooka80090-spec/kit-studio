---
name: vamos-kit-story
description: VAMOS jersey pipeline — for every shirt photo in a folder, generate model shots on Magnific (Nano Banana 2) through the browser, check each against the original, and build the 1080x1920 3x3 story. Use when asked to process a VAMOS / kit / jersey folder, e.g. "/vamos-kit-story E:\...\Real madrid single".
---

# VAMOS kit story pipeline

Runs on the owner's computer: needs the shirt folder on disk and a browser signed in to magnific.com
(Claude in Chrome or the built-in browser). Work through the whole folder without asking; report at the end.

## 0. Setup (once per folder)
- Folder = the argument. Model identity reference (@img1):
  `E:\Tarek ghaly\work\New work\Vamos T-shirt\ذكاء اصطناعي\ستوريات دوريات جديده\barcelona\Barcelona 2627 Home - model front.png`
- `python tools/vamos_story.py status "<folder>"` lists every shirt as TODO / READY / DONE. Skip DONE (resume-safe).
- Keep a log at `<folder>\vamos-log.json`: per shirt → images generated, retries + reason, credits.
- A shirt = one original photo `<base>.jpg`, or a pair `<base> front.jpg` + `<base> back.jpg` (one player → ONE story named `<base>`).

## 1. Read the original (before any credit is spent)
Open the original(s) and write down every element; this becomes the JERSEY block of the prompt:
BODY (base color, pattern, stripes, texture) · COLLAR (V / round / polo, band count, color) · CUFFS ·
WEARER'S LEFT CHEST · WEARER'S RIGHT CHEST · CENTER CHEST (sponsor exact shape/text) · SLEEVES (patches, which arm) ·
BACK (name + number, font, color) if a back photo exists.
Wearer's left = viewer's right on a front photo. Decide the 3rd shot: **back** if the shirt has a player name/number, else **close**.

## 2. Generate on Magnific
magnific.com → Image Generator. Settings, every time: model **Google Nano Banana 2** · **3:4** · **2K · Fast** ·
**AI prompt OFF**. 75 credits per image. References: @img1 = model identity, @img2 = original shirt, @img3 = back photo (if any).

Prompt template — fill [POSE] and the JERSEY block, nothing else changes:

```
Image 1 is ONLY the model identity reference (face, skin, body, hair) - ignore his clothing. Image 2 is the EXACT football jersey to recreate - copy every logo, color, stripe and text 1:1. ONE single full-frame photograph (NOT a collage). Premium studio e-commerce photo: the same male model wearing the jersey, [POSE]. Wearing plain black athletic shorts. Mid-20s, athletic build, light olive skin, short dark brown hair with low fade, light stubble, no tattoos, no jewelry. JERSEY - MATCH IMAGE 2 EXACTLY: BODY: … COLLAR: … CUFFS: … WEARER'S LEFT CHEST: … WEARER'S RIGHT CHEST: … CENTER CHEST: … SLEEVES: … LIGHTING & BACKGROUND: pure seamless white studio background, soft grey floor shadow, soft key light front-left + gentle rim light, true colors. CAMERA: 85mm lens, f/8, tack-sharp, ultra-detailed fabric, 8k, vertical 3:4. NEGATIVE: no hang tags, no grass, no extra logos, no extra sponsors, no misspelled text, no text or letters in the background, no watermark[, + recurring mistakes for this shirt].
```

[POSE]:
- front: `standing straight facing the camera, arms relaxed, framed from just below the nose to mid-thigh`
- 3-4: `body rotated ~35° to viewer's right, one hand on hip, framed from just below the nose to mid-thigh`
- close: `tight close-up from the chin down to the bottom of the sponsor, 100mm macro` (replace "85mm lens, f/8" with "100mm macro lens")
- back: `rear view, back of head only, name and number flat and fully legible` (add Image 3 = back reference)

Pre-empt the known failures in every prompt where they apply:
- Icon-only sponsor (e.g. Spotify circle): `ONLY the round icon, NO wordmark text next to it`.
- Monochrome crest: `flat monochrome, NO gold/red`.
- Brand logo position: state the exact side + height (e.g. `small trefoil on WEARER'S RIGHT chest at crest height`).
- V-neck: `shallow V-neck, single band, NOT round`.
- Sleeve patch: `ONLY the wearer's RIGHT sleeve` (or LEFT) + `the other sleeve is plain`.

Download the result from `pikaso.cdnpk.net` and save next to the original as
`<base> - model front.png`, `<base> - model 3-4.png`, `<base> - model close.png` | `<base> - model back.png`.
Saving to disk: keep each write under ~100 MB — save images one or two at a time.

## 3. Check every image against the original (zoom in)
Brand logo + position · sponsor shape/spelling · crest + color (color vs monochrome) · collar type · cuffs ·
stripes/pattern · patches + which sleeve · name/number + font · no collage, no hang tag, no grass, no extra text.
Any mismatch → regenerate ONLY that image with the failing element spelled out more strongly and added to NEGATIVE.
Max 2 retries per image; after that keep the best one and flag it in the report.
Close-up came back as a wide front shot? Don't spend credits — cut it from the front:
`python tools/vamos_story.py close-from-front "<base> - model front.png" --top 0.0 --bottom 0.45`
(adjust top/bottom so it runs chin → bottom of sponsor).

## 4. Build the story
Row 1 is automatic (front · 3-4 · close/back). Rows 2–3 = 6 close crops: crest, sponsor, collar, sleeve/patch,
fabric, name/number (back shirts). Look at the original + model shots, then write `<base> - crops.json`:

```json
[{"src": "model front", "cx": 0.62, "cy": 0.30, "h": 0.22},
 {"src": "original", "cx": 0.50, "cy": 0.42, "h": 0.25, "rot": -8}, ...6 entries]
```
`src`: original · original back · model front · model 3-4 · model close · model back. `cx/cy` = crop center (0–1),
`h` = crop height as share of the source height, `rot` optional. Crops of the ORIGINAL must stay inside the shirt:
no grass, no tag, no hands.

`python tools/vamos_story.py story "<folder>" "<base>"` → `<base> - story.png` (1080×1920, 9 px white gutters).
It refuses to save if a cell looks like grass — fix that crop. Then open the PNG and look at all 9 cells yourself.

## 5. Report (Arabic, short)
Per folder: shirts done, images generated, which images were redone and why, close-ups cut from front,
anything flagged, approximate credits (images × 75).

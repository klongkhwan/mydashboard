# 🎬 MASTER PROMPT — TikTok Clip Editor Web App Feature
> คัดลอก prompt นี้ไปวางใน AI บน IDE (Cursor, Windsurf, GitHub Copilot Chat, ฯลฯ) ได้เลย

---

## 📌 CONTEXT — บอก AI ว่าเว็บเดิมคืออะไร

```
I have an existing web application built with [FRAMEWORK เช่น Next.js 14 / React + Vite / plain HTML].
Stack: [เช่น React, TypeScript, Tailwind CSS, Node.js backend]
I want to add a complete TikTok-style video clip editor feature as a new page/module.
Do NOT rewrite the existing app. Only add the new editor module.
```

> ⚠️ แก้ `[FRAMEWORK]` และ `[Stack]` ให้ตรงกับโปรเจคจริงของคุณก่อนวาง

---

## 🏗️ PROMPT 1 — โครงสร้างและ Layout หลัก

```
Create a TikTok clip editor page with this layout:

LEFT PANEL (320px wide, fixed):
- Video file upload area (drag & drop + click to browse)
- Accept: MP4, MOV, WebM, up to 500MB
- After upload: show video thumbnail preview + file info (name, duration, size)
- Project list: show saved drafts below the upload area

CENTER PANEL (flex-grow, main workspace):
- Video preview player (16:9 container that shows 9:16 phone frame overlay)
- Below player: Timeline scrubber bar (full width)
- Timeline shows: current time / total duration
- Playback controls: Play/Pause, Step back 1s, Step forward 1s, volume slider

RIGHT PANEL (300px wide, fixed):
- Tab navigation: Effects | Text | Audio | Format
- Each tab shows relevant settings (details in next prompts)

BOTTOM BAR:
- Export button (primary CTA)
- Save Draft button
- Undo / Redo buttons

Use CSS Grid for the 3-column layout. Make center panel scrollable if content overflows.
The overall theme should be dark (background #0f0f0f) with accent color #fe2c55 (TikTok red).
```

---

## ✂️ PROMPT 2 — Timeline และการตัดคลิป

```
Implement the video Timeline editor component:

TIMELINE COMPONENT:
- Horizontal scrollable timeline bar showing the full video duration
- Draggable LEFT handle = trim start point
- Draggable RIGHT handle = trim end point  
- Yellow highlight between handles = selected clip region
- Click anywhere on timeline to seek to that time
- Show time markers every 5 seconds above the bar
- Show current playhead as a vertical red line that moves during playback

CLIP OPERATIONS (toolbar above timeline):
- Split at current time: cuts the clip into two segments
- Delete segment: removes the selected segment and closes the gap
- Add clip: append another video file to the timeline
- Speed control: dropdown 0.5x / 0.75x / 1x / 1.5x / 2x

KEYBOARD SHORTCUTS:
- Space = play/pause
- Left/Right arrow = seek ±1 frame
- [ and ] = set trim start/end at current position
- Delete = remove selected segment
- Ctrl+Z = undo, Ctrl+Shift+Z = redo

Store timeline state in a React context (or Zustand store) so all panels can access current trim start/end times.
```

---

## 🎨 PROMPT 3 — เอฟเฟ็กและฟิลเตอร์

```
Build the Effects tab panel (shown in right panel when "Effects" tab is active):

FILTER SECTION (scrollable horizontal strip):
- Show filter preview thumbnails (use CSS filter on a small video still)
- Filters: None, Vivid, Matte, B&W, Warm, Cool, Fade, Cinematic, Vintage, Neon
- Each filter maps to a CSS filter string: e.g. Vivid = "saturate(1.8) contrast(1.1)"
- Apply selected filter to the main video preview in real-time via CSS

COLOR ADJUSTMENT sliders (below filters):
- Brightness: -100 to +100 (default 0)
- Contrast: -100 to +100 (default 0)  
- Saturation: -100 to +100 (default 0)
- Each slider updates CSS filter on the video element in real-time

TRANSITIONS section:
- Dropdown: None / Fade / Slide left / Slide right / Zoom in
- Applied at the cut point between two clips

BACKGROUND section (for 9:16 conversion):
- When video is not 9:16 ratio, show background options:
  - Blur (Gaussian blur of original video as background) — DEFAULT
  - Color (color picker)
  - Solid black
- Show live preview of how it looks in the phone frame overlay

Store all effect settings in state. Export final settings object: 
{ filter: string, brightness: number, contrast: number, saturation: number, transition: string, background: object }
```

---

## 📝 PROMPT 4 — ซับไตเติ้ลและข้อความ

```
Build the Text/Subtitle tab panel:

AUTO CAPTION section:
- Button: "Generate Captions (AI)" 
- On click: call POST /api/transcribe with { videoUrl, language }
- Show loading spinner while processing
- On success: populate a subtitle list below
- Each subtitle item shows: [00:01.2 → 00:03.8] "Text content here" [Edit] [Delete]

SUBTITLE LIST:
- Editable inline text for each subtitle entry
- Click time stamps to seek video to that position
- Drag to reorder subtitles
- Add new subtitle manually with [+ Add subtitle] button

TEXT STYLE CONTROLS (shown when a subtitle is selected):
- Font family selector: dropdown with 5 options (include a Thai-compatible font like Sarabun)
- Font size: 12 to 72px slider
- Color: color picker
- Background: None / Semi-transparent black / Solid color
- Position: Top / Center / Bottom (with Y offset slider)
- Animation: None / Typewriter / Fade in / Pop

PREVIEW:
- Subtitles must render as overlay on the video preview in real-time
- Use absolutely-positioned div overlay on top of the video element, synced to currentTime

EXPORT:
- Export as SRT file button (downloads subtitle.srt)
- Burn into video: checkbox (passed to export settings)

State shape:
subtitles: Array<{ id, startTime, endTime, text, style: { font, size, color, bgColor, position, animation } }>
```

---

## 🎵 PROMPT 5 — เสียงและดนตรี

```
Build the Audio tab panel:

ORIGINAL AUDIO:
- Toggle to mute/unmute original video audio
- Volume slider (0–100%)
- Show waveform visualization of the audio track (use Web Audio API AnalyserNode)

BACKGROUND MUSIC section:
- Upload custom audio file (MP3, WAV, M4A)
- OR choose from preset library: show 6–8 royalty-free track options with play preview button
- BGM volume slider (0–100%)
- Loop BGM checkbox
- Fade in / Fade out toggles (add 1s fade)

VOICEOVER section:
- Record button: uses MediaRecorder API to capture microphone input
- Show recording timer while recording
- Play back recording before accepting
- Accept / Re-record / Delete controls
- Voiceover volume slider

NOISE REDUCTION toggle:
- Checkbox "Reduce background noise"
- Applies a basic audio processing flag to export settings

State shape:
audio: { 
  originalVolume: number, 
  originalMuted: boolean,
  bgmFile: File | null, 
  bgmTrackId: string | null,
  bgmVolume: number,
  bgmLoop: boolean,
  bgmFadeIn: boolean,
  bgmFadeOut: boolean,
  voiceoverBlob: Blob | null,
  voiceoverVolume: number,
  noiseReduction: boolean
}
```

---

## 📱 PROMPT 6 — ปรับรูปแบบ TikTok

```
Build the Format tab panel:

ASPECT RATIO section:
- Display current video ratio detected automatically
- Conversion options: 9:16 (TikTok) ✓ selected | 1:1 (square) | 16:9 (landscape)
- Show phone frame preview that updates when ratio changes

DURATION LIMITS:
- Checkbox options: 15s max | 30s max | 60s max | 3 min max | No limit
- If video is longer than selected limit, show warning and option to auto-trim to first N seconds

COVER/THUMBNAIL section:
- Horizontal filmstrip: show frames from the video every 10% of duration (10 frames total)
- Click any frame to set as cover thumbnail
- OR upload custom image
- Preview the selected thumbnail in a phone mockup

WATERMARK section:
- Toggle: Add watermark
- Text input for watermark text (default: website URL)
- Position: Bottom-right / Bottom-left / Top-right / Top-left
- Opacity slider: 20–80%

OUTPUT QUALITY:
- Radio buttons: 720p | 1080p | Original
- Estimated file size shown based on selection (calculate: bitrate × duration)
- Note: "TikTok recommends 1080p"

State shape:
format: {
  aspectRatio: '9:16' | '1:1' | '16:9',
  durationLimit: number | null,
  thumbnailTime: number,
  thumbnailCustom: File | null,
  watermark: { enabled: boolean, text: string, position: string, opacity: number },
  quality: '720p' | '1080p' | 'original'
}
```

---

## 📤 PROMPT 7 — Export และ Preview

```
Build the Export flow:

PREVIEW MODAL (before export):
- Full-screen modal with phone frame mockup
- Play the full edited video with all effects, subtitles, and audio applied (using canvas rendering or CSS transforms)
- Show estimated duration and file size
- [Export] and [Back to edit] buttons

EXPORT PROCESS:
- On Export click: collect all state (trimPoints, effects, subtitles, audio, format)
- POST to /api/export with the full settings JSON + video reference
- Show progress bar (poll /api/export/:jobId/status every 2 seconds)
- On complete: show download link for the MP4 file
- Also show "Share link" button that copies a public URL

SAVE DRAFT:
- Auto-save to localStorage every 30 seconds
- Manual save button: POST /api/projects with current state
- Show toast notification "Draft saved" on success
- Project list in left panel refreshes after save

ERROR HANDLING:
- If video too large: show "File exceeds 500MB limit" inline error
- If export fails: show error message with retry button
- If transcribe fails: show "Caption generation failed, try again" with retry

The export API should receive this payload:
{
  videoId: string,
  trimStart: number,       // seconds
  trimEnd: number,         // seconds
  effects: { filter, brightness, contrast, saturation, transition, background },
  subtitles: Subtitle[],
  burnSubtitles: boolean,
  audio: AudioSettings,
  format: FormatSettings,
  outputName: string
}
```

---

## 🤖 PROMPT 8 — AI Features (ถ้าต้องการ)

```
Add these AI-powered features using the Anthropic API (claude-sonnet-4-20250514):

1. AUTO CAPTION (Speech-to-text):
   - Use Whisper API or Web Speech API for transcription
   - POST /api/transcribe: receives video, returns subtitle array
   - Support Thai and English languages

2. SMART HASHTAG & CAPTION SUGGESTER:
   - Button: "Suggest Caption & Hashtags" 
   - Call Anthropic API with prompt:
     "Based on this video description: [user fills in], suggest 5 TikTok captions and 15 relevant hashtags. Return JSON: { captions: string[], hashtags: string[] }"
   - Show results in a popup with copy buttons for each option

3. AUTO HIGHLIGHT DETECTION:
   - Button: "Find Best Moments"
   - Analyze audio peaks + scene changes to suggest trim points
   - Highlight the suggested range on timeline in green
   - User can accept or ignore the suggestion

All AI calls should show a loading state with skeleton UI.
Handle API errors gracefully with user-friendly messages.
```

---

## 🗂️ PROMPT 9 — โครงสร้างไฟล์และ State Management

```
Organize the editor feature with this file structure:

src/
  features/
    clip-editor/
      index.tsx                  # Main editor page component
      EditorLayout.tsx           # 3-column layout shell
      
      components/
        VideoPlayer.tsx           # Video element + phone frame overlay
        Timeline.tsx              # Timeline scrubber + handles
        ClipToolbar.tsx           # Split, delete, speed controls
        
        panels/
          LeftPanel.tsx           # Upload + project list
          EffectsPanel.tsx        # Filters, color, transitions
          TextPanel.tsx           # Subtitles + text styling
          AudioPanel.tsx          # BGM, voiceover, volume
          FormatPanel.tsx         # Ratio, duration, thumbnail
        
        modals/
          PreviewModal.tsx        # Full preview before export
          ExportProgress.tsx      # Export progress modal
      
      hooks/
        useVideoPlayer.ts         # Video playback logic
        useTimeline.ts            # Trim, split, seek logic  
        useExport.ts              # Export API calls + polling
        useAutoSave.ts            # Auto-save to localStorage
      
      store/
        editorStore.ts            # Zustand store for all editor state
      
      types/
        editor.types.ts           # TypeScript interfaces for all state shapes
      
      utils/
        timeFormat.ts             # formatTime(seconds) → "00:01:23"
        fileValidation.ts         # Check file type and size
        subtitleParser.ts         # Parse/generate SRT format

Use Zustand for global editor state.
Use React Query (TanStack Query) for API calls (transcribe, export, save project).
```

---

## ✅ PROMPT 10 — Checklist สำหรับตรวจก่อน deploy

```
Before considering the editor feature complete, verify:

FUNCTIONALITY:
□ Video upload works (drag & drop + file picker)
□ Timeline trim handles drag correctly without lag
□ Play/Pause syncs with timeline position
□ All 4 right panel tabs switch correctly
□ Filters apply to video preview in real-time
□ Subtitles show as overlay synced to video time
□ Export button sends correct payload to API
□ Draft auto-saves every 30 seconds
□ Undo/Redo works for at least 20 steps back

PERFORMANCE:
□ Timeline drag doesn't cause re-renders of unrelated components (use memo/useCallback)
□ Video preview stays smooth at 30fps minimum
□ Large file upload shows progress indicator

RESPONSIVE:
□ Works on 1280px+ desktop (minimum supported width)
□ Panels are resizable via drag handles between columns

ACCESSIBILITY:
□ All buttons have aria-label
□ Keyboard shortcuts work (Space, arrows, [ ], Delete, Ctrl+Z)
□ Focus visible on all interactive elements

EDGE CASES:
□ Very short video (< 3 seconds) — timeline still usable
□ Very long video (> 10 minutes) — timeline scrolls horizontally
□ No audio track in video — audio panel shows appropriate message
□ Export fails halfway — error shown with retry option
```

---

## 💡 วิธีใช้ Prompt นี้

1. **เริ่มจาก PROMPT 1** — สร้าง layout หลักก่อน แล้ว commit
2. **ทำทีละ PROMPT** — อย่าส่งทุก prompt พร้อมกัน AI จะสับสน
3. **แก้ `[FRAMEWORK]` ก่อน** — บอก AI ว่า stack ของคุณคืออะไรทุกครั้ง
4. **ใช้ PROMPT 9** หลังจากได้ทุก component แล้ว ให้ AI จัดโครงสร้างไฟล์
5. **PROMPT 10** ใช้เป็น QA checklist สุดท้ายก่อน deploy

> 💬 **Tip:** ถ้าใช้ Cursor หรือ Windsurf ให้เปิดไฟล์ที่เกี่ยวข้องไว้ใน context ด้วย จะได้ผลดีกว่าการวาง prompt เปล่าๆ

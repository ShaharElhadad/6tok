# 6TOK Whisper Server — Max-Accuracy Hebrew Transcription

Local FastAPI wrapper around **WhisperX** (faster-whisper `large-v3` + phoneme-level forced alignment).
Optimized for **accuracy first**, not speed. Handles long calls via WhisperX batched inference + VAD.

## Why WhisperX (not raw Whisper)

- **Accurate word-level timestamps** — forced alignment with wav2vec2 corrects Whisper's sloppy timings (essential for "click word → seek audio").
- **VAD filtering** — avoids common Whisper hallucinations on silence.
- **Batched inference** — scales to multi-hour calls without memory blowup.
- **faster-whisper large-v3** — current top-accuracy Whisper model (not turbo).

## Install

```bash
cd whisper-server
python -m venv .venv
# linux/mac
source .venv/bin/activate
# windows
# .venv\Scripts\activate

# GPU (recommended):
pip install torch==2.3.1 --index-url https://download.pytorch.org/whl/cu121
# or CPU-only:
# pip install torch==2.3.1

pip install -r requirements.txt
```

On **Hostinger VPS**: if no GPU, it runs on CPU with `compute_type=int8` (slower but still accurate).

## Run

```bash
uvicorn server:app --host 0.0.0.0 --port 8787
```

Set env vars if needed:

```bash
# defaults shown
DEVICE=cuda          # or cpu
COMPUTE_TYPE=float16 # or int8 (cpu)
MODEL_NAME=large-v3
BATCH_SIZE=16        # 4 on CPU
DEFAULT_LANG=he
INIT_PROMPT="שיחת מכירה טלפונית בעברית..."
HF_TOKEN=            # optional, only for speaker diarization
```

## API

### `POST /transcribe`

Multipart form:
- `audio` — file (mp3, wav, m4a, ogg, flac, webm — anything ffmpeg reads)
- `language` — default `he`
- `diarize` — `1` to enable speaker diarization (requires `HF_TOKEN`)
- `min_speakers` / `max_speakers` — optional hints

Response:
```json
{
  "ok": true,
  "language": "he",
  "duration_sec": 182.4,
  "segments": [
    {
      "idx": 0,
      "start_ms": 120,
      "end_ms": 3480,
      "text": "שלום, מדבר דוד מ־6TOK.",
      "speaker": "SPEAKER_00",
      "words": [
        { "text": "שלום,", "start_ms": 120, "end_ms": 480, "score": 0.98 },
        { "text": "מדבר", "start_ms": 620, "end_ms": 950, "score": 0.96 }
      ]
    }
  ]
}
```

### `GET /health`
`{"ok": true}`

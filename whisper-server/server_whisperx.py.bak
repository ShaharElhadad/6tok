"""
6TOK Whisper server — maximum-accuracy Hebrew transcription.

Stack:
  - WhisperX (https://github.com/m-bain/whisperX) — faster-whisper + wav2vec2 forced alignment
  - faster-whisper large-v3 (HIGHEST accuracy, not turbo)
  - Hebrew language forced, beam=5, VAD filter
  - Forced phoneme alignment gives accurate word-level timestamps
    (much better than raw Whisper timestamps — critical for "click word → seek audio")

Endpoints:
  POST /transcribe (multipart: audio=<file>, [language=he], [diarize=0|1])
  GET  /health
  GET  /  (info)

Run:
  uvicorn server:app --host 0.0.0.0 --port 8787

Env:
  DEVICE        = cuda | cpu            (auto-detected)
  COMPUTE_TYPE  = float16 | int8        (auto)
  MODEL_NAME    = large-v3              (default; highest accuracy)
  BATCH_SIZE    = 16 (GPU) / 4 (CPU)
  HF_TOKEN      = <Hugging Face token>  (only needed for diarization)
  INIT_PROMPT   = optional Hebrew vocabulary prompt to bias decoding
"""

import os
import gc
import tempfile
import logging
from pathlib import Path
from typing import Optional

import torch
import whisperx
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("6tok-whisper")

DEVICE = os.getenv("DEVICE") or ("cuda" if torch.cuda.is_available() else "cpu")
COMPUTE_TYPE = os.getenv("COMPUTE_TYPE") or ("float16" if DEVICE == "cuda" else "int8")
MODEL_NAME = os.getenv("MODEL_NAME", "large-v3")
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "16" if DEVICE == "cuda" else "4"))
HF_TOKEN = os.getenv("HF_TOKEN")
DEFAULT_LANG = os.getenv("DEFAULT_LANG", "he")
INIT_PROMPT = os.getenv(
    "INIT_PROMPT",
    "שיחת מכירה טלפונית בעברית. המוכר מציג את המוצר, עונה להתנגדויות, ומנסה לסגור עסקה.",
)

log.info("Starting 6TOK Whisper: device=%s compute=%s model=%s", DEVICE, COMPUTE_TYPE, MODEL_NAME)

# ASR model (loaded once)
asr_model = whisperx.load_model(
    MODEL_NAME,
    device=DEVICE,
    compute_type=COMPUTE_TYPE,
    language=DEFAULT_LANG,
    asr_options={
        # Accuracy-first settings
        "beam_size": 5,
        "best_of": 5,
        "patience": 1.0,
        "temperatures": [0.0, 0.2, 0.4, 0.6, 0.8, 1.0],
        "compression_ratio_threshold": 2.4,
        "log_prob_threshold": -1.0,
        "no_speech_threshold": 0.6,
        "condition_on_previous_text": True,
        "initial_prompt": INIT_PROMPT,
        "suppress_numerals": False,
        "hotwords": None,
    },
    vad_options={
        "vad_onset": 0.500,
        "vad_offset": 0.363,
    },
)

# Alignment model cache by language
_align_cache: dict = {}


def get_align_model(lang: str):
    if lang in _align_cache:
        return _align_cache[lang]
    try:
        model_a, metadata = whisperx.load_align_model(language_code=lang, device=DEVICE)
        _align_cache[lang] = (model_a, metadata)
        log.info("Loaded alignment model for %s", lang)
        return (model_a, metadata)
    except Exception as e:
        log.warning("No alignment model for %s: %s", lang, e)
        return None


app = FastAPI(title="6TOK Whisper", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "service": "6tok-whisper",
        "model": MODEL_NAME,
        "device": DEVICE,
        "compute_type": COMPUTE_TYPE,
        "default_lang": DEFAULT_LANG,
        "diarization": bool(HF_TOKEN),
    }


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language: Optional[str] = Form(None),
    diarize: int = Form(0),
    min_speakers: Optional[int] = Form(None),
    max_speakers: Optional[int] = Form(None),
):
    suffix = Path(audio.filename or "").suffix or ".wav"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        content = await audio.read()
        tmp.write(content)
        tmp.flush()
        tmp.close()
        audio_path = tmp.name

        lang = (language or DEFAULT_LANG).lower()

        log.info("Transcribing %s (%d bytes) lang=%s diarize=%s", audio.filename, len(content), lang, bool(diarize))

        wav = whisperx.load_audio(audio_path)

        # 1) ASR
        result = asr_model.transcribe(
            wav,
            batch_size=BATCH_SIZE,
            language=lang,
        )

        detected_lang = result.get("language", lang)

        # 2) Forced alignment for accurate word timestamps
        align_pair = get_align_model(detected_lang)
        if align_pair is not None:
            model_a, metadata = align_pair
            try:
                result = whisperx.align(
                    result["segments"],
                    model_a,
                    metadata,
                    wav,
                    DEVICE,
                    return_char_alignments=False,
                )
            except Exception as e:
                log.warning("Alignment failed, returning raw ASR segments: %s", e)

        # 3) Optional diarization
        if diarize and HF_TOKEN:
            try:
                diarize_model = whisperx.DiarizationPipeline(use_auth_token=HF_TOKEN, device=DEVICE)
                diarize_segments = diarize_model(
                    wav,
                    min_speakers=min_speakers,
                    max_speakers=max_speakers,
                )
                result = whisperx.assign_word_speakers(diarize_segments, result)
            except Exception as e:
                log.warning("Diarization failed: %s", e)

        # Normalize to a stable shape with ms timestamps
        segments_out = []
        for i, seg in enumerate(result.get("segments", [])):
            words_out = []
            for w in seg.get("words", []) or []:
                if "start" not in w or "end" not in w:
                    continue
                words_out.append({
                    "text": w.get("word") or w.get("text") or "",
                    "start_ms": int(round(float(w["start"]) * 1000)),
                    "end_ms": int(round(float(w["end"]) * 1000)),
                    "score": float(w.get("score", 0.0)) if w.get("score") is not None else None,
                    "speaker": w.get("speaker"),
                })
            segments_out.append({
                "idx": i,
                "start_ms": int(round(float(seg.get("start", 0.0)) * 1000)),
                "end_ms": int(round(float(seg.get("end", 0.0)) * 1000)),
                "text": (seg.get("text") or "").strip(),
                "speaker": seg.get("speaker"),
                "words": words_out,
            })

        duration_sec = float(len(wav)) / 16000.0 if wav is not None else None

        return JSONResponse({
            "ok": True,
            "language": detected_lang,
            "duration_sec": duration_sec,
            "segments": segments_out,
        })

    except Exception as e:
        log.exception("transcribe failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            os.unlink(tmp.name)
        except Exception:
            pass
        if DEVICE == "cuda":
            torch.cuda.empty_cache()
            gc.collect()

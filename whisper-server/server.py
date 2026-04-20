"""
6TOK Whisper server — free Whisper (faster-whisper large-v3) + speaker diarization

Stack:
  - faster-whisper (CTranslate2 Whisper, 4-5x faster than openai-whisper, same accuracy)
  - Native word-level timestamps
  - VAD filter avoids silence hallucinations
  - pyannote.audio 3.1 speaker diarization (optional, needs HF_TOKEN)
  - Hebrew optimized (beam_size=5, initial_prompt, condition_on_previous_text)

Run:
  uvicorn server:app --host 127.0.0.1 --port 8787

Env:
  MODEL_NAME    = large-v3              (default, highest accuracy)
  DEVICE        = cuda | cpu            (auto-detected)
  COMPUTE_TYPE  = float16 | int8        (auto)
  DEFAULT_LANG  = he
  INIT_PROMPT   = optional Hebrew vocabulary prompt to bias decoding
  HF_TOKEN      = Hugging Face token (required for diarization)
"""

import os
import tempfile
import logging
from pathlib import Path
from collections import Counter
from typing import Optional

# Load shared env from the Next.js project's .env.local if present.
try:
    from dotenv import load_dotenv
    for _p in [
        Path(__file__).resolve().parent.parent / ".env.local",
        Path(__file__).resolve().parent / ".env.local",
        Path(__file__).resolve().parent / ".env",
    ]:
        if _p.exists():
            load_dotenv(_p, override=False)
except Exception:
    pass

import torch
from faster_whisper import WhisperModel
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("6tok-whisper")

DEVICE = os.getenv("DEVICE") or ("cuda" if torch.cuda.is_available() else "cpu")
COMPUTE_TYPE = os.getenv("COMPUTE_TYPE") or ("float16" if DEVICE == "cuda" else "int8")
MODEL_NAME = os.getenv("MODEL_NAME", "large-v3")
DEFAULT_LANG = os.getenv("DEFAULT_LANG", "he")
INIT_PROMPT = os.getenv(
    "INIT_PROMPT",
    "שיחת מכירה טלפונית בעברית. המוכר מציג את המוצר, עונה להתנגדויות, ומנסה לסגור עסקה.",
)
HF_TOKEN = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_TOKEN")

log.info("Loading faster-whisper: model=%s device=%s compute=%s", MODEL_NAME, DEVICE, COMPUTE_TYPE)
model = WhisperModel(MODEL_NAME, device=DEVICE, compute_type=COMPUTE_TYPE)
log.info("ASR model loaded.")

# Lazy-init voice encoder for speaker diarization (resemblyzer).
# No HF auth needed — model weights ship with the package.
_voice_encoder = None


def get_voice_encoder():
    global _voice_encoder
    if _voice_encoder is not None:
        return _voice_encoder
    try:
        from resemblyzer import VoiceEncoder
        log.info("Loading resemblyzer voice encoder…")
        enc_device = "cuda" if DEVICE == "cuda" else "cpu"
        _voice_encoder = VoiceEncoder(device=enc_device)
        log.info("Voice encoder loaded on %s.", enc_device)
        return _voice_encoder
    except Exception as e:
        log.exception("voice encoder load failed")
        raise RuntimeError(f"טעינת מודל זיהוי הדוברים נכשלה: {e}")


app = FastAPI(title="6TOK Whisper", version="0.3.0")

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
        "engine": "faster-whisper",
        "model": MODEL_NAME,
        "device": DEVICE,
        "compute_type": COMPUTE_TYPE,
        "default_lang": DEFAULT_LANG,
        "diarization_available": True,
        "diarization_engine": "resemblyzer",
    }


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/diarize-only")
async def diarize_only(
    audio: UploadFile = File(...),
    segments_json: str = Form(...),
    min_speakers: Optional[int] = Form(2),
    max_speakers: Optional[int] = Form(4),
):
    """
    Diarize existing transcript segments without re-running ASR.
    segments_json: JSON string of [{"idx": int, "start_ms": int, "end_ms": int}, ...]
    Returns: { "assignments": [{"idx": int, "speaker": "SPEAKER_00"}, ...], "speakers": [...] }
    """
    import json
    import numpy as np
    from resemblyzer import preprocess_wav
    from sklearn.cluster import KMeans

    try:
        segs = json.loads(segments_json)
    except Exception as e:
        raise HTTPException(400, f"segments_json invalid: {e}")

    suffix = Path(audio.filename or "").suffix or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name

    try:
        enc = get_voice_encoder()
        wav = preprocess_wav(Path(tmp_path))
        sr = 16000

        embeddings = []
        valid_idx = []
        for s in segs:
            start_s = float(s["start_ms"]) / 1000.0
            end_s = float(s["end_ms"]) / 1000.0
            dur = end_s - start_s
            if dur < 0.4:
                continue
            s0 = int(round(start_s * sr))
            s1 = min(int(round(end_s * sr)), len(wav))
            clip = wav[s0:s1]
            if len(clip) < int(sr * 0.4):
                continue
            try:
                embeddings.append(enc.embed_utterance(clip))
                valid_idx.append(int(s["idx"]))
            except Exception:
                continue

        assignments = []
        speakers = []
        if len(embeddings) >= 2:
            n = int(max(min_speakers or 2, 2))
            if max_speakers is not None:
                n = min(n, int(max_speakers))
            n = min(n, len(embeddings))

            X = np.stack(embeddings)
            labels = KMeans(n_clusters=n, n_init=10, random_state=0).fit_predict(X)

            # Map labels to SPEAKER_00, _01, ... by first appearance
            first_seen = {}
            for vi, lbl in zip(valid_idx, labels):
                if int(lbl) not in first_seen:
                    first_seen[int(lbl)] = vi
            order = sorted(first_seen.keys(), key=lambda k: first_seen[k])
            label_map = {raw: f"SPEAKER_{new:02d}" for new, raw in enumerate(order)}

            # Segments with embeddings
            by_idx = {int(vi): label_map[int(lbl)] for vi, lbl in zip(valid_idx, labels)}

            # Backfill all segments (including short ones) via nearest neighbor
            all_idx = [int(s["idx"]) for s in segs]
            for i in all_idx:
                if i in by_idx:
                    assignments.append({"idx": i, "speaker": by_idx[i]})
                else:
                    nearest = min(valid_idx, key=lambda vi: abs(vi - i)) if valid_idx else None
                    assignments.append({"idx": i, "speaker": by_idx.get(nearest) if nearest is not None else None})

            speakers = sorted(set(label_map.values()))

        return JSONResponse({"assignments": assignments, "speakers": speakers})

    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


@app.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language: Optional[str] = Form(None),
    diarize: int = Form(0),
    min_speakers: Optional[int] = Form(None),
    max_speakers: Optional[int] = Form(None),
):
    suffix = Path(audio.filename or "").suffix or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        lang = (language or DEFAULT_LANG).lower()
        log.info(
            "Transcribing %s (%d bytes) lang=%s diarize=%s",
            audio.filename, len(content), lang, bool(diarize),
        )

        segments_gen, info = model.transcribe(
            tmp_path,
            language=lang,
            beam_size=5,
            best_of=5,
            patience=1.0,
            temperature=[0.0, 0.2, 0.4, 0.6, 0.8, 1.0],
            compression_ratio_threshold=2.4,
            log_prob_threshold=-1.0,
            no_speech_threshold=0.6,
            condition_on_previous_text=True,
            initial_prompt=INIT_PROMPT,
            word_timestamps=True,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 500},
        )

        segments_out = []
        for i, seg in enumerate(segments_gen):
            words = []
            for w in (seg.words or []):
                if w.start is None or w.end is None:
                    continue
                words.append({
                    "text": w.word.strip() if w.word else "",
                    "start_ms": int(round(float(w.start) * 1000)),
                    "end_ms": int(round(float(w.end) * 1000)),
                    "score": float(w.probability) if w.probability is not None else None,
                    "speaker": None,
                })
            segments_out.append({
                "idx": i,
                "start_ms": int(round(float(seg.start) * 1000)),
                "end_ms": int(round(float(seg.end) * 1000)),
                "text": (seg.text or "").strip(),
                "speaker": None,
                "words": words,
            })

        log.info("Transcribed %d segments", len(segments_out))

        # Optional: speaker diarization via resemblyzer + KMeans
        speakers_detected = None
        if diarize:
            import numpy as np
            from resemblyzer import preprocess_wav
            from sklearn.cluster import KMeans

            log.info("Running speaker diarization via resemblyzer…")
            enc = get_voice_encoder()

            # Preprocess audio once (resemblyzer expects 16kHz mono)
            wav = preprocess_wav(Path(tmp_path))
            sr = 16000

            # Extract one embedding per transcript segment (if long enough)
            embeddings = []
            valid_idx = []
            for i, seg in enumerate(segments_out):
                start_s = seg["start_ms"] / 1000.0
                end_s = seg["end_ms"] / 1000.0
                dur = end_s - start_s
                if dur < 0.4:  # too short to be reliable
                    continue
                s0 = int(round(start_s * sr))
                s1 = int(round(end_s * sr))
                if s1 > len(wav):
                    s1 = len(wav)
                clip = wav[s0:s1]
                if len(clip) < int(sr * 0.4):
                    continue
                try:
                    emb = enc.embed_utterance(clip)
                    embeddings.append(emb)
                    valid_idx.append(i)
                except Exception:
                    continue

            if len(embeddings) >= 2:
                n = int(max(min_speakers or 2, 2))
                if max_speakers is not None:
                    n = min(n, int(max_speakers))
                n = min(n, len(embeddings))

                X = np.stack(embeddings)
                km = KMeans(n_clusters=n, n_init=10, random_state=0).fit(X)
                labels = km.labels_

                # Order labels by first-appearance (SPEAKER_00 is the first to speak)
                first_seen = {}
                for seg_i, lbl in zip(valid_idx, labels):
                    if int(lbl) not in first_seen:
                        first_seen[int(lbl)] = seg_i
                order = sorted(first_seen.keys(), key=lambda k: first_seen[k])
                label_map = {raw: f"SPEAKER_{new:02d}" for new, raw in enumerate(order)}

                for seg_i, lbl in zip(valid_idx, labels):
                    seg_spk = label_map[int(lbl)]
                    segments_out[seg_i]["speaker"] = seg_spk
                    for w in segments_out[seg_i]["words"]:
                        w["speaker"] = seg_spk

                # Backfill short/unseen segments by nearest valid neighbor
                for i, seg in enumerate(segments_out):
                    if seg["speaker"] is None:
                        best_dist = 10 ** 12
                        best_spk = None
                        for vi in valid_idx:
                            d = abs(vi - i)
                            if d < best_dist:
                                best_dist = d
                                best_spk = segments_out[vi]["speaker"]
                        seg["speaker"] = best_spk
                        for w in seg["words"]:
                            w["speaker"] = best_spk

                speakers_detected = sorted(set(label_map.values()))
                log.info("Diarization: %d embeddings → %s", len(embeddings), speakers_detected)
            else:
                log.info("Too few long-enough segments for diarization (%d)", len(embeddings))

        return JSONResponse({
            "ok": True,
            "language": info.language,
            "duration_sec": float(info.duration) if info.duration else None,
            "segments": segments_out,
            "speakers": speakers_detected,
        })

    except Exception as e:
        log.exception("transcribe failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass

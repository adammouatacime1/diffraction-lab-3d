#!/usr/bin/env python3
"""Build offline French WAV chapters and exact subtitle timestamps.

Example:
  python scripts/video/build-narration.py \
    --speech-wrapper /workspace/video-lab/speak-fr.sh \
    --output /workspace/video-lab --rate 155

The wrapper receives output.wav and a UTF-8 text file. It must produce
uncompressed, 22050 Hz, mono, signed 16-bit WAV audio. No network is used.
Only the speech text receives pronunciation substitutions; subtitle text
remains identical to the original chapter narration, apart from whitespace.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import textwrap
import wave


SAMPLE_RATE = 22050
SAMPLE_WIDTH = 2
CHANNELS = 1
INTRO_SILENCE = 0.8
OUTRO_SILENCE = 0.8
SEGMENT_SILENCE = 0.2


def split_narration(text: str, maximum: int = 170) -> list[str]:
    """Prefer sentence/clause boundaries, then split a long clause at spaces."""
    text = " ".join(text.split())
    sentences = re.split(r"(?<=[.!?])\s+(?=[A-ZÀ-Ü])", text)
    segments: list[str] = []
    for sentence in sentences:
        clauses = (
            re.split(r"(?<=[,;:])\s+", sentence)
            if len(sentence) > maximum
            else [sentence]
        )
        current = ""
        for clause in clauses:
            if len(clause) > maximum:
                if current:
                    segments.append(current)
                    current = ""
                segments.extend(
                    textwrap.wrap(
                        clause,
                        width=maximum,
                        break_long_words=False,
                        break_on_hyphens=False,
                    )
                )
            elif current and len(current) + len(clause) + 1 > maximum:
                segments.append(current)
                current = clause
            else:
                current = f"{current} {clause}".strip()
        if current:
            segments.append(current)
    if " ".join(segments) != text:
        raise ValueError("Segmentation changed the original subtitle text")
    return segments


def speech_text(text: str) -> str:
    """Spell selected technical labels so the French voice stays intelligible."""
    substitutions = [
        (r"Diffraction Lab 3D", "Diffraction Lab trois dimensions"),
        (r"Node\.js", "nod jé èsse"),
        (r"package\.json", "paquage point jésonne"),
        (r"npm ci", "enne pé emme, cé i"),
        (r"npm run dev", "enne pé emme, reune dève"),
        (r"\bCFL\b", "cé effe elle"),
        (r"\bJSON\b", "jésonne"),
        (r"\bPNG\b", "pé enne jé"),
        (r"\bLTS\b", "elle té esse"),
        (r"\b3D\b", "trois dimensions"),
    ]
    for pattern, replacement in substitutions:
        text = re.sub(pattern, replacement, text)
    return text


def read_wave(path: Path) -> tuple[bytes, int]:
    with wave.open(str(path), "rb") as audio:
        parameters = (
            audio.getnchannels(),
            audio.getsampwidth(),
            audio.getframerate(),
            audio.getcomptype(),
        )
        if parameters != (CHANNELS, SAMPLE_WIDTH, SAMPLE_RATE, "NONE"):
            raise ValueError(f"Unsupported WAV parameters for {path}: {parameters}")
        frame_count = audio.getnframes()
        frames = audio.readframes(frame_count)
    if len(frames) != frame_count * CHANNELS * SAMPLE_WIDTH:
        raise ValueError(f"Truncated WAV: {path}")
    return frames, frame_count


def srt_time(seconds: float) -> str:
    milliseconds = round(seconds * 1000)
    hours, milliseconds = divmod(milliseconds, 3600000)
    minutes, milliseconds = divmod(milliseconds, 60000)
    whole_seconds, milliseconds = divmod(milliseconds, 1000)
    return f"{hours:02}:{minutes:02}:{whole_seconds:02},{milliseconds:03}"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--chapters", type=Path, default=Path(__file__).with_name("chapters.json")
    )
    parser.add_argument("--speech-wrapper", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--rate", type=int, default=155)
    parser.add_argument("--maximum-segment-length", type=int, default=170)
    arguments = parser.parse_args()
    wrapper = arguments.speech_wrapper.resolve(strict=True)
    output = arguments.output.resolve()
    audio_directory = output / "audio"
    audio_directory.mkdir(parents=True, exist_ok=True)
    chapters = json.loads(arguments.chapters.read_text(encoding="utf-8"))
    environment = os.environ.copy()
    environment["LAB_SPEECH_WPM"] = str(arguments.rate)
    silence = lambda duration: b"\0" * round(duration * SAMPLE_RATE) * SAMPLE_WIDTH
    intro_frames = round(INTRO_SILENCE * SAMPLE_RATE)
    segment_gap_frames = round(SEGMENT_SILENCE * SAMPLE_RATE)
    timings = []
    srt_entries = []
    global_frames = 0

    with tempfile.TemporaryDirectory(prefix="lab-narration-", dir=output) as temporary:
        temporary_path = Path(temporary)
        for chapter in chapters:
            identifier = chapter["id"]
            if not re.fullmatch(r"[a-zA-Z0-9_-]+", identifier):
                raise ValueError(f"Unsafe chapter identifier: {identifier!r}")
            segments = split_narration(
                chapter["narration"], arguments.maximum_segment_length
            )
            pieces = [silence(INTRO_SILENCE)]
            local_frames = intro_frames
            subtitles = []
            for index, text in enumerate(segments):
                text_path = temporary_path / f"{identifier}-{index:02}.txt"
                wave_path = temporary_path / f"{identifier}-{index:02}.wav"
                text_path.write_text(speech_text(text), encoding="utf-8")
                subprocess.run(
                    [str(wrapper), str(wave_path), str(text_path)],
                    check=True,
                    env=environment,
                )
                frames, frame_count = read_wave(wave_path)
                start = local_frames / SAMPLE_RATE
                local_frames += frame_count
                end = local_frames / SAMPLE_RATE
                if end <= start:
                    raise ValueError(f"Empty spoken segment: {identifier}/{index}")
                subtitles.append({"start": start, "end": end, "text": text})
                srt_entries.append(
                    (
                        (global_frames / SAMPLE_RATE) + start,
                        (global_frames / SAMPLE_RATE) + end,
                        text,
                    )
                )
                pieces.append(frames)
                if index + 1 < len(segments):
                    pieces.append(silence(SEGMENT_SILENCE))
                    local_frames += segment_gap_frames
            pieces.append(silence(OUTRO_SILENCE))
            local_frames += round(OUTRO_SILENCE * SAMPLE_RATE)
            chapter_path = audio_directory / f"{identifier}.wav"
            with wave.open(str(chapter_path), "wb") as audio:
                audio.setnchannels(CHANNELS)
                audio.setsampwidth(SAMPLE_WIDTH)
                audio.setframerate(SAMPLE_RATE)
                for piece in pieces:
                    audio.writeframesraw(piece)
            _, actual_frames = read_wave(chapter_path)
            if actual_frames != local_frames:
                raise ValueError(f"WAV frame count mismatch: {chapter_path}")
            duration = actual_frames / SAMPLE_RATE
            previous_end = -1.0
            for subtitle in subtitles:
                if not (previous_end <= subtitle["start"] < subtitle["end"] <= duration):
                    raise ValueError(f"Invalid subtitle timing: {subtitle}")
                previous_end = subtitle["end"]
            timings.append(
                {
                    **chapter,
                    "audio": f"audio/{identifier}.wav",
                    "duration": duration,
                    "start": global_frames / SAMPLE_RATE,
                    "end": (global_frames + actual_frames) / SAMPLE_RATE,
                    "subtitles": subtitles,
                }
            )
            global_frames += actual_frames
            print(f"{identifier}: {duration:.3f} s; {len(segments)} subtitle segments", flush=True)

    previous_end = -1.0
    subtitle_blocks = []
    for index, (start, end, text) in enumerate(srt_entries, 1):
        if not (previous_end <= start < end <= global_frames / SAMPLE_RATE):
            raise ValueError("Non-monotonic global subtitle timings")
        lines = textwrap.wrap(text, width=85, break_long_words=False, break_on_hyphens=False)
        subtitle_blocks.append(
            f"{index}\n{srt_time(start)} --> {srt_time(end)}\n" + "\n".join(lines)
        )
        previous_end = end
    (output / "timing.json").write_text(
        json.dumps(timings, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (output / "subtitles.srt").write_text(
        "\n\n".join(subtitle_blocks) + "\n", encoding="utf-8"
    )
    (output / "narration-info.json").write_text(
        json.dumps(
            {
                "voice": "French synthetic voice, offline eSpeak NG, fr-fr",
                "words_per_minute": arguments.rate,
                "sample_rate": SAMPLE_RATE,
                "channels": CHANNELS,
                "sample_width_bytes": SAMPLE_WIDTH,
                "chapters": len(timings),
                "subtitle_segments": len(srt_entries),
                "duration_seconds": global_frames / SAMPLE_RATE,
                "lead_in_seconds": INTRO_SILENCE,
                "lead_out_seconds": OUTRO_SILENCE,
                "segment_gap_seconds": SEGMENT_SILENCE,
                "timing": "Derived from exact synthesized WAV sample counts",
            },
            ensure_ascii=False,
            indent=2,
        ) + "\n",
        encoding="utf-8",
    )
    print(f"Total: {global_frames / SAMPLE_RATE:.3f} s; {len(srt_entries)} subtitles")


if __name__ == "__main__":
    main()

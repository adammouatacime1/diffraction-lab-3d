#!/usr/bin/env python3
"""Assemble real laboratory recordings with French narration and subtitles.

Requires Python 3, ffmpeg/ffprobe with libx264, libass and loudnorm, and
DejaVu Sans. No Python packages or network access are required.

  python scripts/video/assemble-video.py --output /workspace/video-lab
  python scripts/video/assemble-video.py --output /workspace/video-lab --chapters 01

The complete selection must have recording manifests before rendering starts.
Subset previews use an explicit ``extrait`` filename, never the final filename.
Intermediate clips are cached with input/configuration fingerprints.
"""

from __future__ import annotations

import argparse
import hashlib
import inspect
import json
import math
from pathlib import Path
import re
import subprocess
import sys
import textwrap
import wave


WIDTH = 1440
HEIGHT = 1080
MAXIMUM_BYTES = 50_000_000
SUBTITLE_WIDTH = 85
AUDIO_FILTER = "loudnorm=I=-16:TP=-1.5:LRA=7,alimiter=limit=0.63:level=false:latency=true,aresample=48000"


def run(command: list[str], *, cwd: Path, log: Path | None = None) -> str:
    if log is None:
        return subprocess.check_output(command, cwd=cwd, text=True)
    with log.open("w", encoding="utf-8") as handle:
        result = subprocess.run(command, cwd=cwd, stdout=handle, stderr=handle)
    if result.returncode:
        tail = "\n".join(log.read_text(encoding="utf-8").splitlines()[-35:])
        raise RuntimeError(f"Command failed ({result.returncode}); {log}\n{tail}")
    return log.read_text(encoding="utf-8")


def probe(path: Path) -> dict:
    return json.loads(
        run(
            ["ffprobe", "-v", "error", "-show_streams", "-show_format", "-show_chapters", "-of", "json", str(path)],
            cwd=path.parent,
        )
    )


def duration(path: Path) -> float:
    seconds = float(probe(path)["format"]["duration"])
    if not math.isfinite(seconds) or seconds <= 0:
        raise ValueError(f"Invalid media duration: {path}")
    return seconds


def timestamp(seconds: float, *, ass: bool = False) -> str:
    scale = 100 if ass else 1000
    units = round(seconds * scale)
    hours, units = divmod(units, 3600 * scale)
    minutes, units = divmod(units, 60 * scale)
    seconds, fraction = divmod(units, scale)
    if ass:
        return f"{hours}:{minutes:02}:{seconds:02}.{fraction:02}"
    return f"{hours:02}:{minutes:02}:{seconds:02},{fraction:03}"


def balanced_lines(text: str) -> list[str]:
    """Keep each cue within two reasonably balanced lines of at most 85 chars."""
    if len(text) <= SUBTITLE_WIDTH:
        return [text]
    words = text.split()
    choices = []
    for boundary in range(1, len(words)):
        first, second = " ".join(words[:boundary]), " ".join(words[boundary:])
        if len(first) <= SUBTITLE_WIDTH and len(second) <= SUBTITLE_WIDTH:
            choices.append((abs(len(first) - len(second)), first, second))
    if not choices:
        raise ValueError(f"Subtitle does not fit two lines: {text}")
    _, first, second = min(choices)
    return [first, second]


def local_subtitles(chapter: dict) -> list[dict]:
    cues = []
    previous_end = 0.0
    for subtitle in chapter["subtitles"]:
        start, end = float(subtitle["start"]), float(subtitle["end"])
        if not (previous_end <= start < end <= chapter["duration"]):
            raise ValueError(f"Invalid original subtitle timing: {chapter['id']}: {subtitle}")
        text = " ".join(subtitle["text"].split())
        try:
            pieces = [balanced_lines(text)]
        except ValueError:
            # A long word-wrapped segment becomes several shorter cues; their
            # relative durations follow their text lengths, preserving bounds.
            lines = textwrap.wrap(text, width=78, break_long_words=False, break_on_hyphens=False)
            pieces = [balanced_lines(" ".join(lines[i:i + 2])) for i in range(0, len(lines), 2)]
        weights = [sum(len(line) for line in piece) for piece in pieces]
        total_weight = sum(weights)
        elapsed = 0
        for piece, weight in zip(pieces, weights):
            cue_start = start + (end - start) * elapsed / total_weight
            elapsed += weight
            cue_end = start + (end - start) * elapsed / total_weight
            cues.append({"start": cue_start, "end": cue_end, "lines": piece})
        previous_end = end
    return cues


def ass_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}")


def write_overlay(path: Path, chapter: dict, ordinal: int, total: int, cues: list[dict]) -> None:
    # BorderStyle 3 adds a translucent black rectangle behind the subtitles.
    header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1440
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Title,DejaVu Sans,27,&H00FFFFFF,&H00FFFFFF,&H0012212E,&H0012212E,-1,0,0,0,100,100,0,0,1,0,0,7,28,28,14,1
Style: Number,DejaVu Sans,25,&H0099D9E8,&H0099D9E8,&H0012212E,&H0012212E,0,0,0,0,100,100,0,0,1,0,0,9,28,28,15,1
Style: Subtitle,DejaVu Sans,28,&H00FFFFFF,&H00FFFFFF,&H40000000,&H40000000,0,0,0,0,100,100,0,0,3,8,0,2,75,75,22,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    end = timestamp(chapter["duration"], ass=True)
    events = [
        f"Dialogue: 0,0:00:00.00,{end},Title,,0,0,0,,{ass_escape(chapter['title'])}",
        f"Dialogue: 0,0:00:00.00,{end},Number,,0,0,0,,{ordinal:02} / {total:02}",
    ]
    for cue in cues:
        text = r"\N".join(ass_escape(line) for line in cue["lines"])
        events.append(
            f"Dialogue: 1,{timestamp(cue['start'], ass=True)},{timestamp(cue['end'], ass=True)},Subtitle,,0,0,0,,{text}"
        )
    path.write_text(header + "\n".join(events) + "\n", encoding="utf-8")


def fingerprint(chapter: dict, manifest: dict, recording: Path, audio: Path, arguments: argparse.Namespace) -> str:
    payload = {
        "chapter": chapter,
        "manifest": manifest,
        "recording": [str(recording), recording.stat().st_size, recording.stat().st_mtime_ns],
        "audio": hashlib.sha256(audio.read_bytes()).hexdigest(),
        # Container-only fixes must not invalidate already reviewed image/audio
        # encodings. Hash every rendering function and its explicit constants.
        "render_implementation": hashlib.sha256(
            ("\n".join(inspect.getsource(function) for function in [
                render_clip, write_overlay, local_subtitles, balanced_lines,
                ass_escape, timestamp, duration, probe,
            ]) + AUDIO_FILTER + f"{WIDTH}x{HEIGHT}/{SUBTITLE_WIDTH}").encode()
        ).hexdigest(),
        "fps": arguments.fps,
        "crf": arguments.crf,
        "maxrate": arguments.maxrate,
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()


def validate_streams(media: dict) -> None:
    video = [stream for stream in media["streams"] if stream["codec_type"] == "video"]
    audio = [stream for stream in media["streams"] if stream["codec_type"] == "audio"]
    if len(video) != 1 or len(audio) != 1:
        raise ValueError("Expected exactly one video stream and one audio stream")
    if (video[0]["codec_name"], video[0]["width"], video[0]["height"], video[0]["pix_fmt"]) != ("h264", WIDTH, HEIGHT, "yuv420p"):
        raise ValueError(f"Unexpected video configuration: {video[0]}")
    if (audio[0]["codec_name"], audio[0]["sample_rate"], audio[0]["channels"]) != ("aac", "48000", 1):
        raise ValueError(f"Unexpected audio configuration: {audio[0]}")


def render_clip(chapter: dict, manifest: dict, ordinal: int, total: int, root: Path, arguments: argparse.Namespace) -> dict:
    identifier = chapter["id"]
    recording = Path(manifest["path"]).resolve(strict=True)
    audio = (root / chapter["audio"]).resolve(strict=True)
    raw_duration = duration(recording)
    audio_duration = duration(audio)
    if abs(audio_duration - chapter["duration"]) > 0.01:
        raise ValueError(f"Audio timing changed for {identifier}: {audio_duration} vs {chapter['duration']}")
    active_duration = float(manifest.get("recorded", audio_duration))
    if not math.isfinite(active_duration) or active_duration <= 0:
        active_duration = audio_duration
    # Keep the start of the planned on-screen actions aligned with speech.
    # A slow last interaction may overrun: trim that tail instead of dropping
    # the first gestures. Older manifests fall back to the narration duration.
    leading = max(0.0, raw_duration - active_duration)
    clip = root / "clips" / f"{identifier}.mp4"
    state = clip.with_suffix(".json")
    signature = fingerprint(chapter, manifest, recording, audio, arguments)
    cues = local_subtitles(chapter)
    overlay = root / "overlays" / f"{identifier}.ass"
    write_overlay(overlay, chapter, ordinal, total, cues)
    cached = {}
    if state.exists():
        try:
            cached = json.loads(state.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            pass
    if (
        cached.get("fingerprint") == signature
        and "trim_method" in cached
        and abs(cached.get("trim_leading", -1.0) - leading) < 0.000001
        and clip.exists()
    ):
        validate_streams(probe(clip))
        print(f"REUSE {identifier}: {cached['encoded_duration']:.3f} s", flush=True)
        return {**cached, "cues": cues, "clip": str(clip), "audio": str(audio)}
    print(f"ENCODE {identifier}: {audio_duration:.3f} s; remove {leading:.3f} s preamble", flush=True)
    filtergraph = (
        f"setpts=PTS-STARTPTS,fps={arguments.fps},scale=iw:ih:out_range=tv,"
        f"pad={WIDTH}:{HEIGHT}:0:60:color=0x12212e,setsar=1,"
        f"tpad=stop_mode=clone:stop_duration={audio_duration:.9f},"
        f"ass=overlays/{identifier}.ass,format=yuv420p,setparams=range=limited"
    )
    temporary = clip.with_name(f"{identifier}.encoding.mp4")
    command = [
        "ffmpeg", "-hide_banner", "-y", "-filter_threads", "2",
        "-ss", f"{leading:.9f}", "-i", str(recording), "-i", str(audio),
        "-map", "0:v:0", "-map", "1:a:0", "-vf", filtergraph,
        # Lossy 48 kbit/s AAC can overshoot the PCM true-peak ceiling. The
        # second limiter reserves headroom; latency correction preserves sync.
        "-af", AUDIO_FILTER,
        "-c:v", "libx264", "-preset", "veryfast", "-threads", "3",
        "-crf", str(arguments.crf), "-maxrate", arguments.maxrate, "-bufsize", "1200k",
        "-pix_fmt", "yuv420p", "-color_range", "tv", "-c:a", "aac", "-b:a", "48k", "-ar", "48000", "-ac", "1",
        "-t", f"{audio_duration:.9f}", "-shortest", "-movflags", "+faststart", str(temporary),
    ]
    run(command, cwd=root, log=root / "logs" / f"encode-{identifier}.log")
    media = probe(temporary)
    validate_streams(media)
    encoded_duration = float(media["format"]["duration"])
    if abs(encoded_duration - audio_duration) > 0.12:
        raise ValueError(f"Clip duration mismatch: {identifier}: {encoded_duration} vs {audio_duration}")
    temporary.replace(clip)
    result = {
        "id": identifier, "title": chapter["title"], "fingerprint": signature,
        "source_duration": raw_duration, "trim_leading": leading, "audio_duration": audio_duration,
        "trim_method": "source duration minus recorded active duration" if "recorded" in manifest else "source duration minus audio duration",
        "active_tail_trimmed_seconds": max(0.0, active_duration - audio_duration),
        "encoded_duration": encoded_duration, "bytes": clip.stat().st_size,
        "recorded_active_duration": manifest.get("recorded"),
    }
    state.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {**result, "cues": cues, "clip": str(clip), "audio": str(audio)}


def metadata_escape(text: str) -> str:
    return re.sub(r"([\\=;#])", r"\\\1", text).replace("\n", " ")


def join_narration(results: list[dict], destination: Path) -> float:
    """Join original PCM once; fit only chapter-end silence to encoded timings.

    Reusing AAC packets from every clip would accumulate encoder priming and
    occasionally overlapping DTS. A single final AAC encoding avoids both.
    Frame rounding uses cumulative boundaries, keeping SRT and chapters aligned.
    """
    rate, channels, width = 22050, 1, 2
    cursor = 0.0
    written_frames = 0
    with wave.open(str(destination), "wb") as output:
        output.setnchannels(channels)
        output.setsampwidth(width)
        output.setframerate(rate)
        for result in results:
            cursor += result["encoded_duration"]
            next_boundary = round(cursor * rate)
            desired_frames = next_boundary - written_frames
            with wave.open(result["audio"], "rb") as source:
                if (source.getframerate(), source.getnchannels(), source.getsampwidth(), source.getcomptype()) != (rate, channels, width, "NONE"):
                    raise ValueError(f"Unexpected narration PCM configuration: {result['audio']}")
                available_frames = source.getnframes()
                if abs(desired_frames - available_frames) > math.ceil(0.12 * rate):
                    raise ValueError(f"Narration would need substantial trimming/padding: {result['id']}")
                frames = source.readframes(min(desired_frames, available_frames))
            if len(frames) != min(desired_frames, available_frames) * channels * width:
                raise ValueError(f"Truncated source narration: {result['audio']}")
            if desired_frames > available_frames:
                frames += b"\0" * (desired_frames - available_frames) * channels * width
            output.writeframesraw(frames)
            written_frames = next_boundary
    return written_frames / rate


def assemble(results: list[dict], root: Path, suffix: str) -> dict:
    concat = root / f"concat{suffix}.txt"
    metadata = root / f"chapters{suffix}.ffmetadata"
    subtitles = root / f"subtitles{suffix}.srt"
    chapters_text = root / f"chapitres{suffix}.txt"
    destination = root / f"presentation-professeur{suffix}.mp4"
    narration = root / f"narration-assembled{suffix}.wav"
    lines, chapters, srt, text = [], [], [], []
    cursor = 0.0
    previous_cue_end = 0.0
    for result in results:
        # Filenames are validated alphanumeric IDs under the controlled clips/ path.
        lines.extend([f"file 'clips/{result['id']}.mp4'", f"duration {result['encoded_duration']:.9f}"])
        end = cursor + result["encoded_duration"]
        chapters.extend([
            "[CHAPTER]", "TIMEBASE=1/1000", f"START={round(cursor * 1000)}", f"END={round(end * 1000)}",
            f"title={metadata_escape(result['title'])}",
        ])
        whole_seconds = int(cursor)
        text.append(f"{whole_seconds // 60:02}:{whole_seconds % 60:02} — {result['title']}")
        for cue in result["cues"]:
            start, stop = cursor + cue["start"], min(end, cursor + cue["end"])
            if not (previous_cue_end <= start < stop <= end):
                raise ValueError(f"Invalid cumulative subtitle timing: {result['id']}: {cue}")
            if not (1 <= len(cue["lines"]) <= 2 and all(len(line) <= SUBTITLE_WIDTH for line in cue["lines"])):
                raise ValueError(f"Subtitle exceeds two lines or 85 columns: {cue}")
            srt.append(f"{len(srt) + 1}\n{timestamp(start)} --> {timestamp(stop)}\n" + "\n".join(cue["lines"]))
            previous_cue_end = stop
        cursor = end
    concat.write_text("\n".join(lines) + "\n", encoding="utf-8")
    metadata.write_text(
        ";FFMETADATA1\ntitle=Diffraction Lab 3D — Présentation pour le professeur\n"
        "artist=Diffraction Lab 3D\ncomment=Capture réelle du laboratoire, narration de synthèse française, sous-titres incrustés.\n"
        + "\n".join(chapters) + "\n", encoding="utf-8",
    )
    subtitles.write_text("\n\n".join(srt) + "\n", encoding="utf-8")
    chapters_text.write_text("\n".join(text) + "\n", encoding="utf-8")
    joined_audio_duration = join_narration(results, narration)
    if abs(joined_audio_duration - cursor) > 1 / 22050:
        raise ValueError("Assembled PCM narration is not aligned with clip boundaries")
    temporary = destination.with_suffix(".encoding.mp4")
    run([
        "ffmpeg", "-hide_banner", "-y", "-f", "concat", "-safe", "0", "-i", str(concat),
        "-i", str(narration), "-f", "ffmetadata", "-i", str(metadata),
        "-map", "0:v:0", "-map", "1:a:0", "-map_metadata", "2", "-map_chapters", "2",
        "-c:v", "copy", "-af", AUDIO_FILTER, "-c:a", "aac", "-b:a", "48k", "-ar", "48000", "-ac", "1",
        "-metadata:s:a:0", "language=fra", "-t", f"{cursor:.9f}",
        # MP4 muxers can autoenable a first mov_text track despite disposition=0.
        # Ship the optional SRT beside the video; its visible captions are burned.
        "-movflags", "+faststart", str(temporary),
    ], cwd=root, log=root / "logs" / f"concat{suffix}.log")
    media = probe(temporary)
    validate_streams(media)
    final_duration = float(media["format"]["duration"])
    if abs(final_duration - cursor) > 0.15:
        raise ValueError(f"Final duration mismatch: {final_duration} vs {cursor}")
    if len(media["chapters"]) != len(results):
        raise ValueError("Final file is missing chapter markers")
    subtitle_streams = [stream for stream in media["streams"] if stream["codec_type"] == "subtitle"]
    if subtitle_streams:
        raise ValueError("Unexpected subtitle track could duplicate the burned captions")
    if temporary.stat().st_size > MAXIMUM_BYTES:
        raise ValueError(f"Final MP4 exceeds 50 MB: {temporary.stat().st_size}; lower --maxrate or raise --crf")
    print("VERIFY complete video/audio decode", flush=True)
    run([
        "ffmpeg", "-hide_banner", "-v", "error", "-xerror", "-threads", "2", "-i", str(temporary),
        "-map", "0:v:0", "-map", "0:a:0", "-f", "null", "-",
    ], cwd=root, log=root / "logs" / f"decode{suffix}.log")
    volume = run([
        "ffmpeg", "-hide_banner", "-i", str(temporary), "-map", "0:a:0", "-af", "volumedetect",
        "-f", "null", "-",
    ], cwd=root, log=root / "logs" / f"volume{suffix}.log")
    levels = dict(re.findall(r"(mean_volume|max_volume):\s+(-?[\d.]+) dB", volume))
    if "max_volume" not in levels or float(levels["max_volume"]) >= 0:
        raise ValueError(f"Audio peak is absent or saturated: {levels}")
    temporary.replace(destination)
    report = {
        "path": str(destination), "complete": not suffix, "chapters": len(results),
        "duration_seconds": final_duration, "expected_encoded_duration_seconds": cursor,
        "bytes": destination.stat().st_size, "subtitle_cues": len(srt),
        "sha256": hashlib.sha256(destination.read_bytes()).hexdigest(),
        "subtitle_lines_maximum": 2, "subtitle_columns_maximum": SUBTITLE_WIDTH,
        "video": "H.264 yuv420p 1440x1080", "audio": "AAC mono 48000 Hz 48 kbit/s",
        "audio_volume_db": levels, "full_decode": "passed", "chapter_markers": "passed",
        "audio_normalization": "loudnorm I=-16 TP=-1.5 LRA=7, followed by a 0.63 peak limiter to reserve AAC headroom",
        "subtitles_burned_in": True, "subtitles_selectable": False, "subtitle_sidecar": str(subtitles),
        "subtitle_timing": "Cumulative encoded clip durations; bounded local speech timestamps",
        "audio_encoding": "Original PCM chapters fitted to encoded video boundaries; a single final AAC encode avoids repeated encoder priming",
        "assembled_pcm_duration_seconds": joined_audio_duration,
        "clips": [{key: value for key, value in result.items() if key not in {"cues", "clip", "audio"}} for result in results],
    }
    (root / f"assembly-report{suffix}.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8",
    )
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("/workspace/video-lab"))
    parser.add_argument("--chapters", help="Comma-separated IDs for a clearly named partial preview, e.g. 01,07")
    parser.add_argument("--clips-only", action="store_true", help="Prepare selected cached clips without concatenating a preview")
    parser.add_argument("--fps", type=int, choices=[20, 25], default=20)
    parser.add_argument("--crf", type=int, default=25)
    parser.add_argument("--maxrate", default="600k")
    arguments = parser.parse_args()
    root = arguments.output.resolve(strict=True)
    all_chapters = json.loads((root / "timing.json").read_text(encoding="utf-8"))
    if not all_chapters:
        raise ValueError("No chapters in timing.json")
    wanted = set(arguments.chapters.split(",")) if arguments.chapters else None
    known = {chapter["id"] for chapter in all_chapters}
    if wanted and wanted - known:
        raise ValueError(f"Unknown chapters: {sorted(wanted - known)}")
    selected = [chapter for chapter in all_chapters if not wanted or chapter["id"] in wanted]
    for chapter in selected:
        if not re.fullmatch(r"[a-zA-Z0-9_-]+", chapter["id"]):
            raise ValueError(f"Unsafe chapter ID: {chapter['id']}")
    missing = [chapter["id"] for chapter in selected if not (root / "recordings" / f"{chapter['id']}.json").exists()]
    if missing:
        raise ValueError(f"Recordings are not complete; missing manifests: {', '.join(missing)}")
    manifests = {
        chapter["id"]: json.loads((root / "recordings" / f"{chapter['id']}.json").read_text(encoding="utf-8"))
        for chapter in selected
    }
    # Check every input before any rendering, keeping partial failures reviewable.
    for chapter in selected:
        manifest = manifests[chapter["id"]]
        if manifest.get("errors"):
            raise ValueError(f"Recording has browser errors: {chapter['id']}: {manifest['errors']}")
        Path(manifest["path"]).resolve(strict=True)
        (root / chapter["audio"]).resolve(strict=True)
        local_subtitles(chapter)
    for name in ["clips", "overlays", "logs"]:
        (root / name).mkdir(exist_ok=True)
    results = [
        render_clip(chapter, manifests[chapter["id"]], all_chapters.index(chapter) + 1, len(all_chapters), root, arguments)
        for chapter in selected
    ]
    if arguments.clips_only:
        print(json.dumps({"prepared_clips": [result["id"] for result in results], "complete_video_assembled": False}))
        return
    suffix = "-extrait-" + "-".join(chapter["id"] for chapter in selected) if wanted else ""
    report = assemble(results, root, suffix)
    print(json.dumps({key: value for key, value in report.items() if key != "clips"}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, RuntimeError, subprocess.CalledProcessError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)

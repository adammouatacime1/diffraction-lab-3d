#!/usr/bin/env python3
"""Build natural synthetic French narration without changing video timing.

Requirements: kokoro-onnx, onnxruntime, numpy, soundfile; FFmpeg on PATH.
The work directory contains timing.json, clips/<id>.json, and an existing
narration-assembled.wav reference. Model files come from the official release:
https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.1

Example:
  python scripts/video/build-neural-narration.py \
    --work-dir /path/to/video-build --model-dir /path/to/kokoro-models

This generates synthetic speech; no person was recorded for this narration.
The existing subtitle text and visual chapter durations remain unchanged.
"""
from __future__ import annotations

import argparse
import hashlib
from importlib import metadata
import json
from pathlib import Path
import runpy
import subprocess
import time
import wave


SAMPLE_RATE = 22050
MIN_RATIO = 0.65
MAX_RATIO = 1.5


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--work-dir', required=True, type=Path)
    parser.add_argument('--model-dir', required=True, type=Path)
    parser.add_argument('--output-dir', type=Path)
    parser.add_argument('--speech-script', type=Path,
                        default=Path(__file__).with_name('build-narration.py'))
    parser.add_argument('--voice', default='ff_siwis')
    parser.add_argument('--language', default='fr-fr')
    parser.add_argument('--speed', type=float, default=0.96)
    parser.add_argument('--threads', type=int, default=4)
    arguments = parser.parse_args()

    import numpy as np
    import onnxruntime as ort
    import soundfile as sf
    from kokoro_onnx import Kokoro

    work = arguments.work_dir.resolve()
    model_dir = arguments.model_dir.resolve()
    out = (arguments.output_dir or work / 'neural-narration').resolve()
    out.mkdir(parents=True, exist_ok=True)
    speech_text = runpy.run_path(str(arguments.speech_script.resolve(strict=True)))['speech_text']
    chapters = json.loads((work / 'timing.json').read_text(encoding='utf-8'))
    segment_count = sum(len(chapter['subtitles']) for chapter in chapters)
    with wave.open(str(work / 'narration-assembled.wav'), 'rb') as reference:
        if (reference.getnchannels(), reference.getsampwidth(), reference.getframerate()) != (1, 2, SAMPLE_RATE):
            raise ValueError('Reference WAV must be mono PCM16 at 22,050 Hz')
        final_frames = reference.getnframes()
    model_path = model_dir / 'kokoro-v1.0.onnx'
    voices_path = model_dir / 'voices-v1.0.bin'
    for path in (model_path, voices_path):
        if not path.is_file():
            raise FileNotFoundError(path)
    options = ort.SessionOptions()
    options.intra_op_num_threads = arguments.threads
    options.inter_op_num_threads = 1
    session = ort.InferenceSession(str(model_path), sess_options=options,
                                  providers=['CPUExecutionProvider'])
    engine = Kokoro.from_session(session, str(voices_path))
    versions = {name: metadata.version(name) for name in
                ('kokoro-onnx', 'onnxruntime', 'numpy', 'soundfile', 'phonemizer', 'espeakng-loader')}
    report = {
        'voice': arguments.voice, 'language': arguments.language,
        'synthetic_voice': True,
        'disclosure': 'Voix de synthèse neuronale française; aucun enregistrement humain n’a été réalisé pour cette narration.',
        'engine_license': 'MIT', 'model_license': 'Apache-2.0',
        'official_model_source': 'https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.1',
        'sample_rate': SAMPLE_RATE,
        'package_versions': versions,
        'model_files_sha256': {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
                               for p in (model_path, voices_path)},
        'subtitle_text_modified': False,
        'chapters': [], 'segments': [],
    }
    full = np.zeros(final_frames, dtype=np.int16)
    timeline = 0.0
    started = time.monotonic()

    for chapter_index, chapter in enumerate(chapters):
        chapter_id = chapter['id']
        clip = json.loads((work / 'clips' / f'{chapter_id}.json').read_text())
        encoded_duration = float(clip['encoded_duration'])
        chapter_start = round(timeline * SAMPLE_RATE)
        chapter_end = round((timeline + encoded_duration) * SAMPLE_RATE)
        if chapter_index == len(chapters) - 1:
            chapter_end = final_frames
        buffer = np.zeros(chapter_end - chapter_start, dtype=np.int16)
        for index, subtitle in enumerate(chapter['subtitles']):
            identifier = f'{chapter_id}-{index + 1:02}'
            local_start = round(subtitle['start'] * SAMPLE_RATE)
            local_end = round(subtitle['end'] * SAMPLE_RATE)
            target_frames = local_end - local_start
            target_seconds = target_frames / SAMPLE_RATE
            if not 0 <= local_start < local_end <= len(buffer):
                raise ValueError(f'Invalid subtitle interval {identifier}')
            spoken = speech_text(subtitle['text'])
            speed = arguments.speed
            audio, rate = engine.create(spoken, voice=arguments.voice,
                                        speed=speed, lang=arguments.language)
            ratio = (len(audio) / rate) / target_seconds
            initial_ratio = ratio
            if not MIN_RATIO <= ratio <= MAX_RATIO:
                speed = float(np.clip(arguments.speed * ratio, 0.55, 1.45))
                audio, rate = engine.create(spoken, voice=arguments.voice,
                                            speed=speed, lang=arguments.language)
                ratio = (len(audio) / rate) / target_seconds
            if not MIN_RATIO <= ratio <= MAX_RATIO:
                raise ValueError(f'Time stretch outside {MIN_RATIO}..{MAX_RATIO}: {identifier}={ratio}')
            if len(audio) == 0 or not np.all(np.isfinite(audio)):
                raise ValueError(f'Empty or nonfinite audio {identifier}')
            float_peak = float(np.max(np.abs(audio)))
            gain = 0.98 / float_peak if float_peak >= 0.99 else 1.0
            audio = audio * gain
            if float(np.max(np.abs(audio))) >= 0.99:
                raise ValueError(f'Audio cannot be stored without clipping: {identifier}')
            raw_path = out / f'raw-{identifier}.wav'
            sf.write(raw_path, audio, rate, subtype='PCM_16')
            tail_adjustments = 0
            # FFmpeg atempo has small rounding differences. Increase the tempo
            # slightly if its complete output would exceed the subtitle interval.
            # The complete atempo output is retained; only silence is padded.
            for attempt in range(6):
                if not MIN_RATIO <= ratio <= MAX_RATIO:
                    raise ValueError(f'Adjusted time stretch outside permitted range: {identifier}={ratio}')
                result = subprocess.run([
                    'ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(raw_path),
                    '-af', f'aresample={SAMPLE_RATE},atempo={ratio:.12f}',
                    '-f', 's16le', '-ac', '1', 'pipe:1',
                ], check=True, stdout=subprocess.PIPE)
                fitted = np.frombuffer(result.stdout, dtype='<i2')
                if len(fitted) <= target_frames:
                    break
                ratio *= (len(fitted) / target_frames) * 1.001
                tail_adjustments += 1
            else:
                raise ValueError(f'Cannot preserve speech tail within timing: {identifier}')
            padding = target_frames - len(fitted)
            fitted = np.pad(fitted, (0, padding))
            clipping = int(np.count_nonzero((fitted >= 32767) | (fitted <= -32768)))
            rms = float(np.sqrt(np.mean(fitted.astype(np.float64) ** 2)))
            if clipping or rms <= 10:
                raise ValueError(f'Clipped or silent fitted speech: {identifier}')
            sf.write(out / f'fit-{identifier}.wav', fitted, SAMPLE_RATE, subtype='PCM_16')
            buffer[local_start:local_end] = fitted
            report['segments'].append({
                'id': identifier, 'subtitle_text': subtitle['text'], 'speech_text': spoken,
                'source_seconds': len(audio) / rate, 'target_seconds': target_seconds,
                'ratio': ratio, 'initial_ratio': initial_ratio, 'synthesis_speed': speed,
                'source_peak_float': float_peak, 'applied_gain': gain,
                'peak_pcm16': int(np.max(np.abs(fitted.astype(np.int32)))),
                'rms_pcm16': rms, 'clipped_samples': clipping,
                'padding_samples': padding, 'tail_samples_removed': 0,
                'atempo_rounding_adjustments': tail_adjustments,
                'global_start_seconds': (chapter_start + local_start) / SAMPLE_RATE,
                'global_end_seconds': (chapter_start + local_end) / SAMPLE_RATE,
            })
        sf.write(out / f'aligned-{chapter_id}.wav', buffer, SAMPLE_RATE, subtype='PCM_16')
        full[chapter_start:chapter_end] = buffer
        report['chapters'].append({
            'id': chapter_id, 'title': chapter['title'],
            'start_seconds': chapter_start / SAMPLE_RATE,
            'duration_seconds': len(buffer) / SAMPLE_RATE,
            'segments': len(chapter['subtitles']),
        })
        timeline += encoded_duration
        (out / 'progress.json').write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding='utf-8')
        print(f'{chapter_id}: {len(report["segments"])}/{segment_count} segments; '
              f'{time.monotonic() - started:.1f}s elapsed', flush=True)
    if len(report['segments']) != segment_count:
        raise ValueError('Missing narration segments')
    if int(np.count_nonzero((full >= 32767) | (full <= -32768))):
        raise ValueError('Complete narration contains clipping')
    temp_path = out / 'narration-complete.tmp.wav'
    sf.write(temp_path, full, SAMPLE_RATE, subtype='PCM_16')
    temp_path.replace(out / 'narration-complete.wav')
    report.update({
        'frames': final_frames, 'duration_seconds': final_frames / SAMPLE_RATE,
        'generation_seconds': time.monotonic() - started,
        'min_ratio': min(s['ratio'] for s in report['segments']),
        'max_ratio': max(s['ratio'] for s in report['segments']),
        'total_clipped_samples': 0, 'all_segments_have_signal': True,
        'all_tail_samples_preserved': True,
    })
    (out / 'report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f'Complete: {final_frames / SAMPLE_RATE:.6f}s, {segment_count} segments; synthetic voice.', flush=True)


if __name__ == '__main__':
    main()

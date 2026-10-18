"""Build the game's audio files in public/assets/audio/ from the downloaded source
recordings (see tools/audio/SOURCES.md for where each one comes from and its licence).

Usage:  python build_audio.py <source dir> <kenney Audio dir> <ffmpeg>

The source dir holds the original Wikimedia Commons files under their Commons names
plus the previously bundled recordings. Each output is trimmed, mixed to mono,
normalised and encoded (MP3 for beds and sprite sheets, 16-bit WAV for the short
seamless siren loops, which MP3 padding would break). Sprite sheets place each
sound in an equal slot, starting 50 ms in (the slot lengths match SLOT in src/audio.js).
"""
import os
import subprocess
import sys

import numpy as np

SRC, KEN, FF = sys.argv[1], sys.argv[2], sys.argv[3]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'assets', 'audio')
SR = 44100


def load(name, sr=SR, base=None):
    path = os.path.join(base or SRC, name)
    if not os.path.exists(path):
        print('  (missing, skipped):', name)
        return None
    raw = subprocess.run([FF, '-v', 'error', '-i', path, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def ken(name):
    return load(name, base=KEN)


def seg(x, t0, t1=None, sr=SR):
    return x[int(t0 * sr): None if t1 is None else int(t1 * sr)]


def fade(x, fin=0.005, fout=0.03, sr=SR):
    x = x.copy()
    a, b = int(fin * sr), int(fout * sr)
    if a: x[:a] *= np.linspace(0, 1, a)
    if b: x[-b:] *= np.linspace(1, 0, b)
    return x


def peak(x, db=-1.0):
    return x * (10 ** (db / 20) / (np.abs(x).max() + 1e-9))


def rms_norm(x, db=-20.0, sr=SR):
    # loudness of the active part (80th percentile of 100 ms RMS), so pauses don't skew it
    hop = sr // 10
    n = len(x) // hop
    e = np.sqrt((x[:n * hop].reshape(n, hop) ** 2).mean(1))
    ref = np.percentile(e, 80) + 1e-9
    y = x * (10 ** (db / 20) / ref)
    # soft-clip any remaining peaks instead of hard clipping
    return np.tanh(y * 1.1) / np.tanh(1.1) if np.abs(y).max() > 0.98 else y


def trim_lead(x, thr_db=-40, sr=SR):
    thr = 10 ** (thr_db / 20) * np.abs(x).max()
    i = int(np.argmax(np.abs(x) > thr))
    return x[max(0, i - int(0.003 * sr)):]


def xfade_concat(parts, xf=1.0, sr=SR):
    out = parts[0]
    n = int(xf * sr)
    for p in parts[1:]:
        r = np.linspace(0, 1, n)
        mid = out[-n:] * np.sqrt(1 - r) + p[:n] * np.sqrt(r)
        out = np.concatenate([out[:-n], mid, p[n:]])
    return out


def sprite(clips, slot, lead=0.05, sr=SR, db=-1.0):
    clips = [c for c in clips if c is not None]
    out = np.zeros(int(len(clips) * slot * sr), dtype=np.float32)
    room = int((slot - lead - 0.02) * sr)
    for k, c in enumerate(clips):
        c = trim_lead(c)[:room]
        c = peak(fade(c, 0.002, min(0.08, len(c) / sr / 4)), db)
        i = int((k * slot + lead) * sr)
        out[i:i + len(c)] = c
    return out, len(clips)


def loop_cycles(x, period, cycles, sr=SR):
    """A seamless loop of whole siren cycles, starting at a low-to-high tone change."""
    # pitch per 5 ms from zero crossings, find the first upward tone change
    hop = int(0.005 * sr)
    zc = np.array([np.sum(np.abs(np.diff(np.sign(x[i:i + hop * 4]))) > 0) for i in range(0, len(x) - hop * 4, hop)])
    mid = (zc.max() + zc.min()) / 2
    up = np.where((zc[:-1] < mid) & (zc[1:] >= mid))[0]
    i0 = int(up[0] * hop) + int(0.25 * period * sr) if len(up) else 0
    n = int(round(period * cycles * sr))
    y = x[i0:i0 + n].copy()
    # tiny crossfade over the seam with the samples just after it
    k = int(0.012 * sr)
    tail = x[i0 + n:i0 + n + k]
    r = np.linspace(0, 1, len(tail))
    y[:len(tail)] = y[:len(tail)] * r + tail * (1 - r)
    return y


def enc(x, name, sr=SR, q=4):
    path = os.path.join(OUT, name)
    x = np.clip(x, -1, 1).astype(np.float32)
    if name.endswith('.wav'):
        args = ['-c:a', 'pcm_s16le', '-ar', '22050']
    else:
        args = ['-c:a', 'libmp3lame', '-q:a', str(q), '-ar', str(sr)]
    subprocess.run([FF, '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-'] + args + [path],
                   input=x.tobytes(), check=True)
    print('  %-24s %6.1f s %7.0f kB' % (name, len(x) / SR, os.path.getsize(path) / 1024))


def onsets(x, thr_db=-30, gap=0.25, sr=SR):
    hop = int(0.01 * sr)
    n = len(x) // hop
    e = 20 * np.log10(np.sqrt((x[:n * hop].reshape(n, hop) ** 2).mean(1)) + 1e-9)
    out, last = [], -9
    for i in range(1, n):
        t = i * 0.01
        if e[i] > thr_db and e[i] - e[i - 1] > 6 and t - last > gap:
            out.append(t); last = t
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    print('beds')
    # crowds
    x = load('crowd_large.wav'); enc(rms_norm(x, -20), 'crowd_large.mp3', q=5)
    x = load('211146 unfa another-crowd.flac'); enc(rms_norm(fade(seg(x, 8, 40), 0.5, 0.5), -20), 'crowd_murmur.mp3', q=5)
    x = load('People chanting and blowing whistles during the 2007–2009 university protests in France - 20071211.oga')
    enc(rms_norm(fade(seg(x, 50, 96), 0.3, 0.3), -19), 'chant_protest.mp3', q=5)
    x = load('WWS FootballAustriavs.Sweden.ogg')
    if x is not None: enc(rms_norm(fade(seg(x, 47, 92), 0.3, 0.3), -19), 'chant_stadium.mp3', q=5)
    x = load('Street parade carnival people yelling kamelle kamelle.ogg')
    if x is not None: enc(rms_norm(fade(seg(x, 0, 35), 0.3, 0.3), -19), 'crowd_yelling.mp3', q=5)
    # street and city
    a, b = load('Sunday in the city street noise1.ogg'), load('Sunday in the city street noise3.ogg')
    parts = [rms_norm(seg(a, 0, 22), -22), rms_norm(seg(b, 40, 62), -22)] if a is not None and b is not None else []
    if parts: enc(xfade_concat(parts), 'street_city.mp3', q=5)
    a, b = load('fireworks_far1.ogg'), load('fireworks_far3.ogg')
    enc(rms_norm(xfade_concat([seg(a, 0, 20), seg(b, 0, 14)]), -24), 'fireworks_far.mp3', q=5)
    x = load('fireworks_street.ogg'); enc(peak(seg(x, 0, 36), -1), 'fireworks_street.mp3', q=4)
    x = load('Helicopter over quiet neighbourhood.ogg'); enc(rms_norm(seg(x, 3, 15), -20), 'helicopter.mp3', q=5)
    parts = [rms_norm(seg(load('Dry grass burning in open fireplace.ogg'), 0.5, 18.5), -22)]
    b = load('WWS Bonfireburning.ogg')
    if b is not None: parts.append(rms_norm(seg(b, 1, 21), -22))
    enc(xfade_concat(parts, 1.5) if len(parts) > 1 else parts[0], 'fire_loop.mp3', q=5)
    x = load('Llamada a oración Mezquita Hassan II.wav'); enc(rms_norm(fade(seg(x, 2.0, 57), 1.0, 4.0), -20), 'adhan.mp3', q=5)

    print('sirens (seamless loops)')
    enc(loop_cycles(load('Deux-Tons-Police-France.ogg'), 1.0, 4) * 0.8, 'siren_police.wav')
    enc(loop_cycles(load('Deux-tons-Gendarmerie-France.ogg'), 1.0, 4) * 0.8, 'siren_gendarmerie.wav')
    enc(loop_cycles(load('siren_twotone.ogg'), 2.0, 2) * 0.8, 'siren_pompiers.wav')

    print('sprite sheets')
    w = load('whistle.ogg')
    ref = load('218318 splicesound referee-whistle-blow-gymnasium.wav')
    clips = [seg(w, 0.45, 1.85), seg(w, 1.85, 3.25), seg(w, 3.25), seg(ref, 0.05, 2.9)]
    s, n = sprite(clips, 3.0, db=-2); enc(s, 'whistles.mp3'); print('    whistle slots', n)
    clips = [load('glass.wav')] + [load('Glass breaking %d (Gravity Sound).wav' % k) for k in (2, 3, 4)]
    s, n = sprite(clips, 2.5); enc(s, 'glass.mp3'); print('    glass slots', n)
    e10, e1, e2, e5 = load('Explosion 10.ogg'), load('Explosion-LS100155.ogg'), load('Explosions-LS100152.ogg'), load('Explosions-LS100155.ogg')
    clips = [seg(e10, 0.05, 2.65), seg(e1, 0.55), seg(e2, 0.55, 1.9), seg(e2, 2.68, 3.65), seg(e5, 1.15, 2.3), seg(e5, 4.05, 4.9), seg(e5, 4.9, 6.3)]
    s, n = sprite(clips, 3.0); enc(s, 'explosions.mp3', q=3); print('    boom slots', n)
    clips = [ken('impactPunch_heavy_%03d.ogg' % k) for k in range(5)] + [ken('impactPunch_medium_%03d.ogg' % k) for k in range(5)]
    clips += [load(n) for n in ('Hard Punch Flesh (Gravity Sound).mp3', 'Hard Punch Gut (Gravity Sound).mp3', 'Punch Flesh (Gravity Sound).mp3', 'Punch Gut (Gravity Sound).mp3')]
    s, n = sprite(clips, 0.6, db=-2); enc(s, 'impact_body.mp3'); print('    punch slots', n)
    clips = [ken('impactPlate_heavy_%03d.ogg' % k) for k in range(5)] + [ken('impactPlate_medium_%03d.ogg' % k) for k in range(5)]
    s, n = sprite(clips, 0.8, db=-2); enc(s, 'impact_shield.mp3'); print('    shield slots', n)
    clang = load('Metal Clanging Noises.ogg')
    picks = [t for t in onsets(clang)][:10]
    clips = [ken('impactMetal_heavy_%03d.ogg' % k) for k in range(5)] + [ken('impactMetal_medium_%03d.ogg' % k) for k in range(3)]
    clips += [seg(clang, t - 0.01, t + 1.0) for t in picks]
    s, n = sprite(clips, 1.2, db=-2); enc(s, 'impact_metal.mp3'); print('    metal slots', n)
    clips = [ken('impactMining_%03d.ogg' % k) for k in range(5)] + [ken('impactGeneric_light_%03d.ogg' % k) for k in range(5)]
    s, n = sprite(clips, 0.6, db=-3); enc(s, 'impact_stone.mp3'); print('    stone slots', n)
    clips = [ken('footstep_concrete_%03d.ogg' % k) for k in range(5)]
    s, n = sprite(clips, 0.4, db=-3); enc(s, 'footsteps.mp3'); print('    step slots', n)
    g = load('Male pain grunts.ogg')
    clips = [seg(g, t - 0.03, t + 1.0) for t in (0.54, 4.0, 7.06, 8.45, 12.92, 13.84, 19.36, 22.59, 23.94)]
    s, n = sprite(clips, 1.2, db=-2); enc(s, 'grunts.mp3'); print('    grunt slots', n)


main()

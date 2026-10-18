"""Render the crowd's French shouts, chants and mob walla with Piper TTS.

Usage (in a venv with `pip install piper-tts numpy`):
    python render.py <path/to/fr_FR-mls-medium.onnx> <out dir>

Writes 22.05 kHz mono WAVs plus manifest.json, read by src/audio.js
(Audio.loadVoices). Voice model: rhasspy/piper-voices fr_FR-mls-medium
(CC BY 4.0, trained on Multilingual LibriSpeech), which has many speakers, so
every shout and every chant voice can come from a different person.
"""
import json, os, sys, wave
import numpy as np
from piper import PiperVoice, SynthesisConfig

SR = 22050
rng = np.random.default_rng(7)

SHOUTS = [
    "Va te faire foutre, la police !", "Va te faire foutre !", "Putain de flics !", "Nique la police !",
    "Bande d'enculés !", "Fils de pute !", "Enfoirés !", "Connards !", "Salauds !", "Ta gueule !",
    "Casse-toi !", "Cassez-vous !", "Dégagez !", "Bordel de merde !", "Assassins !", "Merde !",
    "Libérez la Palestine !", "La France va en enfer !", "Tout le monde déteste la police !",
    "Police partout, justice nulle part !", "On lâche rien !", "Allez, vas-y, vas-y !", "Révolution !",
    "Allez, on y va !", "Lâchez-le !", "Bande de lâches !",
]
CHANTS = [
    "Libérez, la Palestine !", "Va te faire foutre, la police !", "La France, va en enfer !",
    "Tout le monde, déteste, la police !", "Police partout, justice nulle part !", "On lâche rien !",
    "Assassins ! Assassins !",
]


def _rms(a, w=551):
    return np.sqrt(np.convolve(a ** 2, np.ones(w) / w, "same"))


def synth(voice, text, speaker, length=0.58):
    # the model reads like an audiobook; low duration noise and a short length scale make it brisk
    cfg = SynthesisConfig(speaker_id=speaker, length_scale=length, noise_scale=0.5, noise_w_scale=0.35)
    a = np.concatenate([c.audio_float_array for c in voice.synthesize(text, cfg)]).astype(np.float32)
    loud = _rms(a) > 0.1 * _rms(a).max()
    on = np.nonzero(loud)[0]
    if not len(on):
        return a
    a, loud = a[max(0, on[0] - 300): on[-1] + 900], loud[max(0, on[0] - 300): on[-1] + 900]
    # squeeze pauses inside the phrase down to ~60 ms: people yelling don't pause like a narrator
    keep = np.ones(len(a), bool); run = 0; gap = int(0.06 * SR)
    for i, l in enumerate(loud):
        run = 0 if l else run + 1
        if run > gap: keep[i] = False
    return a[keep]


def brisk_speakers(voice, n_spk):
    """Speakers who say a test phrase quickly (some read very slowly, a few produce broken output)."""
    out = []
    for spk in range(n_spk):
        a = synth(voice, "Va te faire foutre la police !", spk)
        d = len(a) / SR
        if 1.0 < d < 2.1:
            out.append(spk)
    return out


def repitch(a, k):
    """Resample by factor k (k > 1 = higher and faster, like a raised voice)."""
    n = int(len(a) / k)
    return np.interp(np.arange(n) * k, np.arange(len(a)), a).astype(np.float32)


def onepole_lp(a, cut):
    x = np.exp(-2 * np.pi * cut / SR)
    out = np.empty_like(a); y = 0.0
    for i, v in enumerate(a):
        y = (1 - x) * v + x * y; out[i] = y
    return out


def shoutify(a):
    """Shouted delivery: brighter, compressed and slightly torn."""
    a = a / (np.max(np.abs(a)) + 1e-6)
    bright = np.append(a[0], a[1:] - 0.85 * a[:-1])           # pre-emphasis
    a = 0.55 * a + 0.75 * bright
    a = np.tanh(a * 3.2) / np.tanh(3.2)                         # saturation / rasp
    return a.astype(np.float32)


def reverb(a, secs, wet):
    n = int(secs * SR)
    ir = rng.standard_normal(n).astype(np.float32) * np.exp(-np.linspace(0, 7, n)).astype(np.float32)
    ir = onepole_lp(ir, 3500); ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    m = len(a) + n - 1
    size = 1 << (m - 1).bit_length()
    wetsig = np.fft.irfft(np.fft.rfft(a, size) * np.fft.rfft(ir, size), size)[:m]
    out = np.zeros(m, np.float32); out[:len(a)] += a * (1 - wet); out += wetsig.astype(np.float32) * wet
    return out


def save(path, a, peak=0.89):
    a = a / (np.max(np.abs(a)) + 1e-9) * peak
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((a * 32767).astype("<i2").tobytes())


def main(model, out):
    os.makedirs(out, exist_ok=True)
    voice = PiperVoice.load(model)
    pool = brisk_speakers(voice, voice.config.num_speakers)
    print(len(pool), "brisk speakers")
    speakers = rng.permutation(pool); n_spk = len(pool)
    man = {"shouts": [], "chants": [], "mob": "mob.wav"}
    raw_shouts = []
    # individual shouts, each by a different speaker
    for i, text in enumerate(SHOUTS):
        spk = int(speakers[i % n_spk])
        a = repitch(synth(voice, text, spk, length=rng.uniform(0.52, 0.62)), rng.uniform(1.06, 1.2))
        a = shoutify(a)
        raw_shouts.append(a)
        f = f"shout_{i:02d}.wav"
        save(os.path.join(out, f), reverb(a, 0.6, 0.18))
        man["shouts"].append({"file": f, "text": text})
        print("shout", i, text)
    # chants: the same line from 18 speakers, roughly in time, pre-mixed
    for i, text in enumerate(CHANTS):
        parts = []
        for k in range(18):
            spk = int(speakers[(len(SHOUTS) + i * 18 + k) % n_spk])
            parts.append(shoutify(repitch(synth(voice, text, spk, length=0.7), rng.uniform(1.0, 1.15))))
        L = int(np.median([len(p) for p in parts]))
        mix = np.zeros(L + SR, np.float32)
        for p in parts:
            p = repitch(p, len(p) / L)                              # stretch every voice to the same length so the words line up
            o = int(rng.uniform(0, 0.07) * SR)
            g = rng.uniform(0.4, 1.0)
            mix[o:o + len(p)] += p[: len(mix) - o] * g
        f = f"chant_{i:02d}.wav"
        save(os.path.join(out, f), reverb(onepole_lp(mix, 3800), 1.4, 0.38))
        man["chants"].append({"file": f, "text": text})
        print("chant", i, text)
    # mob walla: a seamless 24 s loop of overlapping curses at different distances
    dur = 24 * SR
    mob = np.zeros(dur, np.float32)
    for _ in range(170):
        a = raw_shouts[rng.integers(len(raw_shouts))]
        a = repitch(a, rng.uniform(0.9, 1.12))
        dist = rng.uniform(0, 1)
        a = onepole_lp(a, 3200 - dist * 2400) * (0.9 - dist * 0.7)
        o = int(rng.integers(dur))
        idx = (o + np.arange(len(a))) % dur                         # wrap around for a seamless loop
        np.add.at(mob, idx, a)
    rv = reverb(mob, 1.8, 0.45)
    loop = rv[:dur].copy(); loop[: len(rv) - dur] += rv[dur:]     # fold the reverb tail back into the start
    save(os.path.join(out, "mob.wav"), loop, peak=0.8)
    with open(os.path.join(out, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump(man, fh, ensure_ascii=False, indent=1)
    print("done", n_spk, "speakers used")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])

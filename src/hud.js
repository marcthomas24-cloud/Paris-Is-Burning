// DOM HUD: objective panel, compass, minimap, bars, alerts, prompts, feedback.
import * as THREE from 'three';
import { LAYOUT } from './world.js';

const $ = (id) => document.getElementById(id);

export class HUD {
  constructor(game) {
    this.game = game;
    this.el = $('hud');
    this.alerts = $('alerts');
    this.map = $('minimap').getContext('2d');
    this.promptEl = $('prompt');
    this.promptSet = false;
    this.alertKeys = new Map();
    this.flash = 0;
    this.lastScore = -1;
    this.mapT = 0;
    // compass strip labels
    const strip = $('compass-strip');
    this.compassItems = [];
    const names = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
    for (let d = 0; d < 360; d += 15) {
      const s = document.createElement('span');
      s.textContent = names[d] || '·';
      if (names[d] && names[d].length === 1) s.className = 'card';
      strip.appendChild(s);
      this.compassItems.push({ el: s, d });
    }
  }

  show(on) { this.el.classList.toggle('hidden', !on); }

  alert(text, kind = 'info', dur = 2.5, key = null) {
    if (key) {
      const last = this.alertKeys.get(key);
      if (last && performance.now() - last < 900) return;
      this.alertKeys.set(key, performance.now());
    }
    const d = document.createElement('div');
    d.className = 'alert ' + kind;
    d.textContent = text;
    this.alerts.appendChild(d);
    while (this.alerts.children.length > 4) this.alerts.firstChild.remove();
    setTimeout(() => d.classList.add('fade'), dur * 1000);
    setTimeout(() => d.remove(), dur * 1000 + 600);
  }

  clearAlerts() { this.alerts.innerHTML = ''; }

  scorePop(v, reason) {
    const el = $('score-pop');
    el.textContent = `${v > 0 ? '+' : ''}${v} ${reason || ''}`;
    el.className = v >= 0 ? 'pos' : 'neg';
    void el.offsetWidth;
    el.classList.add('show');
  }

  prompt(key, text) {
    this.promptEl.innerHTML = `<b>${key}</b>${text}`;
    this.promptEl.classList.remove('hidden');
    this.promptSet = true;
  }

  damageFlash(k) { this.flash = Math.min(1, this.flash + k); }

  hitMarker() {
    const c = $('crosshair');
    c.classList.add('hit');
    clearTimeout(this._hm);
    this._hm = setTimeout(() => c.classList.remove('hit'), 160);
  }

  update(dt) {
    const g = this.game, p = g.player, m = g.missions;
    // prompt is re-asserted every frame by whoever needs it
    if (!this.promptSet) this.promptEl.classList.add('hidden');
    this.promptSet = false;

    if (m.score !== this.lastScore) { $('score').textContent = m.score.toLocaleString('fr-FR'); this.lastScore = m.score; }
    const hb = $('health-bar').firstElementChild;
    hb.style.width = p.health + '%';
    hb.style.background = p.health < 30 ? 'var(--red)' : p.health < 60 ? 'var(--amber)' : 'var(--green)';
    $('stamina-bar').firstElementChild.style.width = p.stamina + '%';
    const mk = $('medkits');
    if (mk.dataset.n !== String(p.medkits)) { mk.dataset.n = p.medkits; mk.textContent = '✚ ' + p.medkits; mk.classList.toggle('empty', !p.medkits); }
    mk.classList.toggle('healing', p.healT > 0);
    const gn = $('gasnades'), gas = p.gear.gas;
    if (gn.dataset.n !== String(gas)) { gn.dataset.n = gas; gn.textContent = 'GAS ' + gas; gn.classList.toggle('empty', !gas); }

    // objective panel
    const info = m.hudInfo();
    $('objective-text').textContent = info.text;
    const chip = document.querySelector('#incident-status .chip');
    chip.textContent = info.chip;
    chip.className = 'chip ' + ({ calm: 'calm', active: '', danger: 'danger', done: 'done' }[info.status] || '');
    $('incident-detail').textContent = info.detail;
    // phase count comes from the level (3 in Level 1, 5 in Level 2)
    const np = info.completed.length;
    $('mission-progress').textContent = `${Math.min(np, info.index + 1)} / ${np}`;
    const pn = `PHASE ${info.index + 1} · ${info.phaseName}`;
    if (this._pn !== pn) { this._pn = pn; $('phase-name').textContent = pn; }
    const pipBox = $('progress-pips');
    if (pipBox.children.length !== np) pipBox.innerHTML = '<span></span>'.repeat(np);
    const pips = pipBox.children;
    for (let i = 0; i < np; i++) pips[i].className = info.completed[i] ? 'done' : i === info.index ? 'active' : '';
    const bar = $('incident-bar');
    bar.style.visibility = info.bar === null ? 'hidden' : 'visible';
    if (info.bar !== null) { bar.firstElementChild.style.width = info.bar * 100 + '%'; bar.firstElementChild.style.background = info.bar < 0.3 ? 'var(--red)' : 'var(--accent)'; }

    $('threat-warning').classList.toggle('hidden', !m.warning);

    // boss bar: name, health with phase marks, and when the guard is down
    const bi = m.bossInfo ? m.bossInfo() : null;
    $('boss-bar').classList.toggle('hidden', !bi);
    if (bi) {
      const key = bi.name + bi.max + bi.phases;
      if (this._bossKey !== key) {
        this._bossKey = key;
        $('boss-name').textContent = bi.name; $('boss-sub').textContent = bi.sub;
        const hp = $('boss-hp'); hp.querySelectorAll('.tick').forEach((e) => e.remove());
        for (const f of bi.marks) { const tk = document.createElement('span'); tk.className = 'tick'; tk.style.left = (f * 100) + '%'; hp.appendChild(tk); }
      }
      const w = (bi.hp / bi.max) * 100 + '%';
      const fill = $('boss-hp').querySelector('.fill'), chip = $('boss-hp').querySelector('.chip');
      if (fill.style.width !== w) { fill.style.width = w; chip.style.width = w; } // the chip lags behind (CSS transition delay)
      const st = $('boss-state');
      const txt = bi.state === 'defeated' ? 'DOWN — ARREST HIM' : bi.state === 'transition' ? `PHASE ${bi.phase + 1}` : bi.open ? 'OPENING' : '';
      if (st.textContent !== txt) { st.textContent = txt; st.className = bi.open || bi.state === 'defeated' ? 'open' : bi.state === 'transition' ? 'phase' : ''; }
    }

    // damage vignette
    this.flash = Math.max(0, this.flash - dt * 1.5);
    const low = p.health < 35 ? (0.35 + Math.sin(g.time * 5) * 0.1) * (1 - p.health / 35) : 0;
    $('vignette').style.opacity = Math.max(this.flash, low).toFixed(3);

    this._compass(info);
    this._offscreen();
    this.mapT += dt;
    if (this.mapT > 1 / 20) { this.mapT = 0; this._minimap(); }
  }

  _camBearing() {
    // camera forward = (-sin yaw, -cos yaw); north = -z
    const yaw = this.game.cameraRig.yaw;
    return ((-yaw * 180) / Math.PI % 360 + 360) % 360;
  }

  _compass() {
    const cb = this._camBearing();
    const W = 420, ppd = W / 160;
    for (const it of this.compassItems) {
      let d = it.d - cb; d = ((d + 540) % 360) - 180;
      it.el.style.left = W / 2 + d * ppd + 'px';
      it.el.style.display = Math.abs(d) > 85 ? 'none' : '';
    }
    const mk = $('compass-marker');
    const mp = this.game.missions.markerPos;
    if (mp) {
      const p = this.game.player.pos;
      const b = (Math.atan2(mp.x - p.x, -(mp.z - p.z)) * 180) / Math.PI;
      let d = b - cb; d = ((d + 540) % 360) - 180;
      mk.style.display = '';
      mk.style.left = W / 2 + Math.max(-75, Math.min(75, d)) * ppd + 'px';
    } else mk.style.display = 'none';
  }

  _offscreen() {
    const arrow = $('offscreen-arrow');
    const mp = this.game.missions.markerPos;
    if (!mp) { arrow.style.opacity = 0; return; }
    const cam = this.game.camera;
    const v = new THREE.Vector3(mp.x, 1.5, mp.z).project(cam);
    const behind = v.z > 1;
    const onScreen = !behind && Math.abs(v.x) < 0.92 && Math.abs(v.y) < 0.9;
    if (onScreen) { arrow.style.opacity = 0; return; }
    let x = v.x, y = v.y;
    if (behind) { x = -x; y = -Math.abs(y) - 0.5; }
    const a = Math.atan2(y, x);
    const W = innerWidth, H = innerHeight;
    const r = Math.min(W, H) * 0.42;
    const px = W / 2 + Math.cos(a) * r, py = H / 2 - Math.sin(a) * r;
    arrow.style.opacity = 0.9;
    arrow.style.left = px - 10 + 'px';
    arrow.style.top = py - 9 + 'px';
    arrow.style.transform = `rotate(${-a + Math.PI / 2}rad)`;
  }

  _minimap() {
    const ctx = this.map, g = this.game, p = g.player.pos, w = g.world;
    const S = 200, C = 100, scale = 1.35;
    const yaw = g.cameraRig.yaw;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const tr = (x, z) => { const dx = x - p.x, dz = z - p.z; return [C + (dx * rx + dz * rz) * scale, C - (dx * fx + dz * fz) * scale]; };
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.beginPath(); ctx.arc(C, C, C - 2, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = 'rgba(22,24,28,0.92)'; ctx.fillRect(0, 0, S, S);
    const poly = (x0, z0, x1, z1, style) => {
      ctx.fillStyle = style; ctx.beginPath();
      const a = tr(x0, z0), b = tr(x1, z0), c = tr(x1, z1), d = tr(x0, z1);
      ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c); ctx.lineTo(...d); ctx.closePath(); ctx.fill();
    };
    for (const r of w.roads) poly(r.x0, r.z0, r.x1, r.z1, 'rgba(120,120,118,0.55)');
    for (const b of w.blocks) poly(b.x0, b.z0, b.x1, b.z1, 'rgba(58,56,52,0.95)');
    // NPCs
    const crowd = g.crowd;
    for (const n of crowd.npcs) {
      if (n.state === 'gone') continue;
      const [x, y] = tr(n.pos.x, n.pos.z);
      if (x < -5 || x > S + 5 || y < -5 || y > S + 5) continue;
      const threat = crowd.isThreat(n) || (n.script && n.script.marked);
      ctx.fillStyle = threat ? '#ff3b3b' : n.arrested ? '#e9e6df' : n.state === 'flee' ? 'rgba(255,200,120,0.75)' : 'rgba(190,186,176,0.6)';
      const r = threat ? 3.6 : 2;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#3d7bff';
    for (const c of crowd.police) { const [x, y] = tr(c.pos.x, c.pos.z); ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill(); }
    // objective
    const mp = g.missions.markerPos;
    if (mp) {
      let [x, y] = tr(mp.x, mp.z);
      const dx = x - C, dy = y - C, d = Math.hypot(dx, dy);
      if (d > C - 10) { x = C + (dx / d) * (C - 10); y = C + (dy / d) * (C - 10); }
      ctx.fillStyle = '#ffb02e';
      ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 7); ctx.lineTo(x - 6, y); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // player arrow (map is camera-up, so rotate by player heading relative to camera)
    const ph = g.player.heading;
    const pf = [Math.sin(ph), Math.cos(ph)];
    const ax = pf[0] * rx + pf[1] * rz, ay = -(pf[0] * fx + pf[1] * fz);
    const ang = Math.atan2(ay, ax);
    ctx.save(); ctx.translate(C, C); ctx.rotate(ang + Math.PI / 2);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 6); ctx.lineTo(0, 3); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
    // north indicator
    const nx = C - rz * (C - 12), ny = C + fz * (C - 12); // world north (0,-1) in map space
    ctx.fillStyle = '#e9e6df'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('N', nx, ny);
  }

  showEnd(win, reason, m) {
    if (m.endInfo) return this._showEndInfo(win, m.endInfo(win, reason));
    $('end-title').textContent = win ? 'MISSION COMPLETE' : 'MISSION FAILED';
    $('end-title').style.color = win ? 'var(--text)' : 'var(--red)';
    $('end-sub').textContent = win ? `Line held · ${m.stats.bombsStopped ? 'petrol bomb stopped' : 'bomber dealt with'} · officers extracted from Rue Oberkampf` : reason || '';
    const s = m.stats;
    const rank = m.score >= 4500 && s.peaceful === 0 ? 'COMMENDATION' : m.score >= 3000 ? 'PROFESSIONAL' : m.score >= 1500 ? 'ADEQUATE' : 'UNDER REVIEW';
    $('end-stats').innerHTML = `
      <div class="row"><span>Aggressors neutralised</span><span>${s.neutralized}</span></div>
      <div class="row"><span>Arrests</span><span>${s.arrests}</span></div>
      <div class="row"><span>Petrol bombs prevented</span><span>${s.bombsStopped} / ${s.bombsStopped + s.bombsThrown}</span></div>
      <div class="row"><span>Peaceful demonstrators struck</span><span style="color:${s.peaceful ? 'var(--red)' : 'inherit'}">${s.peaceful}</span></div>
      <div class="row"><span>Downed suspects struck</span><span style="color:${s.downed ? 'var(--red)' : 'inherit'}">${s.downed}</span></div>
      <div class="row"><span>Phases completed</span><span>${m.completed.filter(Boolean).length} / 3</span></div>
      <div class="row"><span>Mission time</span><span>${Math.floor(m.t / 60)}:${String(Math.floor(m.t % 60)).padStart(2, '0')}</span></div>
      <div class="row total"><span>SCORE</span><span>${m.score.toLocaleString('fr-FR')}</span></div>
      <div class="rank">${win ? 'RATING · ' + rank : 'Restart to try again'}</div>`;
  }

  // Non-blocking title card (level start): fades in and out over `dur` seconds.
  titleCard(title, sub, dur = 3.5) {
    const el = $('title-card');
    el.querySelector('.tc-title').textContent = title; el.querySelector('.tc-sub').textContent = sub;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(this._tcT); this._tcT = setTimeout(() => el.classList.remove('show'), dur * 1000);
  }

  // Big centred banner (boss phase changes).
  banner(title, sub = '', dur = 1.8) {
    const el = $('banner');
    el.querySelector('.bn-title').textContent = title; el.querySelector('.bn-sub').textContent = sub;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(this._bnT); this._bnT = setTimeout(() => el.classList.remove('show'), dur * 1000);
  }

  // end screen described by the level's own mission script (Level 2 onwards)
  _showEndInfo(win, e) {
    const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    $('end-title').textContent = e.title;
    $('end-title').style.color = win ? 'var(--text)' : 'var(--red)';
    $('end-sub').textContent = e.sub;
    $('end-stats').innerHTML = e.rows.map(([k, v]) => `<div class="row"><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join('')
      + `<div class="row total"><span>SCORE</span><span>${this.game.missions.score.toLocaleString('fr-FR')}</span></div>`
      + `<div class="rank">${esc(e.rank)}</div>`
      + (e.hook ? `<div class="hook">${esc(e.hook)}</div>` : '');
  }
}

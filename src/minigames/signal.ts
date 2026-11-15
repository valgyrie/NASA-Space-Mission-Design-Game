import { audio } from '../audio/sound';
import { t, type StringKey } from '../strings';
import { button, canvas2d, el } from '../ui/miniGame';
import { fixed, makeKit, typing } from './directorKit';
import {
  DISTANCE_KM,
  DOWNLINK_MHZ,
  FAST_H_S,
  INSTRUMENTS,
  LINE_FREEZE_C,
  LOADS,
  LOAD_W,
  LOCK_S,
  LOCK_WINDOW_KHZ,
  type Load,
  MIN_ELEVATION,
  ONE_WAY_H,
  PROBE_DEC,
  RATE_H_S,
  RESERVE_WH,
  ROUND_TRIP_H,
  RTG_W,
  STAR_RESERVE,
  STATIONS,
  STATION_SITE,
  STEPS,
  type SignalEvent,
  type Station,
  TUNE_RANGE_KHZ,
  assignStation,
  busV,
  canFastForward,
  carrierDbm,
  carrierNow,
  checkGround,
  confirmContact,
  cn0,
  elevation,
  fastNow,
  hourAngle,
  inView,
  loadW,
  marginW,
  newSignalGame,
  nextWindow,
  pointingDeg,
  returnInH,
  shout,
  signalStars,
  spaceLossDb,
  stepName,
  stepSignal,
  toggleLoad,
  tune,
  windowLeftH,
} from './signalModel';
import type { Minigame, MinigameMaker } from './types';

/**
 * Lost Signal on screen: a deep-space operations console. Left, the loss-of-signal checklist with the current
 * step's actions; middle, telemetry readouts and the receiver's spectrum, where the faint carrier hides; right,
 * the Deep Space Network clock and the probe's power. Keys: 1–3 the step's actions, ← → tune (Shift: big
 * steps), F fast-forward, Q W E R T Y U switch loads.
 */

const LOAD_KEYS = ['q', 'w', 'e', 'r', 't', 'y', 'u'];
const SPAN_KHZ = 6;
const BINS = 160;

const hm = (h: number) => {
  const total = Math.max(0, Math.round(h * 60));
  return t('minigame.signal.hm', { h: Math.floor(total / 60), m: String(total % 60).padStart(2, '0') });
};

export const makeSignal: MinigameMaker = (): Minigame => {
  let dispose: (() => void) | null = null;
  return {
    start(host, done) {
      const kit = makeKit(done);
      dispose = () => kit.dispose();
      const g = newSignalGame();
      const noise = new Float32Array(BINS).fill(0.3);
      let dragging = false;

      host.textContent = '';
      const root = el('div', 'dg dg-signal');
      host.append(root);

      // Header
      const head = el('div', 'dg-head');
      const los = el('span', 'dg-chip dg-chip-alarm');
      const mid = el('span', 'dg-head-mid');
      const win = el('span', 'dg-chip');
      head.append(los, mid, win);

      // Left: the checklist and the current step's actions
      const left = el('section', 'dg-card dg-checklist');
      left.append(el('strong', 'dg-panel-label', t('minigame.signal.checklist')));
      const stepRows = STEPS.map((s, i) => {
        const row = el('div', 'dg-step-row');
        row.append(el('span', 'dg-step-box'), el('span', 'dg-step-text', t('minigame.signal.step', { n: i + 1, text: t(`minigame.signal.step.${s}` as StringKey) })));
        left.append(row);
        return row;
      });
      const action = el('div', 'dg-action');
      left.append(action);

      // Middle: telemetry tiles and the spectrum
      const centre = el('section', 'dg-signal-centre');
      const tiles = el('div', 'dg-tiles');
      const tile = (key: string) => {
        const box = el('div', 'dg-tile');
        box.append(el('span', 'dg-tile-label', t(`minigame.signal.tile.${key}` as StringKey)));
        const v = el('span', 'dg-tile-value');
        box.append(v);
        tiles.append(box);
        return { box, v };
      };
      const tCarrier = tile('carrier');
      const tCn0 = tile('cn0');
      const tLoss = tile('loss');
      const tLock = tile('lock');
      const tPoint = tile('pointing');
      const tLight = tile('light');
      const specCard = el('div', 'dg-card dg-spectrum-card');
      const specTop = el('div', 'dg-spec-top');
      specTop.append(el('strong', 'dg-panel-label', t('minigame.signal.receiver')));
      const tuneLabel = el('span', 'dg-tune');
      specTop.append(tuneLabel);
      const spectrum = el('canvas', 'dg-spectrum');
      spectrum.setAttribute('aria-label', t('minigame.signal.spectrumLabel'));
      const tuneRow = el('div', 'dg-tune-row');
      const tuneButtons: [string, number][] = [['minigame.signal.tuneDownBig', -5], ['minigame.signal.tuneDown', -0.25], ['minigame.signal.tuneUp', 0.25], ['minigame.signal.tuneUpBig', 5]];
      const tuneBtns = tuneButtons.map(([key, by]) => {
        const b = button('dg-btn dg-mini', t(key as StringKey));
        b.addEventListener('click', () => doTune(by));
        return b;
      });
      const lockBar = el('div', 'dg-bar dg-lock-bar');
      const lockFill = lockBar.appendChild(el('span', 'dg-bar-fill'));
      tuneRow.append(tuneBtns[0]!, tuneBtns[1]!, lockBar, tuneBtns[2]!, tuneBtns[3]!);
      specCard.append(specTop, spectrum, tuneRow);
      centre.append(tiles, specCard);

      // Right: DSN clock and power
      const right = el('section', 'dg-card dg-right');
      right.append(el('strong', 'dg-panel-label', t('minigame.signal.dsn')));
      const earth = el('canvas', 'dg-earth');
      right.append(earth);
      const stationRows = new Map<Station, HTMLElement>();
      for (const s of STATIONS) {
        const r = el('div', 'dg-station');
        stationRows.set(s, r);
        right.append(r);
      }
      right.append(el('strong', 'dg-panel-label dg-gap', t('minigame.signal.power')));
      const pGrid = el('div', 'dg-pgrid');
      const pRtg = el('span', '');
      const pLoad = el('span', '');
      const pMargin = el('span', '');
      const pBus = el('span', '');
      pGrid.append(pRtg, pLoad, pMargin, pBus);
      const resLabel = el('div', 'dg-row');
      const resBar = el('div', 'dg-bar');
      const resFill = resBar.appendChild(el('span', 'dg-bar-fill'));
      const lineRow = el('div', 'dg-row');
      const loadGrid = el('div', 'dg-loads');
      const loadBtns = new Map<Load, HTMLButtonElement>();
      LOADS.forEach((l) => {
        const b = button('dg-btn dg-load', '');
        b.addEventListener('click', () => flip(l));
        loadBtns.set(l, b);
        loadGrid.append(b);
      });
      right.append(pGrid, resLabel, resBar, lineRow, loadGrid);

      const main = el('div', 'dg-signal-main');
      main.append(left, centre, right);
      const foot = el('div', 'dg-foot');
      const ticker = el('span', 'dg-ticker dg-ticker-bad', t('minigame.signal.start'));
      foot.append(ticker, el('span', 'dg-keys', t('minigame.signal.keys')));
      root.append(head, main, foot);

      const say = (text: string, level: 'info' | 'warn' | 'bad' | 'good' = 'info') => {
        ticker.textContent = text;
        ticker.className = `dg-ticker dg-ticker-${level}`;
      };

      // Actions ----------------------------------------------------------------------------------
      let actionFor = '';
      let actionBtns: HTMLButtonElement[] = [];
      let fastBtn: HTMLButtonElement | null = null;
      let actionText: HTMLElement | null = null;

      function buildAction(): void {
        const s = stepName(g) ?? 'done';
        const key = `${s}|${g.telemetry}`;
        if (key === actionFor) return;
        actionFor = key;
        action.textContent = '';
        actionBtns = [];
        fastBtn = null;
        action.append(el('strong', 'dg-action-title', t(`minigame.signal.step.${s === 'done' ? 'wait' : s}` as StringKey)));
        actionText = el('p', 'dg-action-text');
        action.append(actionText);
        const add = (label: string, fn: () => void, primary = false) => {
          const b = button(`dg-btn ${primary ? 'dg-btn-primary' : ''}`, t('minigame.signal.actionKey', { n: actionBtns.length + 1, label }));
          b.addEventListener('click', fn);
          actionBtns.push(b);
          action.append(b);
        };
        if (s === 'ground') {
          actionText.textContent = t('minigame.signal.do.ground');
          add(t('minigame.signal.crossCheck', { h: 1 }), () => act(() => checkGround(g, 'crossCheck')), true);
          add(t('minigame.signal.restart', { h: 2 }), () => act(() => checkGround(g, 'restart')));
        } else if (s === 'power') {
          actionText.textContent = t('minigame.signal.do.power');
        } else if (s === 'station') {
          actionText.textContent = t('minigame.signal.do.station');
          for (const st of STATIONS) add(t(`minigame.signal.uplink.${st}` as StringKey), () => act(() => assignStation(g, st)), st === 'canberra');
        } else if (s === 'carrier') {
          actionText.textContent = t('minigame.signal.do.carrier');
        } else if (s === 'shout') {
          actionText.textContent = t('minigame.signal.do.shout');
          add(t('minigame.signal.send'), () => act(() => shout(g)), true);
        } else {
          actionText.textContent = t(g.telemetry ? 'minigame.signal.do.restore' : 'minigame.signal.do.wait');
          if (g.telemetry) add(t('minigame.signal.confirm'), () => act(() => confirmContact(g)), true);
        }
        if (s === 'station' || s === 'carrier' || s === 'shout') {
          fastBtn = button('dg-btn dg-fast', '');
          fastBtn.addEventListener('click', () => toggleFast());
          action.append(fastBtn);
        }
      }

      function act(fn: () => unknown): void {
        if (g.state !== 'playing') return;
        fn();
        handleEvents();
        refresh();
      }
      function flip(l: Load): void {
        act(() => toggleLoad(g, l));
      }
      function toggleFast(): void {
        if (!canFastForward(g)) return;
        g.fast = !g.fast;
        refresh();
      }
      function doTune(by: number): void {
        if (stepName(g) !== 'carrier') {
          say(t(g.locked ? 'minigame.signal.alreadyLocked' : 'minigame.signal.tuneLater'), 'info');
          return;
        }
        tune(g, by);
        refresh();
      }

      const EVENT_TEXT: Record<SignalEvent, [StringKey, 'info' | 'warn' | 'bad' | 'good', 'click' | 'alarm' | 'reward' | 'countdown' | null]> = {
        crossChecked: ['minigame.signal.ev.crossChecked', 'info', 'click'],
        wrongAction: ['minigame.signal.ev.wrongAction', 'warn', 'alarm'],
        powerOk: ['minigame.signal.ev.powerOk', 'good', 'click'],
        wrongStation: ['minigame.signal.ev.wrongStation', 'warn', 'alarm'],
        notYet: ['minigame.signal.ev.notYet', 'warn', null],
        assigned: ['minigame.signal.ev.assigned', 'good', 'click'],
        locked: ['minigame.signal.ev.locked', 'good', 'reward'],
        notLocked: ['minigame.signal.ev.notLocked', 'warn', null],
        tooLate: ['minigame.signal.ev.tooLate', 'bad', 'alarm'],
        shoutSent: ['minigame.signal.ev.shoutSent', 'good', 'countdown'],
        arrived: ['minigame.signal.ev.arrived', 'info', null],
        telemetry: ['minigame.signal.ev.telemetry', 'good', 'reward'],
        restored: ['minigame.signal.ev.restored', 'good', null],
        instDamaged: ['minigame.signal.ev.instDamaged', 'bad', 'alarm'],
        lineCold: ['minigame.signal.ev.lineCold', 'bad', 'alarm'],
        noData: ['minigame.signal.ev.noData', 'warn', null],
        needInstruments: ['minigame.signal.ev.needInstruments', 'warn', null],
        needMargin: ['minigame.signal.ev.needMargin', 'warn', null],
      };
      function handleEvents(): void {
        for (const e of g.events) {
          const [key, level, sound] = EVENT_TEXT[e];
          say(t(key, { h: hm(ONE_WAY_H), rt: fixed(ROUND_TRIP_H) }), level);
          if (sound) audio.effect(sound);
        }
        g.events = [];
      }

      // Input ------------------------------------------------------------------------------------
      kit.on(window, 'keydown', (e) => {
        if (typing(e) || e.ctrlKey || e.metaKey || e.altKey || g.state !== 'playing') return;
        const k = e.key.toLowerCase();
        if (k === 'arrowleft' || k === 'arrowright') {
          doTune((k === 'arrowleft' ? -1 : 1) * (e.shiftKey ? 5 : 0.25));
        } else if (e.repeat) {
          return;
        } else if (k >= '1' && k <= '9') {
          const b = actionBtns[Number(k) - 1];
          if (!b) return;
          b.click();
        } else if (k === 'f') {
          toggleFast();
          audio.effect('click');
        } else if (k === 's' && stepName(g) === 'shout') {
          act(() => shout(g));
        } else if (LOAD_KEYS.includes(k)) {
          flip(LOADS[LOAD_KEYS.indexOf(k)]!);
          audio.effect('click');
        } else return;
        e.preventDefault();
      });
      kit.on(spectrum, 'pointerdown', (e) => {
        dragging = true;
        spectrum.setPointerCapture(e.pointerId);
        lastX = e.clientX;
        if (stepName(g) !== 'carrier') doTune(0);
      });
      let lastX = 0;
      kit.on(spectrum, 'pointermove', (e) => {
        if (!dragging || stepName(g) !== 'carrier') return;
        const r = spectrum.getBoundingClientRect();
        // Drag the spectrum: moving right brings lower frequencies into the centre.
        tune(g, -((e.clientX - lastX) / r.width) * SPAN_KHZ * 2);
        lastX = e.clientX;
      });
      kit.on(spectrum, 'pointerup', () => (dragging = false));
      kit.on(spectrum, 'pointercancel', () => (dragging = false));
      kit.on(spectrum, 'wheel', (e) => {
        if (stepName(g) !== 'carrier') return;
        e.preventDefault();
        tune(g, (e.deltaY > 0 ? -1 : 1) * (e.shiftKey ? 2 : 0.25));
      }, { passive: false });

      // Refresh ----------------------------------------------------------------------------------
      function refresh(): void {
        buildAction();
        const s = g.step;
        stepRows.forEach((row, i) => {
          row.dataset.state = i < s ? 'done' : i === s ? 'now' : 'todo';
        });
        los.textContent = t(g.telemetry ? 'minigame.signal.aos' : 'minigame.signal.los', { t: hm(g.hours) });
        los.classList.toggle('dg-chip-alarm', !g.telemetry);
        mid.textContent = t('minigame.signal.speed', { x: fixed((fastNow(g) ? FAST_H_S : RATE_H_S) * 3600).replace(/\B(?=(\d{3})+(?!\d))/g, ',') });
        const ret = returnInH(g);
        if (ret !== null && !g.telemetry) {
          win.textContent = t('minigame.signal.returnIn', { t: hm(ret) });
          win.dataset.level = 'ok';
        } else if (inView('canberra', g.hours)) {
          const left = windowLeftH(g);
          win.textContent = t('minigame.signal.windowCloses', { t: hm(left) });
          win.dataset.level = left < 2 && g.shoutAt === null ? 'bad' : left < 4 && g.shoutAt === null ? 'warn' : 'ok';
        } else {
          win.textContent = t('minigame.signal.windowOpens', { t: hm(nextWindow(g.hours)[0] - g.hours) });
          win.dataset.level = 'warn';
        }

        // Telemetry tiles
        const heard = g.locked || g.telemetry;
        tCarrier.v.textContent = heard ? t('minigame.signal.dbm', { n: fixed(carrierDbm(g)) }) : t('minigame.signal.dash');
        tCn0.v.textContent = heard ? t('minigame.signal.dbhz', { n: fixed(cn0(carrierDbm(g)), 1) }) : t('minigame.signal.dash');
        tLoss.v.textContent = t('minigame.signal.db', { n: fixed(spaceLossDb(DISTANCE_KM, DOWNLINK_MHZ), 1) });
        tLock.v.textContent = t(g.telemetry ? 'minigame.signal.lock.data' : g.locked ? 'minigame.signal.lock.carrier' : 'minigame.signal.lock.none');
        tLock.box.dataset.level = g.telemetry ? 'ok' : g.locked ? 'warn' : 'bad';
        tPoint.v.textContent = g.telemetry ? t('minigame.signal.deg', { n: fixed(pointingDeg(g), 1) }) : t('minigame.signal.pointingGuess');
        tPoint.box.dataset.level = g.telemetry ? 'ok' : 'bad';
        tLight.v.textContent = t('minigame.signal.lightTime', { h: fixed(ONE_WAY_H, 1) });

        tuneLabel.textContent = t('minigame.signal.tuneAt', { khz: (g.tuneKHz >= 0 ? '+' : '') + fixed(g.tuneKHz, 2) });
        lockFill.style.width = `${g.locked ? 100 : Math.min(100, (g.lockS / LOCK_S) * 100)}%`;
        lockBar.dataset.level = g.locked ? 'ok' : 'warn';
        for (const b of tuneBtns) b.disabled = stepName(g) !== 'carrier';

        // DSN
        for (const st of STATIONS) {
          const r = stationRows.get(st)!;
          const el0 = elevation(st, g.hours);
          r.textContent = t(el0 < 0 ? 'minigame.signal.station.below' : 'minigame.signal.station.up', { name: t(`minigame.signal.name.${st}` as StringKey), deg: fixed(el0) });
          r.dataset.level = el0 >= MIN_ELEVATION ? 'ok' : el0 >= 0 ? 'warn' : 'off';
        }

        // Power
        const m = marginW(g);
        pRtg.textContent = t('minigame.signal.rtg', { w: fixed(RTG_W) });
        pLoad.textContent = t('minigame.signal.load', { w: fixed(loadW(g)) });
        pMargin.textContent = t('minigame.signal.margin', { w: (m >= 0 ? '+' : '') + fixed(m) });
        pMargin.dataset.level = m >= 0 ? 'ok' : 'bad';
        pBus.textContent = t('minigame.signal.bus', { v: fixed(busV(g), 1) });
        pBus.dataset.level = busV(g) >= 29.5 ? 'ok' : busV(g) >= 28 ? 'warn' : 'bad';
        const share = g.reserveWh / RESERVE_WH;
        resLabel.textContent = t('minigame.signal.reserve', { wh: fixed(g.reserveWh), pct: fixed(share * 100) });
        resFill.style.width = `${share * 100}%`;
        resBar.dataset.level = share < 0.3 ? 'bad' : share < STAR_RESERVE ? 'warn' : 'ok';
        lineRow.textContent = t('minigame.signal.line', { c: fixed(g.lineC, 1), min: fixed(LINE_FREEZE_C) });
        lineRow.dataset.level = g.lineC < LINE_FREEZE_C + 4 ? 'bad' : 'ok';
        LOADS.forEach((l, i) => {
          const b = loadBtns.get(l)!;
          b.textContent = t('minigame.signal.loadButton', { key: LOAD_KEYS[i]!.toUpperCase(), name: t(`minigame.signal.loadName.${l}` as StringKey), w: fixed(LOAD_W[l]), state: t(g.loads[l] ? 'minigame.director.on' : 'minigame.director.off') });
          b.setAttribute('aria-pressed', String(g.loads[l]));
          b.dataset.kind = INSTRUMENTS.includes(l) ? 'inst' : 'heat';
        });

        if (fastBtn) {
          fastBtn.textContent = t(g.fast && canFastForward(g) ? 'minigame.signal.fastOn' : 'minigame.signal.fast', { x: fixed(FAST_H_S / RATE_H_S) });
          fastBtn.disabled = !canFastForward(g);
          fastBtn.setAttribute('aria-pressed', String(g.fast && canFastForward(g)));
        }
        if (actionText && stepName(g) === 'wait') {
          actionText.textContent = g.telemetry ? t('minigame.signal.do.restore') : t('minigame.signal.do.wait', { t: hm(returnInH(g) ?? 0) });
        }
      }

      // Drawing ----------------------------------------------------------------------------------
      function drawEarth(): void {
        const f = canvas2d(earth);
        if (!f) return;
        const { c, w, h, ratio: r } = f;
        c.clearRect(0, 0, w, h);
        const cx = w / 2;
        const cy = h / 2 + 6 * r;
        const R = Math.min(w, h) * 0.38;
        // Direction to the probe: straight up.
        c.strokeStyle = 'rgba(255,210,122,0.7)';
        c.setLineDash([4 * r, 4 * r]);
        c.lineWidth = 1.5 * r;
        c.beginPath();
        c.moveTo(cx, cy - R - 2 * r);
        c.lineTo(cx, 4 * r);
        c.stroke();
        c.setLineDash([]);
        c.fillStyle = 'rgba(255,210,122,0.9)';
        c.font = `600 ${10 * r}px system-ui, sans-serif`;
        c.textAlign = 'left';
        c.textBaseline = 'top';
        c.fillText(t('minigame.signal.toProbe'), cx + 5 * r, 2 * r);
        // Earth from above the South Pole.
        const grad = c.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
        grad.addColorStop(0, '#3f7fc8');
        grad.addColorStop(1, '#0c2547');
        c.fillStyle = grad;
        c.beginPath();
        c.arc(cx, cy, R, 0, Math.PI * 2);
        c.fill();
        // Where Canberra sees the probe high enough: a green arc on its circle of latitude.
        const radius = (lat: number) => R * ((90 + lat) / 180) * 1.6;
        const rc = radius(STATION_SITE.canberra.lat);
        const limit = (() => {
          for (let a = 0; a <= 180; a += 1) if (elevationAtH(a) < MIN_ELEVATION) return a;
          return 180;
        })();
        c.strokeStyle = 'rgba(95,211,141,0.75)';
        c.lineWidth = 5 * r;
        c.beginPath();
        c.arc(cx, cy, rc, -Math.PI / 2 - (limit * Math.PI) / 180, -Math.PI / 2 + (limit * Math.PI) / 180);
        c.stroke();
        // Latitude rings and the pole.
        c.strokeStyle = 'rgba(255,255,255,0.12)';
        c.lineWidth = r;
        for (const lat of [-60, -30, 0, 30]) {
          c.beginPath();
          c.arc(cx, cy, Math.min(R, radius(lat)), 0, Math.PI * 2);
          c.stroke();
        }
        // Stations, turning with Earth.
        for (const st of STATIONS) {
          const ha = hourAngle(st, g.hours);
          const rr = Math.min(R - 4 * r, radius(STATION_SITE[st].lat));
          const a = (ha * Math.PI) / 180 - Math.PI / 2;
          const x = cx + Math.cos(a) * rr;
          const y = cy + Math.sin(a) * rr;
          const up = inView(st, g.hours);
          c.fillStyle = st === 'canberra' ? (up ? '#5fd38d' : '#ffb36b') : '#7f8ea6';
          c.beginPath();
          c.arc(x, y, (st === 'canberra' ? 5 : 3.5) * r, 0, Math.PI * 2);
          c.fill();
          if (st === 'canberra' && up && g.station === 'canberra') {
            c.strokeStyle = 'rgba(95,211,141,0.6)';
            c.beginPath();
            c.moveTo(x, y);
            c.lineTo(cx, 4 * r);
            c.stroke();
          }
          c.fillStyle = 'rgba(232,238,247,0.85)';
          c.font = `${9 * r}px system-ui, sans-serif`;
          c.textAlign = 'center';
          c.textBaseline = 'top';
          c.fillText(t(`minigame.signal.short.${st}` as StringKey), x, y + 5 * r);
        }
      }
      /** Canberra's elevation at an hour angle (degrees). */
      function elevationAtH(ha: number): number {
        const lat = (STATION_SITE.canberra.lat * Math.PI) / 180;
        const dec = (PROBE_DEC * Math.PI) / 180;
        return (Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos((ha * Math.PI) / 180)) * 180) / Math.PI;
      }

      function drawSpectrum(): void {
        const f = canvas2d(spectrum);
        if (!f) return;
        const { c, w, h, ratio: r } = f;
        c.fillStyle = '#020a14';
        c.fillRect(0, 0, w, h);
        // Grid
        c.strokeStyle = 'rgba(79,163,255,0.12)';
        c.lineWidth = r;
        for (let i = 1; i < 12; i++) {
          c.beginPath();
          c.moveTo((w * i) / 12, 0);
          c.lineTo((w * i) / 12, h);
          c.stroke();
        }
        for (let i = 1; i < 5; i++) {
          c.beginPath();
          c.moveTo(0, (h * i) / 5);
          c.lineTo(w, (h * i) / 5);
          c.stroke();
        }
        const listening = g.station === 'canberra' && inView('canberra', g.hours);
        const heard = listening || g.telemetry;
        // The carrier's position relative to the tuning, kHz.
        const off = carrierNow(g) - g.tuneKHz;
        const amp = g.telemetry ? 0.85 : g.locked ? 0.55 : 0.32;
        for (let i = 0; i < BINS; i++) {
          const khz = -SPAN_KHZ + (2 * SPAN_KHZ * i) / (BINS - 1);
          const n = (-Math.log(1 - Math.random() * 0.999)) * 0.12;
          let v = n;
          if (heard) {
            v += amp * Math.exp(-((khz - off) ** 2) / (2 * 0.12 ** 2));
            if (g.telemetry) v += 0.25 * (Math.exp(-((khz - off - 1.8) ** 2) / 0.05) + Math.exp(-((khz - off + 1.8) ** 2) / 0.05));
          }
          noise[i] = noise[i]! * 0.6 + v * 0.4;
        }
        // Lock window in the centre
        const xs = (k: number) => ((k + SPAN_KHZ) / (2 * SPAN_KHZ)) * w;
        c.fillStyle = g.locked ? 'rgba(95,211,141,0.15)' : 'rgba(255,210,122,0.1)';
        c.fillRect(xs(-LOCK_WINDOW_KHZ), 0, xs(LOCK_WINDOW_KHZ) - xs(-LOCK_WINDOW_KHZ), h);
        c.strokeStyle = g.locked ? 'rgba(95,211,141,0.8)' : 'rgba(255,210,122,0.6)';
        c.setLineDash([3 * r, 3 * r]);
        for (const k of [-LOCK_WINDOW_KHZ, LOCK_WINDOW_KHZ]) {
          c.beginPath();
          c.moveTo(xs(k), 0);
          c.lineTo(xs(k), h);
          c.stroke();
        }
        c.setLineDash([]);
        // The trace
        const ys = (v: number) => h - 8 * r - v * (h - 20 * r);
        c.beginPath();
        for (let i = 0; i < BINS; i++) {
          const x = (w * i) / (BINS - 1);
          if (i === 0) c.moveTo(x, ys(noise[i]!));
          else c.lineTo(x, ys(noise[i]!));
        }
        c.strokeStyle = g.telemetry ? '#5fd38d' : '#7fd0ff';
        c.lineWidth = 1.5 * r;
        c.stroke();
        c.lineTo(w, h);
        c.lineTo(0, h);
        c.closePath();
        c.fillStyle = 'rgba(79,163,255,0.12)';
        c.fill();
        // Labels
        c.font = `${10 * r}px ui-monospace, Consolas, monospace`;
        c.fillStyle = 'rgba(232,238,247,0.6)';
        c.textBaseline = 'bottom';
        c.textAlign = 'left';
        c.fillText(t('minigame.signal.khz', { n: `-${SPAN_KHZ}` }), 4 * r, h - 2 * r);
        c.textAlign = 'right';
        c.fillText(t('minigame.signal.khz', { n: `+${SPAN_KHZ}` }), w - 4 * r, h - 2 * r);
        c.textAlign = 'center';
        c.textBaseline = 'top';
        c.font = `700 ${12 * r}px system-ui, sans-serif`;
        const note = !listening && !g.telemetry
          ? t(g.station === 'canberra' ? 'minigame.signal.spec.down' : 'minigame.signal.spec.noDish')
          : g.telemetry
            ? t('minigame.signal.spec.data')
            : g.locked
              ? t('minigame.signal.spec.locked')
              : t('minigame.signal.spec.search', { range: fixed(TUNE_RANGE_KHZ) });
        c.fillStyle = g.telemetry || g.locked ? '#5fd38d' : listening ? '#ffd27a' : '#8fa3bd';
        c.fillText(note, w / 2, 6 * r);
      }

      // Loop -------------------------------------------------------------------------------------
      let lastLevelWarn = 0;
      kit.loop((dt) => {
        if (g.state === 'playing') {
          stepSignal(g, dt);
          handleEvents();
          lastLevelWarn -= dt;
          if (marginW(g) < 0 && g.reserveWh < RESERVE_WH * 0.3 && lastLevelWarn <= 0) {
            say(t('minigame.signal.lowReserve'), 'bad');
            audio.effect('alarm');
            lastLevelWarn = 4;
          }
          if (!g.loads.lineHeater && g.lineC < LINE_FREEZE_C + 4 && lastLevelWarn <= 0) {
            say(t('minigame.signal.ev.lineCold'), 'bad');
            audio.effect('alarm');
            lastLevelWarn = 4;
          }
        }
        if (g.state !== 'playing' && !ended) end();
        refresh();
        drawEarth();
        drawSpectrum();
      });

      let ended = false;
      function end(): void {
        ended = true;
        const won = g.state === 'won';
        audio.effect(won ? 'reward' : 'alarm');
        const headline = t(won ? 'minigame.signal.won' : `minigame.signal.lost.${g.lostTo ?? 'power'}` as StringKey);
        const line = won
          ? t('minigame.signal.line.won', { t: hm(g.hours), pct: fixed((g.minReserveWh / RESERVE_WH) * 100) })
          : t(`minigame.signal.line.${g.lostTo ?? 'power'}` as StringKey);
        root.classList.add('dg-over');
        kit.finish(root, { won, stars: signalStars(g), line }, headline);
      }

      refresh();
      actionBtns[0]?.focus({ preventScroll: true });
    },
    destroy() {
      dispose?.();
      dispose = null;
    },
  };
};

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Play, Square, Eye, Monitor, LayoutGrid, RotateCcw } from 'lucide-react';

const ROWS = 'ABCDEF';
const COLS = 8;
const ROW_GAP = 1.5;
const STEP = 0.35;

const TIER = { A: ['Front', 0x5aa0e8], B: ['Standard', 0x3d7ae8], C: ['Prime', 0x7a5cff], D: ['Prime', 0x7a5cff], E: ['Premium', 0xb44bd8], F: ['Recliner', 0xe0457b] };
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const tagTex = (text) => {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#10c98a'; g.beginPath(); g.roundRect(8, 8, 240, 64, 22); g.fill();
  g.beginPath(); g.moveTo(112, 70); g.lineTo(128, 90); g.lineTo(144, 70); g.fill();
  g.fillStyle = '#04150f'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 42);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};

const seatPos = (r, i) => ({
  x: (i - 3.5) * 1.1 + (i >= 4 ? 0.5 : -0.5),
  y: 0.15 + r * STEP,
  z: 3 + r * ROW_GAP,
});

const textTexture = (text, size = 128, color = '#ffffff', font = 'bold 64px sans-serif') => {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.clearRect(0, 0, size, size);
  g.fillStyle = color;
  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, size / 2, size / 2 + 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

const screenTexture = (title) => {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 420;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 1024, 420);
  bg.addColorStop(0, '#16336b');
  bg.addColorStop(0.5, '#4b2a8f');
  bg.addColorStop(1, '#0f5f8f');
  g.fillStyle = bg;
  g.fillRect(0, 0, 1024, 420);
  const glow = g.createRadialGradient(512, 210, 20, 512, 210, 520);
  glow.addColorStop(0, 'rgba(255,255,255,0.35)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, 1024, 420);
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.font = '600 26px sans-serif';
  g.textAlign = 'center';
  g.fillText('N O W   S H O W I N G', 512, 150);
  g.fillStyle = '#ffffff';
  let fs = 74;
  g.font = `700 ${fs}px sans-serif`;
  while (g.measureText(title).width > 900 && fs > 30) {
    fs -= 4;
    g.font = `700 ${fs}px sans-serif`;
  }
  g.fillText(title, 512, 240);
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.font = '600 22px sans-serif';
  g.fillText('CINEVERSE AI', 512, 320);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

export default function Cinema3D({ title = 'CINEVERSE', booked = [], selected = [], recommended = [], onToggle, prices = {} }) {
  const mountRef = useRef(null);
  const tipRef = useRef(null);
  const propsRef = useRef({});
  const applyRef = useRef(() => {});
  const apiRef = useRef({});
  const [touring, setTouring] = useState(false);
  const [mode, setMode] = useState('orbit');

  propsRef.current = { booked, selected, recommended, onToggle, prices, title };

  useEffect(() => {
    applyRef.current();
  }, [booked, selected, recommended, prices]);

  useEffect(() => {
    const mount = mountRef.current;
    const tip = tipRef.current;
    const W = () => mount.clientWidth || 800;
    const H = () => mount.clientHeight || 500;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070f);
    scene.fog = new THREE.FogExp2(0x05070f, 0.014);

    const camera = new THREE.PerspectiveCamera(48, W() / H(), 0.05, 120);
    const DEFAULT = { p: [0, 8.5, 20], t: [0, 1.8, 6] };
    camera.position.set(...DEFAULT.p);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W(), H());
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...DEFAULT.t);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.495;
    const orbitLimits = () => {
      controls.minDistance = 2;
      controls.maxDistance = 38;
      controls.enableZoom = true;
      controls.rotateSpeed = 0.8;
      controls.minPolarAngle = 0;
      controls.maxPolarAngle = Math.PI * 0.495;
    };
    orbitLimits();
    controls.update();

    // ---------- lights ----------
    scene.add(new THREE.AmbientLight(0xb6c4ff, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(6, 14, 18);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x8a6bff, 0.6);
    fill.position.set(-8, 6, 2);
    scene.add(fill);
    const screenLight = new THREE.PointLight(0x7aa8ff, 90, 30, 2);
    screenLight.position.set(0, 3.5, 2.5);
    scene.add(screenLight);

    // ---------- hall shell ----------
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 50), new THREE.MeshStandardMaterial({ color: 0x1b0f1a, roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 8);
    scene.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0d1122, roughness: 0.9 });
    const stripMat = new THREE.MeshBasicMaterial({ color: 0x6c4bff });
    [-9.5, 9.5].forEach((x) => {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.3, 9, 30), wallMat);
      w.position.set(x, 4.5, 8);
      scene.add(w);
      for (let k = 0; k < 9; k++) {
        const s = new THREE.Mesh(new THREE.BoxGeometry(0.06, 6, 0.08), stripMat);
        s.position.set(x * 0.985, 4, -4 + k * 3);
        scene.add(s);
      }
    });
    const back = new THREE.Mesh(new THREE.BoxGeometry(20, 9, 0.3), wallMat);
    back.position.set(0, 4.5, 23);
    scene.add(back);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(20, 30), new THREE.MeshStandardMaterial({ color: 0x080b16, roughness: 1 }));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, 9, 8);
    scene.add(ceil);
    const sp = new Float32Array(240 * 3);
    for (let i = 0; i < 240; i++) {
      sp[i * 3] = (Math.random() - 0.5) * 18;
      sp[i * 3 + 1] = 8.8;
      sp[i * 3 + 2] = -6 + Math.random() * 28;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xaecbff, size: 0.09 }));
    scene.add(stars);

    // ---------- screen ----------
    const screenGeo = new THREE.PlaneGeometry(16, 6.6, 48, 1);
    const pa = screenGeo.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i);
      pa.setZ(i, x * x * 0.012);
    }
    screenGeo.computeVertexNormals();
    const screenTex = screenTexture(propsRef.current.title);
    const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 3.9, 0);
    scene.add(screen);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(16.8, 7.2, 0.2), new THREE.MeshStandardMaterial({ color: 0x020308 }));
    frame.position.set(0, 3.9, -0.25);
    scene.add(frame);

    // projector + light beam
    const proj = new THREE.Mesh(new THREE.BoxGeometry(1, 0.6, 1.2), new THREE.MeshStandardMaterial({ color: 0x222633 }));
    proj.position.set(0, 7, 21);
    scene.add(proj);
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(5.2, 21, 32, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x9cc4ff, transparent: true, opacity: 0.045, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    beam.rotation.x = Math.PI / 2;
    beam.position.set(0, 5.4, 10.5);
    scene.add(beam);

    // ---------- risers + seats ----------
    const riserMat = new THREE.MeshStandardMaterial({ color: 0x15122a, roughness: 0.85 });
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x7a5cff });
    const aisleMat = new THREE.MeshBasicMaterial({ color: 0xffc46b });
    const pedMat = new THREE.MeshStandardMaterial({ color: 0x14161f, roughness: 0.8 });
    const personMat = new THREE.MeshStandardMaterial({ color: 0x23202e, roughness: 0.9 });
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const numTex = Array.from({ length: COLS }, (_, i) => textTexture(String(i + 1)));

    const seats = new Map();
    const hitMeshes = [];

    for (let r = 0; r < ROWS.length; r++) {
      const h = 0.15 + r * STEP;
      const z = 3 + r * ROW_GAP;
      const riser = new THREE.Mesh(new THREE.BoxGeometry(18, h, ROW_GAP), riserMat);
      riser.position.set(0, h / 2, z);
      scene.add(riser);
      const led = new THREE.Mesh(new THREE.BoxGeometry(18, 0.05, 0.05), ledMat);
      led.position.set(0, h + 0.01, z - ROW_GAP / 2);
      scene.add(led);
      const aisleStrip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, ROW_GAP * 0.9), aisleMat);
      aisleStrip.position.set(0, h + 0.02, z);
      scene.add(aisleStrip);

      [-6.6, 6.6].forEach((lx) => {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTexture(ROWS[r], 128, '#9ec7ff'), transparent: true, depthWrite: false }));
        sprite.scale.set(0.9, 0.9, 1);
        sprite.position.set(lx, h + 0.6, z);
        scene.add(sprite);
      });

      for (let i = 0; i < COLS; i++) {
        const id = ROWS[r] + (i + 1);
        const p = seatPos(r, i);
        const g = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: TIER[ROWS[r]][1], roughness: 0.55, metalness: 0.1, emissive: 0x0b1b3f });

        const ped = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), pedMat);
        ped.position.y = 0.15;
        const cushion = new THREE.Mesh(new RoundedBoxGeometry(0.86, 0.24, 0.9, 4, 0.08), mat);
        cushion.position.y = 0.42;
        const backrest = new THREE.Mesh(new RoundedBoxGeometry(0.86, 0.95, 0.22, 4, 0.1), mat);
        backrest.position.set(0, 1.0, 0.42);
        backrest.rotation.x = 0.12;
        const armL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.28, 0.8), pedMat);
        armL.position.set(-0.49, 0.7, 0.05);
        const armR = armL.clone();
        armR.position.x = 0.49;
        const num = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ map: numTex[i], transparent: true, depthWrite: false }));
        num.rotation.y = Math.PI;
        num.position.set(0, 1.05, 0.3);

        const person = new THREE.Group();
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.22), personMat);
        torso.position.set(0, 0.95, 0.2);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), personMat);
        head.position.set(0, 1.42, 0.22);
        person.add(torso, head);
        person.visible = false;

        const hit = new THREE.Mesh(new THREE.BoxGeometry(1, 1.5, 1), hitMat);
        hit.position.set(0, 0.8, 0.2);
        hit.userData.seat = id;
        hitMeshes.push(hit);

        const rest = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.24, 0.18, 3, 0.07), mat);
        rest.position.set(0, 1.55, 0.46);
        rest.rotation.x = 0.12;
        g.add(ped, cushion, backrest, rest, armL, armR, num, person, hit);
        g.position.set(p.x, p.y, p.z);
        scene.add(g);
        seats.set(id, { id, group: g, mat, tierColor: TIER[ROWS[r]][1], tag: null, person, baseY: p.y, targetY: p.y, status: 'free', hover: false });
      }
    }

    // ---------- seat status ----------
    const apply = () => {
      const { booked: b, selected: s, recommended: rc } = propsRef.current;
      seats.forEach((st, id) => {
        const m = st.mat;
        st.status = b.includes(id) ? 'booked' : s.includes(id) ? 'selected' : rc.includes(id) ? 'rec' : 'free';
        st.person.visible = st.status === 'booked';
        if (st.status === 'booked') {
          m.color.setHex(0x4a2a32);
          m.emissive.setHex(0x2a0a10);
          m.emissiveIntensity = 1;
        } else if (st.status === 'selected') {
          m.color.setHex(0x10c98a);
          m.emissive.setHex(0x0a8f63);
          m.emissiveIntensity = 0.9;
        } else if (st.status === 'rec') {
          m.color.setHex(0xf2b84b);
          m.emissive.setHex(0xffa000);
        } else {
          m.color.setHex(st.tierColor);
          m.emissive.setHex(0x0b1b3f);
          m.emissiveIntensity = 1;
        }
        if (st.status === 'selected' && !st.tag) {
          const pr = propsRef.current.prices[id];
          st.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex('₹' + (pr ? pr.price : 0)), transparent: true, depthTest: false }));
          st.tag.scale.set(1.5, 0.56, 1); st.tag.position.set(0, 2.25, 0.2); st.tag.renderOrder = 10;
          st.group.add(st.tag);
        }
        if (st.tag) st.tag.visible = st.status === 'selected';
        st.targetY = st.baseY + (st.status === 'selected' ? 0.12 : 0);
      });
    };
    applyRef.current = apply;
    apply();

    // ---------- camera fly ----------
    let tween = null;
    const flyTo = (pos, tgt, dur = 1.6, done) => {
      tween = {
        p0: camera.position.clone(),
        t0: controls.target.clone(),
        p1: new THREE.Vector3(...pos),
        t1: new THREE.Vector3(...tgt),
        t: 0,
        dur,
        done,
      };
    };

    const tour = { active: false, i: 0 };
    const steps = [
      { p: [-15, 7, 17], t: [0, 2, 6], d: 2.6 },
      { p: [-9, 3.2, 3], t: [0, 2.2, 9], d: 2.4 },
      { p: [0, 2.6, 1.5], t: [0, 1.6, 10], d: 2.4 },
      { p: [9, 4.5, 8], t: [0, 2, 4], d: 2.4 },
      { p: [0, 6.5, 21], t: [0, 3, 0], d: 2.6 },
      { p: DEFAULT.p, t: DEFAULT.t, d: 2.2 },
    ];
    const stopTour = () => {
      if (!tour.active) return;
      tour.active = false;
      tween = null;
      setTouring(false);
    };
    const nextStep = () => {
      if (!tour.active) return;
      if (tour.i >= steps.length) {
        stopTour();
        return;
      }
      const s = steps[tour.i++];
      flyTo(s.p, s.t, s.d, nextStep);
    };

    const toOrbit = () => {
      orbitLimits();
      setMode('orbit');
    };

    apiRef.current = {
      tour: () => {
        if (tour.active) return stopTour();
        toOrbit();
        tour.active = true;
        tour.i = 0;
        setTouring(true);
        nextStep();
      },
      view: (name) => {
        stopTour();
        toOrbit();
        const v = {
          reset: DEFAULT,
          screen: { p: [0, 3.4, 1.6], t: [0, 1.6, 10] },
          top: { p: [0, 21, 9.6], t: [0, 0, 7] },
        }[name];
        flyTo(v.p, v.t, 1.5);
      },
      mySeat: () => {
        stopTour();
        const { selected: s, recommended: rc } = propsRef.current;
        const id = s[0] || rc[0] || 'C4';
        const st = seats.get(id);
        if (!st) return;
        const pos = [st.group.position.x, st.group.position.y + 1.3, st.group.position.z + 0.15];
        const dir = new THREE.Vector3(-pos[0] * 0.15, 3.6 - pos[1], 0 - pos[2]).normalize();
        const tgt = [pos[0] + dir.x * 0.05, pos[1] + dir.y * 0.05, pos[2] + dir.z * 0.05];
        controls.maxPolarAngle = Math.PI * 0.97;
        controls.minDistance = 0.01;
        flyTo(pos, tgt, 1.8, () => {
          controls.minDistance = 0.01;
          controls.maxDistance = 0.2;
          controls.enableZoom = false;
          controls.rotateSpeed = -0.35;
          setMode('seat');
        });
      },
    };

    controls.addEventListener('start', stopTour);

    // ---------- interaction ----------
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let hoverId = null;
    let down = null;

    const pick = (e) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(hitMeshes, false)[0];
      return hit ? hit.object.userData.seat : null;
    };

    const label = { free: 'Available', selected: 'Selected', booked: 'Booked', rec: 'AI recommended' };
    const onMove = (e) => {
      const id = pick(e);
      if (hoverId && hoverId !== id) seats.get(hoverId).hover = false;
      hoverId = id;
      if (id) {
        const st = seats.get(id);
        st.hover = true;
        renderer.domElement.style.cursor = st.status === 'booked' ? 'not-allowed' : 'pointer';
        const r = mount.getBoundingClientRect();
        tip.style.opacity = 1;
        tip.style.left = e.clientX - r.left + 14 + 'px';
        tip.style.top = e.clientY - r.top - 12 + 'px';
        const pr = propsRef.current.prices[id];
        tip.textContent = `Seat ${id} · ${pr ? pr.tier + ' · ₹' + pr.price : ''} · ${label[st.status]}`;
      } else {
        renderer.domElement.style.cursor = 'grab';
        tip.style.opacity = 0;
      }
    };
    const onDown = (e) => {
      down = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 6) return;
      const id = pick(e);
      if (id && seats.get(id).status !== 'booked') propsRef.current.onToggle && propsRef.current.onToggle(id);
    };
    const onLeave = () => {
      tip.style.opacity = 0;
      if (hoverId) seats.get(hoverId).hover = false;
      hoverId = null;
    };
    const el = renderer.domElement;
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointerleave', onLeave);

    // ---------- resize ----------
    const ro = new ResizeObserver(() => {
      camera.aspect = W() / H();
      camera.updateProjectionMatrix();
      renderer.setSize(W(), H());
    });
    ro.observe(mount);

    // ---------- loop ----------
    const clock = new THREE.Clock();
    let raf;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      if (tween) {
        tween.t += dt;
        const k = Math.min(tween.t / tween.dur, 1);
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        camera.position.lerpVectors(tween.p0, tween.p1, e);
        controls.target.lerpVectors(tween.t0, tween.t1, e);
        if (k >= 1) {
          const d = tween.done;
          tween = null;
          d && d();
        }
      }
      controls.update();

      seats.forEach((st) => {
        st.group.position.y += (st.targetY - st.group.position.y) * 0.18;
        const s = st.hover && st.status !== 'booked' ? 1.08 : 1;
        st.group.scale.x += (s - st.group.scale.x) * 0.2;
        st.group.scale.y = st.group.scale.z = st.group.scale.x;
        if (st.status === 'rec') st.mat.emissiveIntensity = 0.45 + 0.45 * Math.sin(t * 3.2);
        else if (st.hover && st.status === 'free') st.mat.emissiveIntensity = 3.2;
        else if (st.status === 'free') st.mat.emissiveIntensity = 1;
      });

      const f = 0.92 + 0.08 * Math.sin(t * 2.1) + 0.03 * Math.sin(t * 9.7);
      screenMat.color.setScalar(f);
      screenLight.intensity = 80 + 18 * Math.sin(t * 2.1);
      beam.material.opacity = 0.04 + 0.012 * Math.sin(t * 1.3);

      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.removeEventListener('start', stopTour);
      controls.dispose();
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointerleave', onLeave);
      tour.active = false;
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        }
      });
      renderer.dispose();
      if (el.parentNode === mount) mount.removeChild(el);
    };
  }, []);

  const tiers = {};
  ROWS.split('').forEach((row) => {
    const [t, col] = TIER[row];
    Object.entries(prices).filter(([k]) => k[0] === row).forEach(([, p]) => {
      const e = tiers[t] || (tiers[t] = { c: col, min: p.price, max: p.price });
      e.min = Math.min(e.min, p.price); e.max = Math.max(e.max, p.price);
    });
  });
  const last = selected[selected.length - 1];
  const lastP = last && prices[last];
  const api = (fn, ...a) => () => apiRef.current[fn] && apiRef.current[fn](...a);

  return (
    <div className="c3d">
      <div className="c3d-canvas" ref={mountRef} />
      <div className="c3d-tip" ref={tipRef} />
      <div className="c3d-top">
        <span className="c3d-badge">3D SEAT VIEW</span>
        <div className="c3d-btns">
          <button className={touring ? 'on' : ''} onClick={api('tour')}>
            {touring ? <Square size={13} /> : <Play size={13} />} {touring ? 'Stop tour' : 'Tour'}
          </button>
          <button onClick={api('view', 'screen')}>
            <Monitor size={13} /> Screen side
          </button>
          <button onClick={api('view', 'top')}>
            <LayoutGrid size={13} /> Top view
          </button>
          <button className={mode === 'seat' ? 'on' : ''} onClick={api('mySeat')}>
            <Eye size={13} /> My view
          </button>
          <button onClick={api('view', 'reset')}>
            <RotateCcw size={13} /> Reset
          </button>
        </div>
      </div>
      {lastP && <div className="c3d-pick">Seat <b>{last}</b> {lastP.tier} <b>₹{lastP.price}</b><span>{selected.length} selected · ₹{selected.reduce((t, s) => t + (prices[s] ? prices[s].price : 0), 0)}</span></div>}
      <div className="c3d-bottom">
        <div className="c3d-legend">
          {Object.entries(tiers).map(([t, v]) => <span key={t}><i style={{ background: hex(v.c) }} /> {t} <small>₹{v.min}{v.max !== v.min ? '–' + v.max : ''}</small></span>)}
          <span><i style={{ background: '#10c98a' }} /> Selected</span>
          <span><i style={{ background: '#f2b84b' }} /> AI pick</span>
          <span><i style={{ background: '#4a2a32' }} /> Booked</span>
        </div>
        <small>{mode === 'seat' ? 'Drag to look around from your seat' : 'Drag to rotate · Scroll to zoom · Click a seat to select'}</small>
      </div>
    </div>
  );
}

import * as THREE from 'three';
import { store } from '../store.js';
import { clamp, easeOutCubic } from '../utils/math.js';
import { goldMaterial, goldSatinMaterial } from './materials.js';
import { coinBumpTexture } from './textures.js';

function coinGeometry() {
  const prof = [
    [0, -0.05], [0.84, -0.05], [0.86, -0.07], [0.9, -0.07], [0.97, -0.06], [1, -0.035],
    [1, 0.035], [0.97, 0.06], [0.9, 0.07], [0.86, 0.07], [0.84, 0.05], [0, 0.05],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.LatheGeometry(prof, 72);
  geo.rotateX(Math.PI / 2);
  return geo;
}

function ingotGeometry() {
  const geo = new THREE.BoxGeometry(1, 0.3, 0.5);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) > 0) {
      p.setX(i, p.getX(i) * 0.8);
      p.setZ(i, p.getZ(i) * 0.7);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

/** Coins and gold bars orbiting the logo in the hero. */
export class Treasures {
  constructor(exp) {
    this.exp = exp;
    this.anchor = document.querySelector('[data-gl="logo"]');
    this.modules = document.getElementById('moduller');
    this.group = new THREE.Group();
    exp.scene.add(this.group);

    const bump = coinBumpTexture();
    const coinFace = new THREE.MeshPhysicalMaterial({
      color: '#f4c24f',
      metalness: 1,
      roughness: 0.26,
      bumpMap: bump,
      bumpScale: 3,
      envMapIntensity: 1.3,
    });
    const ingotTop = coinFace.clone();
    ingotTop.bumpScale = 2;

    const coinGeo = coinGeometry();
    const faceGeo = new THREE.CircleGeometry(0.84, 64);
    const barGeo = ingotGeometry();

    const makeCoin = () => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(coinGeo, goldMaterial()));
      const front = new THREE.Mesh(faceGeo, coinFace);
      front.position.z = 0.0505;
      const back = new THREE.Mesh(faceGeo, coinFace);
      back.position.z = -0.0505;
      back.rotation.y = Math.PI;
      g.add(front, back);
      return g;
    };
    const makeBar = () =>
      new THREE.Mesh(barGeo, [
        goldSatinMaterial(), goldSatinMaterial(), ingotTop,
        goldSatinMaterial(), goldSatinMaterial(), goldSatinMaterial(),
      ]);

    const layout = [
      { kind: 'coin', r: 0.66, a: 0.5, y: 0.34, s: 0.15 },
      { kind: 'bar', r: 0.74, a: 2.1, y: -0.36, s: 0.3 },
      { kind: 'coin', r: 0.8, a: 3.4, y: 0.18, s: 0.11 },
      { kind: 'coin', r: 0.6, a: 4.6, y: -0.46, s: 0.09 },
      { kind: 'bar', r: 0.84, a: 5.6, y: 0.5, s: 0.2 },
      { kind: 'coin', r: 0.95, a: 1.3, y: -0.05, s: 0.07 },
    ];
    this.items = layout.map((l, i) => {
      const obj = l.kind === 'coin' ? makeCoin() : makeBar();
      obj.scale.setScalar(l.s);
      obj.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      this.group.add(obj);
      return { ...l, obj, spin: 0.25 + Math.random() * 0.5, phase: i * 1.7 };
    });
  }

  update({ t, dt }) {
    const a = this.exp.worldRect(this.anchor);
    const leave = clamp(1 - this.modules.getBoundingClientRect().top / this.exp.height);
    this.group.visible = a.visible && leave < 0.98;
    if (!this.group.visible) return;

    const size = Math.min(a.h, a.w * 1.2) * 0.64;
    const intro = easeOutCubic(store.intro);
    this.group.position.set(a.x, a.y, 0);
    this.group.scale.setScalar(size);

    const spread = (1 - intro) * 3 + 1 + leave * 1.6;
    for (const it of this.items) {
      const ang = it.a + t * 0.16;
      it.obj.position.set(
        Math.cos(ang) * it.r * 1.05 * spread,
        it.y * (1 + leave * 0.8) + Math.sin(t * 0.9 + it.phase) * 0.04 + leave * 0.6,
        Math.sin(ang) * it.r * 0.7 * spread,
      );
      it.obj.rotation.x += dt * it.spin * 0.6;
      it.obj.rotation.y += dt * it.spin;
      it.obj.scale.setScalar(it.s * intro * (1 - leave * 0.6));
    }
  }
}

import * as THREE from 'three';
import { store } from '../store.js';
import { clamp, damp, easeOutBack, smoothstep } from '../utils/math.js';
import { goldMaterial } from './materials.js';
import { invoiceTexture } from './textures.js';

function checkGeometry() {
  const s = new THREE.Shape(
    [[-0.5, 0.02], [-0.17, -0.3], [0.5, 0.36], [0.37, 0.49], [-0.17, -0.05], [-0.37, 0.15]].map(
      ([x, y]) => new THREE.Vector2(x, y),
    ),
  );
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.08,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

/** A fan of e-documents with a gold "approved" seal that stamps onto them. */
export class Invoices {
  constructor(exp) {
    this.exp = exp;
    this.anchor = document.querySelector('[data-gl="invoices"]');
    this.group = new THREE.Group();
    this.tilt = new THREE.Group();
    this.group.add(this.tilt);
    exp.scene.add(this.group);

    const docs = [
      ['e-ARŞİV', 'SZT2026000118'],
      ['GİDER PUSULASI', 'SZT2026000121'],
      ['e-FATURA', 'SZT2026000124'],
      ['e-ARŞİV', 'SZT2026000127'],
      ['e-FATURA', 'SZT2026000131'],
    ];
    const geo = new THREE.PlaneGeometry(1, 1.414);
    const backMat = new THREE.MeshStandardMaterial({ color: '#b9b3a6', roughness: 0.85, envMapIntensity: 0.4 });
    this.sheets = docs.map(([title, no], i) => {
      const g = new THREE.Group();
      const front = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({
          map: invoiceTexture(title, no, i + 3),
          color: '#d8d3c8',
          roughness: 0.78,
          envMapIntensity: 0.45,
        }),
      );
      const back = new THREE.Mesh(geo, backMat);
      back.rotation.y = Math.PI;
      back.position.z = -0.002;
      g.add(front, back);
      this.tilt.add(g);
      return { g, k: i - 2, phase: i * 1.3 };
    });

    // Seal
    this.seal = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.16, 64), goldMaterial());
    disc.rotation.x = Math.PI / 2;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 16, 80), goldMaterial());
    const check = new THREE.Mesh(
      checkGeometry(),
      new THREE.MeshPhysicalMaterial({ color: '#1a1405', metalness: 0.6, roughness: 0.3 }),
    );
    check.position.z = 0.12;
    check.scale.setScalar(1.15);
    this.seal.add(disc, rim, check);
    this.seal.scale.setScalar(0.14);
    this.tilt.add(this.seal);

    this.rotY = -0.4;
    this.rotX = -0.1;
  }

  update({ t, dt }) {
    const a = this.exp.worldRect(this.anchor);
    this.group.visible = a.visible;
    if (!a.visible) return;

    const c = store.edon.center;
    const fan = smoothstep(-0.75, -0.05, c);
    const leave = smoothstep(0.35, 0.9, c);
    const size = Math.min(a.h * 0.42, a.w * 0.34);

    this.group.position.set(a.x, a.y, 0);
    this.group.scale.setScalar(size);

    const m = store.mouse;
    this.rotY = damp(this.rotY, -0.38 + m.x * 0.25 + (1 - fan) * 0.7 - leave * 0.5, 4, dt);
    this.rotX = damp(this.rotX, -0.12 + m.y * 0.15 + (1 - fan) * 0.35, 4, dt);
    this.tilt.rotation.set(this.rotX, this.rotY, 0);

    for (const s of this.sheets) {
      const k = s.k;
      const ak = Math.abs(k);
      s.g.position.set(
        k * 0.44 * fan,
        -ak * 0.07 * fan + Math.sin(t * 0.8 + s.phase) * 0.02 + leave * (0.6 + ak * 0.25),
        (2 - ak) * 0.05 + fan * (2 - ak) * 0.08 + leave * k * 0.2,
      );
      s.g.rotation.set(Math.sin(t * 0.6 + s.phase) * 0.03, k * 0.08 * fan, -k * 0.15 * fan + leave * k * 0.2);
    }

    // Seal stamps onto the centre sheet once the fan is open.
    const drop = clamp((fan - 0.55) / 0.35);
    const e = easeOutBack(drop, 2.2);
    this.seal.visible = drop > 0;
    this.seal.position.set(0.22, -0.42 + (1 - e) * 1.2, 0.42 + (1 - drop) * 1.5);
    this.seal.rotation.set(0, (1 - drop) * Math.PI * 2 + Math.sin(t) * 0.1, -0.2);
    this.seal.scale.setScalar(0.14 * Math.max(0.001, e));
  }
}

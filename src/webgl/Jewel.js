import * as THREE from 'three';
import { store } from '../store.js';
import { damp, easeOutCubic, smoothstep } from '../utils/math.js';
import { goldMaterial } from './materials.js';
import { starTexture } from './textures.js';

function diamondGeometry() {
  const prof = [
    [0.0001, -0.2], [0.1, -0.105], [0.19, 0], [0.19, 0.012], [0.16, 0.05], [0.11, 0.085], [0.0001, 0.085],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.LatheGeometry(prof, 16).toNonIndexed();
  geo.computeVertexNormals();
  return geo;
}

/** Solitaire ring: frames the finale headline, then the camera flies through it. */
export class Jewel {
  constructor(exp) {
    this.exp = exp;
    this.anchor = document.querySelector('[data-gl="jewel"]');
    this.group = new THREE.Group();
    this.pivot = new THREE.Group();
    this.group.add(this.pivot);
    exp.scene.add(this.group);

    const gold = goldMaterial();

    const band = new THREE.Mesh(new THREE.TorusGeometry(1, 0.045, 48, 240), gold);
    band.scale.z = 2.5;
    this.pivot.add(band);

    // Head: basket, prongs, diamond
    const head = new THREE.Group();
    head.position.y = 1.04;
    this.pivot.add(head);

    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.06, 0.1, 32), gold);
    basket.position.y = 0.05;
    head.add(basket);

    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const bottom = new THREE.Vector3(Math.cos(a) * 0.08, 0.03, Math.sin(a) * 0.08);
      const top = new THREE.Vector3(Math.cos(a) * 0.19, 0.29, Math.sin(a) * 0.19);
      const dir = top.clone().sub(bottom);
      const prong = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.014, dir.length(), 10), gold);
      prong.position.copy(bottom).addScaledVector(dir, 0.5);
      prong.quaternion.setFromUnitVectors(up, dir.normalize());
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 12), gold);
      tip.position.copy(top);
      head.add(prong, tip);
    }

    const diamondMat = exp.high
      ? new THREE.MeshPhysicalMaterial({
          color: '#ffffff',
          metalness: 0,
          roughness: 0,
          transmission: 1,
          thickness: 0.5,
          ior: 2.4,
          dispersion: 4,
          specularIntensity: 1,
          envMapIntensity: 2.6,
          flatShading: true,
        })
      : new THREE.MeshPhysicalMaterial({
          color: '#f4f7ff',
          metalness: 1,
          roughness: 0.02,
          envMapIntensity: 2.4,
          flatShading: true,
        });
    this.diamond = new THREE.Mesh(diamondGeometry(), diamondMat);
    this.diamond.position.y = 0.27;
    this.diamond.scale.setScalar(1.05);
    head.add(this.diamond);

    // Sparkles
    const starMat = new THREE.SpriteMaterial({
      map: starTexture(),
      color: new THREE.Color('#fff6dd').multiplyScalar(2),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const spots = [
      [0.12, 1.36, 0.1], [-0.1, 1.28, 0.15], [0.02, 1.4, 0.05],
      [0.72, 0.72, 0.1], [-0.95, -0.25, 0.1], [0.3, -0.95, 0.1],
    ];
    this.sparkles = spots.map(([x, y, z], i) => {
      const s = new THREE.Sprite(starMat.clone());
      s.position.set(x, y, z);
      this.pivot.add(s);
      return { s, speed: 0.9 + Math.random() * 1.4, phase: i * 1.9, size: i < 3 ? 0.34 : 0.22 };
    });

    this.rotX = 1.2;
    this.rotY = -2;
  }

  update({ t, dt }) {
    const a = this.exp.worldRect(this.anchor);
    const f = store.finale;
    this.group.visible = a.visible && f.enter > 0.02;
    if (!this.group.visible) return;

    const arrive = easeOutCubic(smoothstep(0.05, 1, f.enter));
    const fly = smoothstep(0.62, 1, f.p);
    const size = Math.min(a.w, a.h) * 0.4;
    this.group.position.set(a.x, a.y - fly * size * 0.6, fly * fly * 11.5);
    this.group.scale.setScalar(size * (0.6 + arrive * 0.4));

    const m = store.mouse;
    this.rotX = damp(this.rotX, (1 - arrive) * 1.25 + Math.sin(t * 0.4) * 0.05 + m.y * 0.12 - fly * 0.3, 4, dt);
    this.rotY = damp(this.rotY, (1 - arrive) * -2.3 + Math.sin(t * 0.3) * 0.14 + m.x * 0.22, 4, dt);
    this.pivot.rotation.set(this.rotX, this.rotY, Math.sin(t * 0.25) * 0.03);
    this.diamond.rotation.y = t * 0.35;

    for (const sp of this.sparkles) {
      const k = Math.pow(Math.max(0, Math.sin(t * sp.speed + sp.phase)), 14);
      sp.s.material.opacity = k * arrive;
      sp.s.scale.setScalar(sp.size * (0.4 + k * 0.8));
      sp.s.material.rotation = t * 0.5 + sp.phase;
    }
  }
}

import * as THREE from 'three';
import { store } from '../store.js';
import { clamp, damp, easeInOutCubic, lerp, easeOutCubic } from '../utils/math.js';
import { goldMaterial } from './materials.js';
import { glowTexture } from './textures.js';

/**
 * The SZTSOFT "S" mark as a chamfered, bevelled gold extrusion.
 * Coordinates follow the brand mark: a band S with 45° chamfers and slanted terminals.
 */
export function createLogoGeometry({ depth = 1.1, bevel = 0.42 } = {}) {
  const t = 1.5; // stroke thickness
  const c = 1.0; // outer chamfer
  const pts = [
    [6, 8], [c, 8], [0, 8 - c], [0, 4 - t / 2 + c], [c, 4 - t / 2], [6 - t, 4 - t / 2],
    [6 - t, t], [0.5, t], [0, 0], [6 - c, 0], [6, c], [6, 4 + t / 2 - c], [6 - c, 4 + t / 2],
    [t, 4 + t / 2], [t, 8 - t], [5.5, 8 - t],
  ];
  const skew = 0.14;
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x + y * skew, y)));
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.85,
    bevelSegments: 1, // faceted bevel like the brand mark
    curveSegments: 1,
  });
  geo.center();
  geo.scale(1 / 8, 1 / 8, 1 / 8); // ≈ 1 unit tall
  return geo;
}

export class Logo {
  constructor(exp) {
    this.exp = exp;
    this.heroAnchor = document.querySelector('[data-gl="logo"]');
    this.ringAnchor = document.querySelector('[data-gl="logo-ring"]');
    this.modules = document.getElementById('moduller');

    this.group = new THREE.Group();
    this.spin = new THREE.Group();
    this.group.add(this.spin);

    this.mesh = new THREE.Mesh(createLogoGeometry(), goldMaterial());
    this.spin.add(this.mesh);

    // Soft aura behind the mark.
    this.aura = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 2.6),
      new THREE.MeshBasicMaterial({
        map: glowTexture(),
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.aura.position.z = -0.6;
    this.group.add(this.aura);

    // Halo ring floor-light.
    this.halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.003, 8, 160),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffcf4a').multiplyScalar(2.2), transparent: true, opacity: 0.55 }),
    );
    this.halo.rotation.x = Math.PI / 2.25;
    this.halo.position.y = -0.6;
    this.group.add(this.halo);

    this.rotY = 0;
    this.rotX = 0;
    exp.scene.add(this.group);
  }

  update({ t, dt }) {
    const exp = this.exp;
    const a = exp.worldRect(this.heroAnchor);
    const b = exp.worldRect(this.ringAnchor);
    const r = this.modules.getBoundingClientRect();
    const travel = easeInOutCubic(clamp(1 - r.top / exp.height));
    const intro = easeOutCubic(store.intro);

    this.group.visible = a.visible || b.visible;
    if (!this.group.visible) return;

    const heroSize = Math.min(a.h, a.w * 1.2) * 0.64;
    const ringSize = b.h * 0.82;
    const size = lerp(heroSize, ringSize, travel) * (0.25 + 0.75 * intro);

    this.group.position.set(lerp(a.x, b.x, travel), lerp(a.y, b.y, travel), lerp(0, -3.5, travel));
    this.group.scale.setScalar(size);

    // Rotation: idle sway in hero, a full spin while flying, synced to the ring after.
    const m = store.mouse;
    const idle = Math.sin(t * 0.45) * 0.42;
    const ring = THREE.MathUtils.degToRad(store.modules.angle) * 0.6;
    const targetY = lerp(idle + m.x * 0.5, ring, travel) + travel * Math.PI * 2 - (1 - intro) * Math.PI * 1.5;
    const targetX = lerp(-m.y * 0.25 + Math.sin(t * 0.6) * 0.05, 0.12, travel);
    this.rotY = damp(this.rotY, targetY, 5, dt);
    this.rotX = damp(this.rotX, targetX, 5, dt);
    this.spin.rotation.set(this.rotX, this.rotY, Math.sin(t * 0.3) * 0.03);
    this.spin.position.y = Math.sin(t * 1.1) * 0.025;

    this.aura.material.opacity = (0.1 + Math.sin(t * 1.3) * 0.02) * intro * (1 - travel * 0.5);
    this.halo.material.opacity = 0.35 * intro * (1 - travel);
    this.halo.scale.setScalar(1 + Math.sin(t * 1.1) * 0.02);
  }
}

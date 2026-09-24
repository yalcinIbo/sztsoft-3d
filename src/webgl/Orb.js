import * as THREE from 'three';
import { store } from '../store.js';
import { damp } from '../utils/math.js';
import { outputChunk, simplexNoise } from './noise.glsl.js';
import { glowTexture } from './textures.js';

/** Living AI core: noise-displaced sphere with gold fresnel, orbit rings and satellites. */
export class Orb {
  constructor(exp) {
    this.exp = exp;
    this.anchor = document.querySelector('[data-gl="orb"]');
    this.group = new THREE.Group();
    this.core = new THREE.Group();
    this.group.add(this.core);
    exp.scene.add(this.group);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uAmp: { value: 0.12 },
        uEnergy: { value: 0 },
        uDeep: { value: new THREE.Color('#05060c') },
        uGold: { value: new THREE.Color('#ffb21f') },
        uHot: { value: new THREE.Color('#fff0c2') },
        uBlue: { value: new THREE.Color('#3f63ff') },
      },
      vertexShader: /* glsl */ `
        uniform float uTime, uAmp;
        varying vec3 vNormal;
        varying vec3 vView;
        varying float vNoise;
        ${simplexNoise}
        void main() {
          float n = snoise(normal * 1.5 + vec3(0.0, uTime * 0.22, uTime * 0.12));
          float n2 = snoise(normal * 3.6 - uTime * 0.35) * 0.35;
          float disp = (n + n2) * uAmp;
          vNoise = n + n2;
          vec3 p = position + normal * disp;
          vNormal = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vView = -mv.xyz;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime, uEnergy;
        uniform vec3 uDeep, uGold, uHot, uBlue;
        varying vec3 vNormal;
        varying vec3 vView;
        varying float vNoise;
        void main() {
          float fres = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 2.4);
          float bands = 0.5 + 0.5 * sin(vNoise * 7.0 - uTime * 1.6);
          vec3 col = mix(uDeep, uGold * 0.35, smoothstep(-0.5, 0.9, vNoise));
          col += uGold * bands * 0.12 * (0.6 + uEnergy);
          col += mix(uGold, uHot, fres) * fres * (1.8 + uEnergy * 1.5);
          col += uBlue * pow(fres, 5.0) * 0.6;
          gl_FragColor = vec4(col, 1.0);
          ${outputChunk}
        }
      `,
    });
    const detail = exp.high ? 64 : 36;
    this.sphere = new THREE.Mesh(new THREE.IcosahedronGeometry(1, detail), this.material);
    this.core.add(this.sphere);

    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 4.2),
      new THREE.MeshBasicMaterial({
        map: glowTexture(),
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    glow.position.z = -1.2;
    this.glow = glow;
    this.group.add(glow);

    // Orbit rings
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ffd166').multiplyScalar(1.8),
      transparent: true,
      opacity: 0.7,
    });
    this.rings = [1.45, 1.62, 1.8].map((r, i) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0045, 6, 220), ringMat);
      ring.rotation.set(1.2 + i * 0.35, i * 0.8, i * 0.4);
      this.group.add(ring);
      const sat = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 16, 16),
        new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff2c7').multiplyScalar(2.5) }),
      );
      ring.add(sat);
      return { ring, sat, r, speed: 0.5 + i * 0.25, phase: i * 2.1 };
    });

    // Data particles in a torus band
    const count = exp.high ? 700 : 300;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 1.3 + Math.random() * 0.9;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.35;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.particles = new THREE.Points(
      pg,
      new THREE.PointsMaterial({
        color: '#ffcf5a',
        size: 0.05,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.particles.rotation.x = 0.35;
    this.group.add(this.particles);

    this.energy = 0;
  }

  update({ t, dt }) {
    const a = this.exp.worldRect(this.anchor);
    this.group.visible = a.visible;
    if (!a.visible) return;

    const size = Math.min(a.w, a.h) * 0.27;
    this.group.position.set(a.x, a.y, -1);
    this.group.scale.setScalar(size);

    this.energy = damp(this.energy, store.ai.active, 3, dt);
    const u = this.material.uniforms;
    u.uTime.value = t;
    u.uAmp.value = 0.11 + this.energy * 0.14;
    u.uEnergy.value = this.energy;

    const m = store.mouse;
    this.core.rotation.y = t * 0.15 + m.x * 0.3;
    this.core.rotation.x = m.y * 0.2;
    this.core.scale.setScalar(1 + Math.sin(t * 2.2) * 0.015 + this.energy * 0.05);
    this.glow.material.opacity = 0.32 + this.energy * 0.25;

    for (const r of this.rings) {
      r.ring.rotation.z += dt * r.speed * 0.3;
      const ang = t * r.speed + r.phase;
      r.sat.position.set(Math.cos(ang) * r.r, Math.sin(ang) * r.r, 0);
    }
    this.particles.rotation.y = t * 0.12;
  }
}

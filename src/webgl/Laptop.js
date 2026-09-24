import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { store } from '../store.js';
import { damp, easeOutCubic, lerp, smoothstep } from '../utils/math.js';
import { blackGlassMaterial, darkMetalMaterial, goldMaterial, goldSatinMaterial } from './materials.js';
import { outputChunk } from './noise.glsl.js';
import { createLogoGeometry } from './Logo.js';

const W = 1;
const D = 0.68;
const T = 0.032;
const LH = 0.66;
const LT = 0.018;
const SW = 0.93;
const SH = 0.556;

/** Procedural laptop whose lid opens on scroll; the screen cross-fades between product screenshots. */
export class Laptop {
  constructor(exp) {
    this.exp = exp;
    this.anchor = document.querySelector('[data-gl="laptop"]');
    this.textures = exp.screenTextures;

    this.group = new THREE.Group();
    this.pivot = new THREE.Group();
    this.inner = new THREE.Group();
    this.group.add(this.pivot);
    this.pivot.add(this.inner);
    this.inner.position.set(0, -0.2, 0.08);
    exp.scene.add(this.group);

    const alu = darkMetalMaterial();

    // Base
    const base = new THREE.Mesh(new RoundedBoxGeometry(W, T, D, 4, 0.014), alu);
    base.position.y = T / 2;
    this.inner.add(base);

    // Keyboard well + keys
    const well = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.34),
      new THREE.MeshStandardMaterial({ color: '#0b0c10', roughness: 0.7, envMapIntensity: 0.4 }),
    );
    well.rotation.x = -Math.PI / 2;
    well.position.set(0, T + 0.0006, -0.11);
    this.inner.add(well);

    const cols = 14;
    const rows = 5;
    const keyGeo = new THREE.BoxGeometry(0.054, 0.008, 0.05);
    const keyMat = new THREE.MeshStandardMaterial({
      color: '#15171d',
      roughness: 0.55,
      metalness: 0.2,
      emissive: '#ffb800',
      emissiveIntensity: 0.02,
      envMapIntensity: 0.5,
    });
    const keys = new THREE.InstancedMesh(keyGeo, keyMat, cols * rows + 1);
    const m4 = new THREE.Matrix4();
    let n = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        m4.makeTranslation((c - (cols - 1) / 2) * 0.0615, T + 0.004, -0.235 + r * 0.06);
        keys.setMatrixAt(n++, m4);
      }
    }
    m4.makeScale(5.4, 1, 1).setPosition(0, T + 0.004, -0.235 + rows * 0.06);
    keys.setMatrixAt(n, m4);
    this.inner.add(keys);

    const pad = new THREE.Mesh(
      new THREE.PlaneGeometry(0.34, 0.19),
      new THREE.MeshPhysicalMaterial({ color: '#2d3039', metalness: 0.7, roughness: 0.22, clearcoat: 0.6 }),
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(0, T + 0.0006, 0.215);
    this.inner.add(pad);

    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.78, 20), goldSatinMaterial());
    hinge.rotation.z = Math.PI / 2;
    hinge.position.set(0, T + 0.002, -D / 2 + 0.012);
    this.inner.add(hinge);

    // Lid
    this.lid = new THREE.Group();
    this.lid.position.set(0, T, -D / 2 + 0.012);
    this.inner.add(this.lid);

    const lidMesh = new THREE.Mesh(new RoundedBoxGeometry(W, LH, LT, 4, 0.008), [
      alu, alu, alu, alu, blackGlassMaterial(), alu,
    ]);
    lidMesh.position.set(0, LH / 2, -LT / 2);
    this.lid.add(lidMesh);

    this.screenMat = new THREE.ShaderMaterial({
      toneMapped: false,
      uniforms: {
        tA: { value: this.textures[0] },
        tB: { value: this.textures[1] },
        uAspA: { value: 1.8 },
        uAspB: { value: 1.8 },
        uScreenAsp: { value: SW / SH },
        uMix: { value: 0 },
        uPower: { value: 0 },
        uTime: { value: 0 },
        uGold: { value: new THREE.Color('#ffc83d') },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D tA, tB;
        uniform float uAspA, uAspB, uScreenAsp, uMix, uPower, uTime;
        uniform vec3 uGold;
        varying vec2 vUv;
        vec3 fit(sampler2D t, vec2 uv, float ta) {
          vec2 s = ta > uScreenAsp ? vec2(1.0, uScreenAsp / ta) : vec2(ta / uScreenAsp, 1.0);
          vec2 u = (uv - 0.5) / s + 0.5;
          if (u.x < 0.0 || u.x > 1.0 || u.y < 0.0 || u.y > 1.0) return vec3(0.008, 0.008, 0.011);
          return texture2D(t, u).rgb;
        }
        void main() {
          vec3 a = fit(tA, vUv, uAspA);
          vec3 b = fit(tB, vUv, uAspB);
          float d = vUv.x * 0.72 + (1.0 - vUv.y) * 0.28;
          float f = uMix * 1.3 - 0.15;
          float m = smoothstep(f + 0.015, f - 0.015, d);
          float glow = exp(-abs(d - f) * 55.0) * sin(uMix * 3.14159);
          vec3 col = mix(a, b, m) + uGold * glow * 1.6;
          // soft glass reflection + power-on
          col += vec3(0.02) * smoothstep(0.35, 0.0, abs(vUv.x - vUv.y * 0.6 - 0.15));
          float on = smoothstep(0.0, 1.0, uPower);
          float flash = exp(-pow((uPower - 0.35) * 6.0, 2.0)) * 0.25;
          col = col * on * 0.86 + flash * uGold;
          gl_FragColor = vec4(col, 1.0);
          ${outputChunk}
        }
      `,
    });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), this.screenMat);
    screen.position.set(0, LH / 2 + 0.014, 0.0009);
    this.lid.add(screen);

    const cam = new THREE.Mesh(
      new THREE.CircleGeometry(0.0055, 20),
      new THREE.MeshBasicMaterial({ color: '#1a2233' }),
    );
    cam.position.set(0, LH - 0.02, 0.0009);
    this.lid.add(cam);

    const badge = new THREE.Mesh(createLogoGeometry({ depth: 0.2, bevel: 0.1 }), goldMaterial());
    badge.scale.set(0.13, 0.13, 0.05);
    badge.rotation.y = Math.PI;
    badge.position.set(0, LH / 2, -LT - 0.001);
    this.lid.add(badge);

    this.rotX = 0.35;
    this.rotY = -0.3;
    this.open = 0;
  }

  update({ t, dt }) {
    const a = this.exp.worldRect(this.anchor);
    this.group.visible = a.visible;
    if (!a.visible) return;

    const f = store.features;
    const size = Math.min(a.w * (this.exp.width < 900 ? 1 : 0.8), a.h * 1.08);
    this.group.position.set(a.x, a.y, 0);
    this.group.scale.setScalar(size);

    // Lid opens while the section scrolls in.
    this.open = damp(this.open, smoothstep(0.3, 0.92, f.enter), 6, dt);
    const o = easeOutCubic(this.open);
    this.lid.rotation.x = lerp(Math.PI / 2 - 0.015, -0.3, o);

    const u = this.screenMat.uniforms;
    const s = f.screen;
    const i0 = Math.floor(s);
    const i1 = Math.min(i0 + 1, this.textures.length - 1);
    u.tA.value = this.textures[i0];
    u.tB.value = this.textures[i1];
    u.uAspA.value = this.textures[i0].userData.aspect;
    u.uAspB.value = this.textures[i1].userData.aspect;
    u.uMix.value = s - i0;
    u.uPower.value = smoothstep(0.55, 1, this.open);
    u.uTime.value = t;

    const m = store.mouse;
    const nod = Math.sin((s - i0) * Math.PI) * 0.09;
    this.rotY = damp(this.rotY, -0.26 + m.x * 0.18 + nod + (1 - f.enter) * 0.8, 4, dt);
    this.rotX = damp(this.rotX, 0.2 + m.y * 0.08 + (1 - o) * 0.3, 4, dt);
    this.pivot.rotation.set(this.rotX, this.rotY, 0);
    this.pivot.position.y = Math.sin(t * 0.9) * 0.012 - (1 - f.enter) * 0.25;
  }
}

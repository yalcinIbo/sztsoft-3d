import * as THREE from 'three';
import { store } from '../store.js';
import { damp, easeOutCubic, smoothstep } from '../utils/math.js';
import { blackGlassMaterial, goldMaterial, goldSatinMaterial } from './materials.js';
import { outputChunk } from './noise.glsl.js';
import { createLogoGeometry } from './Logo.js';

const PW = 0.486;
const PH = 1.0;
const SH = 0.955;
const SW = SH * (738 / 1600);

function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** A gold-framed smartphone that spins in and swipes through the mobile app screens. */
export class Phone {
  constructor(exp) {
    this.exp = exp;
    this.anchor = document.querySelector('[data-gl="phone"]');
    this.textures = exp.phoneTextures;

    this.group = new THREE.Group();
    this.pivot = new THREE.Group();
    this.group.add(this.pivot);
    exp.scene.add(this.group);

    const bodyGeo = new THREE.ExtrudeGeometry(roundedRectShape(PW - 0.024, PH - 0.024, 0.066), {
      depth: 0.03,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 5,
      curveSegments: 16,
    });
    bodyGeo.center();
    const frame = new THREE.MeshPhysicalMaterial({
      color: '#e9b949',
      metalness: 1,
      roughness: 0.28,
      envMapIntensity: 1.25,
    });
    const body = new THREE.Mesh(bodyGeo, [blackGlassMaterial(), frame]);
    this.pivot.add(body);
    const front = 0.027;

    this.screenMat = new THREE.ShaderMaterial({
      transparent: true,
      toneMapped: false,
      uniforms: {
        tA: { value: this.textures[0] },
        tB: { value: this.textures[1] },
        uMix: { value: 0 },
        uPower: { value: 0 },
        uSheen: { value: 0.5 },
        uSize: { value: new THREE.Vector2(SW, SH) },
        uRadius: { value: 0.052 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D tA, tB;
        uniform float uMix, uPower, uSheen, uRadius;
        uniform vec2 uSize;
        varying vec2 vUv;
        float sdRR(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
        void main() {
          vec2 p = (vUv - 0.5) * uSize;
          float d = sdRR(p, uSize * 0.5, uRadius);
          float aa = fwidth(d);
          float mask = 1.0 - smoothstep(-aa, aa, d);
          float x = vUv.x + uMix;
          vec3 col = x < 1.0 ? texture2D(tA, vec2(x, vUv.y)).rgb : texture2D(tB, vec2(x - 1.0, vUv.y)).rgb;
          float moving = step(0.001, uMix) * step(uMix, 0.999);
          col *= 1.0 - 0.6 * exp(-abs(x - 1.0) * 90.0) * moving;
          col *= smoothstep(0.0, 1.0, uPower);
          col += smoothstep(0.16, 0.0, abs(vUv.x * 0.8 + vUv.y * 0.6 - uSheen)) * 0.05;
          gl_FragColor = vec4(col, mask);
          ${outputChunk}
        }
      `,
    });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), this.screenMat);
    screen.position.z = front + 0.0006;
    this.pivot.add(screen);

    const island = new THREE.Mesh(
      new THREE.ShapeGeometry(roundedRectShape(0.105, 0.03, 0.015), 8),
      new THREE.MeshBasicMaterial({ color: '#000' }),
    );
    island.position.set(0, SH / 2 - 0.028, front + 0.0012);
    this.pivot.add(island);

    // Camera plateau on the back
    const plate = new THREE.Mesh(
      new THREE.ExtrudeGeometry(roundedRectShape(0.19, 0.19, 0.05), {
        depth: 0.008,
        bevelEnabled: true,
        bevelThickness: 0.003,
        bevelSize: 0.003,
        bevelSegments: 3,
      }),
      blackGlassMaterial(),
    );
    plate.position.set(-0.11, 0.36, -front - 0.011);
    this.pivot.add(plate);
    const lensGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.014, 40);
    const lensRing = new THREE.TorusGeometry(0.036, 0.006, 10, 40);
    const lensGlass = new THREE.MeshPhysicalMaterial({ color: '#05070d', metalness: 0.2, roughness: 0.05, clearcoat: 1 });
    [
      [-0.155, 0.405],
      [-0.155, 0.315],
      [-0.07, 0.36],
    ].forEach(([x, y]) => {
      const lens = new THREE.Mesh(lensGeo, lensGlass);
      lens.rotation.x = Math.PI / 2;
      lens.position.set(x, y, -front - 0.019);
      const ring = new THREE.Mesh(lensRing, goldSatinMaterial());
      ring.position.set(x, y, -front - 0.026);
      this.pivot.add(lens, ring);
    });

    const logo = new THREE.Mesh(createLogoGeometry({ depth: 0.2, bevel: 0.1 }), goldMaterial());
    logo.scale.set(0.12, 0.12, 0.04);
    logo.rotation.y = Math.PI;
    logo.position.set(0, -0.02, -front - 0.002);
    this.pivot.add(logo);

    // Side buttons
    const btnGeo = new THREE.BoxGeometry(0.008, 1, 0.014);
    [
      [-PW / 2 - 0.002, 0.24, 0.07],
      [-PW / 2 - 0.002, 0.13, 0.07],
      [PW / 2 + 0.002, 0.2, 0.12],
    ].forEach(([x, y, h]) => {
      const b = new THREE.Mesh(btnGeo, frame);
      b.scale.y = h;
      b.position.set(x, y, 0);
      this.pivot.add(b);
    });

    this.rotY = 0;
    this.rotX = 0;
  }

  update({ t, dt }) {
    const a = this.exp.worldRect(this.anchor);
    this.group.visible = a.visible;
    if (!a.visible) return;

    const p = store.phone;
    const size = Math.min(a.h * 0.8, a.w * 1.35);
    this.group.position.set(a.x, a.y, 0);
    this.group.scale.setScalar(size);

    const arrive = easeOutCubic(smoothstep(0.05, 0.95, p.enter));
    const s = p.screen;
    const i0 = Math.floor(s);
    const i1 = Math.min(i0 + 1, this.textures.length - 1);
    const frac = s - i0;

    const m = store.mouse;
    const swing = Math.sin(frac * Math.PI) * 0.32;
    const targetY = -0.32 + swing + m.x * 0.3 + (1 - arrive) * Math.PI * 2;
    this.rotY = damp(this.rotY, targetY, 5, dt);
    this.rotX = damp(this.rotX, 0.06 + m.y * 0.12, 4, dt);
    this.pivot.rotation.set(this.rotX, this.rotY, Math.sin(t * 0.5) * 0.04 - 0.05);
    this.pivot.position.y = Math.sin(t * 1.05) * 0.015 - (1 - arrive) * 0.3;

    const u = this.screenMat.uniforms;
    u.tA.value = this.textures[i0];
    u.tB.value = this.textures[i1];
    u.uMix.value = frac;
    u.uPower.value = smoothstep(0.35, 0.8, p.enter);
    u.uSheen.value = 0.6 + this.rotY * 0.9;
  }
}

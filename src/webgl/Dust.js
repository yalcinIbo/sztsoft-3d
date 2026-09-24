import * as THREE from 'three';
import { store } from '../store.js';
import { damp } from '../utils/math.js';

/** Golden dust: fills the whole page depth and drifts with scroll parallax. */
export class Dust {
  constructor(exp) {
    this.exp = exp;
    const count = exp.high ? 1600 : 650;
    const pos = new Float32Array(count * 3);
    const scale = new Float32Array(count);
    const speed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = -14 + Math.random() * 19;
      scale[i] = Math.pow(Math.random(), 2.2) * 1.0 + 0.2;
      speed[i] = 0.3 + Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aScale', new THREE.BufferAttribute(scale, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uScroll: { value: 0 },
        uSize: { value: 70 * exp.pixelRatio },
        uIntro: { value: 0 },
        uColor: { value: new THREE.Color('#ffc94d') },
      },
      vertexShader: /* glsl */ `
        uniform float uTime, uScroll, uSize, uIntro;
        attribute float aScale, aSpeed;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          float depth = (p.z + 14.0) / 19.0;              // 0 far → 1 near
          p.y += uScroll * (0.6 + depth * 2.4) + uTime * 0.06 * aSpeed;
          p.y = mod(p.y + 10.0, 20.0) - 10.0;
          p.x += sin(uTime * 0.25 * aSpeed + p.y * 0.8) * 0.18;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uSize * aScale / -mv.z;
          float tw = 0.55 + 0.45 * sin(uTime * (1.2 + aSpeed) + aSpeed * 40.0);
          vAlpha = tw * uIntro * smoothstep(0.0, 0.25, depth);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          a *= a;
          gl_FragColor = vec4(uColor * 1.6, a * vAlpha * 0.85);
        }
      `,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    exp.scene.add(this.points);
    this.scroll = 0;
  }

  update({ t, dt }) {
    const u = this.material.uniforms;
    u.uTime.value = t;
    this.scroll = damp(this.scroll, store.scrollY / this.exp.height, 8, dt);
    u.uScroll.value = this.scroll;
    u.uIntro.value = store.intro;
  }
}

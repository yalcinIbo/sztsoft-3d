import * as THREE from 'three';
import { store } from '../store.js';
import { outputChunk } from './noise.glsl.js';

/** Full-screen gradient "studio" behind everything; hues drift with scroll. */
export class Backdrop {
  constructor(exp) {
    this.exp = exp;
    this.material = new THREE.ShaderMaterial({
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uTime: { value: 0 },
        uScroll: { value: 0 },
        uAspect: { value: exp.width / exp.height },
        uBase: { value: new THREE.Color('#05070c') },
        uGold: { value: new THREE.Color('#6b4a0c') },
        uBlue: { value: new THREE.Color('#0d1d3d') },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.9999, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime, uScroll, uAspect;
        uniform vec3 uBase, uGold, uBlue;
        varying vec2 vUv;
        float blob(vec2 p, vec2 c, float s) { vec2 d = p - c; return exp(-dot(d, d) * s); }
        void main() {
          vec2 p = vUv - 0.5;
          p.x *= uAspect;
          float s = uScroll;
          vec2 c1 = vec2(0.35 * uAspect * cos(s * 0.9) + sin(uTime * 0.11) * 0.08, 0.12 + 0.18 * sin(s * 0.7) + cos(uTime * 0.13) * 0.05);
          vec2 c2 = vec2(-0.4 * uAspect * cos(s * 0.6 + 1.0) + cos(uTime * 0.09) * 0.1, -0.2 + 0.15 * cos(s * 0.5));
          vec3 col = uBase;
          col += uGold * blob(p, c1, 3.6) * 0.26;
          col += uBlue * blob(p, c2, 2.6) * 0.55;
          float vig = smoothstep(1.25, 0.2, length(p * vec2(0.9, 1.2)));
          col *= mix(0.55, 1.0, vig);
          gl_FragColor = vec4(col, 1.0);
          ${outputChunk}
        }
      `,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;
    exp.scene.add(this.mesh);
  }

  resize() {
    this.material.uniforms.uAspect.value = this.exp.width / this.exp.height;
  }

  update({ t }) {
    const u = this.material.uniforms;
    u.uTime.value = t;
    u.uScroll.value = store.scrollY / this.exp.height / 3;
  }
}

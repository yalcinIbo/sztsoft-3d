import * as THREE from 'three';
import { store } from '../store.js';
import { damp } from '../utils/math.js';
import { outputChunk } from './noise.glsl.js';

const toVec = (lat, lon, r = 1) => {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);
  return new THREE.Vector3(-Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)).multiplyScalar(r);
};

/** Dotted data globe with a SZTSOFT hub in Türkiye and animated integration arcs. */
export class Globe {
  constructor(exp) {
    this.exp = exp;
    this.anchor = document.querySelector('[data-gl="globe"]');
    this.group = new THREE.Group();
    this.world = new THREE.Group();
    this.group.add(this.world);
    exp.scene.add(this.group);

    // Occluding core
    this.world.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(0.985, 64, 64),
        new THREE.MeshPhysicalMaterial({ color: '#070a12', roughness: 0.55, metalness: 0.4, envMapIntensity: 0.35 }),
      ),
    );

    // Latitude-ring dots
    const step = exp.high ? 2.4 : 3.4;
    const perRing = exp.high ? 150 : 100;
    const pos = [];
    const rnd = [];
    for (let lat = -84; lat <= 84; lat += step) {
      const n = Math.max(6, Math.floor(Math.cos(THREE.MathUtils.degToRad(lat)) * perRing));
      for (let i = 0; i < n; i++) {
        const v = toVec(lat, (i / n) * 360, 1.004);
        pos.push(v.x, v.y, v.z);
        rnd.push(Math.random());
      }
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    dg.setAttribute('aRnd', new THREE.Float32BufferAttribute(rnd, 1));
    this.dotMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 26 * exp.pixelRatio },
        uColor: { value: new THREE.Color('#e7b84a') },
        uHot: { value: new THREE.Color('#fff1c1') },
      },
      vertexShader: /* glsl */ `
        uniform float uTime, uSize;
        attribute float aRnd;
        varying float vA;
        varying float vHot;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vec3 n = normalize(normalMatrix * position);
          float facing = dot(n, normalize(-mv.xyz));
          vHot = step(0.985, aRnd) * (0.5 + 0.5 * sin(uTime * 2.0 + aRnd * 100.0));
          vA = smoothstep(-0.1, 0.6, facing) * (0.35 + 0.35 * aRnd) + vHot;
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uSize * (1.0 + vHot * 1.5) / -mv.z;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor, uHot;
        varying float vA;
        varying float vHot;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          gl_FragColor = vec4(mix(uColor, uHot * 2.0, vHot), vA * smoothstep(0.5, 0.2, d));
          ${outputChunk}
        }
      `,
    });
    this.world.add(new THREE.Points(dg, this.dotMat));

    // Atmosphere
    this.world.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(1.16, 64, 64),
        new THREE.ShaderMaterial({
          side: THREE.BackSide,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          uniforms: { uColor: { value: new THREE.Color('#ffb52e') } },
          vertexShader: /* glsl */ `
            varying vec3 vN;
            void main() { vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
          `,
          fragmentShader: /* glsl */ `
            uniform vec3 uColor;
            varying vec3 vN;
            void main() {
              float i = pow(clamp(-dot(vN, vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 1.4);
              gl_FragColor = vec4(uColor * 1.2, i * 0.55);
              ${outputChunk}
            }
          `,
        }),
      ),
    );

    // Hub + partners
    const hub = toVec(39, 35, 1.01); // Türkiye
    const partners = [toVec(58, -8, 1.01), toVec(8, 62, 1.01), toVec(62, 72, 1.01)];
    const ambient = [
      toVec(40, -74), toVec(51, 0), toVec(25, 55), toVec(35, 139), toVec(-23, -46),
      toVec(1, 103), toVec(55, 37), toVec(-33, 151), toVec(30, 31),
    ].map((v) => v.multiplyScalar(1.01));

    const nodeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe08a').multiplyScalar(2.2) });
    const pulseMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ffc83d').multiplyScalar(1.6),
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.pulses = [];
    const addNode = (v, s) => {
      const node = new THREE.Mesh(new THREE.SphereGeometry(0.022 * s, 16, 16), nodeMat);
      node.position.copy(v);
      const pulse = new THREE.Mesh(new THREE.RingGeometry(0.03 * s, 0.038 * s, 48), pulseMat.clone());
      pulse.position.copy(v);
      pulse.lookAt(v.clone().multiplyScalar(2));
      this.world.add(node, pulse);
      this.pulses.push({ pulse, s, phase: Math.random() * 3 });
    };
    addNode(hub, 1.6);
    partners.forEach((p) => addNode(p, 1.15));

    this.arcs = [];
    const addArc = (a, b, bright, offset) => {
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const lift = 1 + a.distanceTo(b) * 0.55;
      mid.normalize().multiplyScalar(lift);
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uOffset: { value: offset },
          uSpeed: { value: bright ? 0.42 : 0.25 },
          uBase: { value: bright ? 0.22 : 0.07 },
          uColor: { value: new THREE.Color(bright ? '#ffd35c' : '#b88a2c') },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime, uOffset, uSpeed, uBase;
          uniform vec3 uColor;
          varying vec2 vUv;
          void main() {
            float head = fract(uTime * uSpeed + uOffset) * 1.4 - 0.2;
            float d = head - vUv.x;
            float trail = smoothstep(0.3, 0.0, d) * step(0.0, d);
            float a = uBase + trail;
            gl_FragColor = vec4(uColor * (1.0 + trail * 2.5), a);
            ${outputChunk}
          }
        `,
      });
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, bright ? 0.0055 : 0.0035, 6), mat);
      this.world.add(tube);
      this.arcs.push(mat);
    };
    partners.forEach((p, i) => {
      addArc(hub, p, true, i * 0.33);
      addArc(p, hub, true, i * 0.33 + 0.5);
    });
    ambient.forEach((p, i) => addArc(hub, p, false, i * 0.17));

    // Orbit ring
    this.orbit = new THREE.Mesh(
      new THREE.TorusGeometry(1.42, 0.003, 6, 240),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd166').multiplyScalar(1.4), transparent: true, opacity: 0.5 }),
    );
    this.orbit.rotation.set(1.25, 0.25, 0);
    this.group.add(this.orbit);
    this.sat = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 16), nodeMat);
    this.orbit.add(this.sat);

    // Face the hub towards the viewer.
    this.baseQuat = new THREE.Quaternion().setFromUnitVectors(hub.clone().normalize(), new THREE.Vector3(0.15, 0.35, 1).normalize());
    this.spinQuat = new THREE.Quaternion();
    this.yaw = 0;
  }

  update({ t, dt }) {
    const a = this.exp.worldRect(this.anchor);
    this.group.visible = a.visible;
    if (!a.visible) return;

    const size = Math.min(a.w, a.h) * 0.4;
    this.group.position.set(a.x, a.y, 0);
    this.group.scale.setScalar(size);

    const m = store.mouse;
    this.yaw = damp(this.yaw, Math.sin(t * 0.18) * 0.5 + m.x * 0.4 + store.globe.center * 0.8, 3, dt);
    this.spinQuat.setFromEuler(new THREE.Euler(m.y * 0.15, this.yaw, 0));
    this.world.quaternion.copy(this.spinQuat).multiply(this.baseQuat);

    this.dotMat.uniforms.uTime.value = t;
    for (const arc of this.arcs) arc.uniforms.uTime.value = t;
    for (const p of this.pulses) {
      const k = (t * 0.8 + p.phase) % 1;
      p.pulse.scale.setScalar(1 + k * 2.2);
      p.pulse.material.opacity = (1 - k) * 0.9;
    }
    this.orbit.rotation.z = t * 0.2;
    const ang = t * 0.6;
    this.sat.position.set(Math.cos(ang) * 1.42, Math.sin(ang) * 1.42, 0);
  }
}

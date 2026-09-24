import * as THREE from 'three';

/**
 * Jewellery-style studio: a dark dome with a few HDR softboxes, so polished gold
 * shows deep tones with crisp moving highlights instead of a flat yellow.
 */
export function createStudioEnvironment(renderer) {
  const scene = new THREE.Scene();

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(30, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTop: { value: new THREE.Color('#9a8566') },
        uMid: { value: new THREE.Color('#4a3f33') },
        uBottom: { value: new THREE.Color('#121016') },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uTop, uMid, uBottom;
        varying vec3 vDir;
        void main() {
          float y = vDir.y;
          vec3 c = y > 0.0 ? mix(uMid, uTop, smoothstep(0.0, 0.9, y)) : mix(uMid, uBottom, smoothstep(0.0, -0.6, y));
          gl_FragColor = vec4(c, 1.0);
        }
      `,
    }),
  );
  scene.add(dome);

  const geo = new THREE.PlaneGeometry(1, 1);
  const panel = (color, intensity, w, h, pos) => {
    const m = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }),
    );
    m.scale.set(w, h, 1);
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };

  panel('#fff4e0', 1.6, 18, 9, [0, 1, 15]); // big soft front fill (camera side)
  panel('#ffffff', 3.2, 9, 2.2, [0, 9, 5]); // overhead softbox
  panel('#fff3dc', 2.6, 2.2, 12, [-11, 1, 4]); // left strip
  panel('#ffe6ba', 2.4, 2.2, 12, [11, 0, 2]); // right strip
  panel('#ffd48a', 2.2, 5, 5, [6, 5, 10]); // warm key
  panel('#ffffff', 1.6, 14, 1.4, [0, -7, 8]); // floor kicker
  panel('#9fb6ff', 1.2, 8, 8, [-3, 3, -12]); // cool back fill
  panel('#fff7e6', 3, 1.2, 1.2, [-5, 6, 9]); // small sparkle source

  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(scene, 0.035).texture;
  pmrem.dispose();
  scene.traverse((o) => {
    o.geometry?.dispose();
    o.material?.dispose();
  });
  return tex;
}

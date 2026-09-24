import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { store } from '../store.js';
import { damp } from '../utils/math.js';
import { createStudioEnvironment } from './environment.js';

import { Backdrop } from './Backdrop.js';
import { Dust } from './Dust.js';
import { Logo } from './Logo.js';
import { Treasures } from './Treasures.js';
import { Invoices } from './Invoices.js';
import { Laptop } from './Laptop.js';
import { Phone } from './Phone.js';
import { Orb } from './Orb.js';
import { Globe } from './Globe.js';
import { Jewel } from './Jewel.js';
import { PHONE_SCREENS, SCREENS } from '../content.js';

export class Experience {
  constructor({ canvas, quality = 'high', onProgress, onLoad }) {
    this.canvas = canvas;
    this.quality = quality;
    this.high = quality === 'high';
    this.time = 0;
    this.ready = false;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !this.high,
      alpha: false,
      stencil: false,
      powerPreference: 'high-performance',
    });
    if (!this.renderer.getContext()) throw new Error('WebGL unavailable');
    this.pixelRatio = Math.min(window.devicePixelRatio, this.high ? 1.75 : 1.5);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#06080e');

    this.camera = new THREE.PerspectiveCamera(30, this.width / this.height, 0.1, 80);
    this.camera.position.set(0, 0, 14);
    this.cameraTarget = new THREE.Vector3();

    // Studio reflections for all the gold.
    this.scene.environment = createStudioEnvironment(this.renderer);
    this.scene.environmentIntensity = 1.0;

    const key = new THREE.DirectionalLight('#ffe3b3', 2.4);
    key.position.set(5, 6, 8);
    const rim = new THREE.DirectionalLight('#7f9dff', 1.4);
    rim.position.set(-6, 2, -6);
    const fill = new THREE.DirectionalLight('#ffb44d', 0.8);
    fill.position.set(-4, -5, 6);
    this.scene.add(key, rim, fill);

    // Post-processing (desktop only): MSAA target + subtle bloom on specular gold.
    if (this.high) {
      const rt = new THREE.WebGLRenderTarget(this.width, this.height, {
        type: THREE.HalfFloatType,
        samples: 4,
      });
      this.composer = new EffectComposer(this.renderer, rt);
      this.composer.setPixelRatio(this.pixelRatio);
      this.composer.setSize(this.width, this.height);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(this.width, this.height), 0.32, 0.55, 0.92);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    }

    // Loading
    this.manager = new THREE.LoadingManager();
    this.manager.onProgress = (_url, loaded, total) => onProgress?.(loaded / total);
    this.manager.onLoad = () => onLoad?.();
    this.textureLoader = new THREE.TextureLoader(this.manager);

    this.screenTextures = SCREENS.map((src) => this.loadTexture(src));
    this.phoneTextures = PHONE_SCREENS.map((src) => this.loadTexture(src));

    // World
    this.items = [
      (this.backdrop = new Backdrop(this)),
      (this.dust = new Dust(this)),
      (this.logo = new Logo(this)),
      (this.treasures = new Treasures(this)),
      (this.invoices = new Invoices(this)),
      (this.laptop = new Laptop(this)),
      (this.phone = new Phone(this)),
      (this.orb = new Orb(this)),
      (this.globe = new Globe(this)),
      (this.jewel = new Jewel(this)),
    ];

    this.updateViewSize();
    window.addEventListener('resize', () => this.resize());
  }

  loadTexture(src) {
    const tex = this.textureLoader.load(src, (t) => {
      t.userData.aspect = t.image.width / t.image.height;
    });
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, this.maxAnisotropy);
    tex.userData.aspect = 1.8;
    return tex;
  }

  updateViewSize() {
    // World-units visible at z = 0 for the DOM ↔ WebGL mapping.
    const dist = this.camera.position.z;
    this.viewH = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * dist;
    this.viewW = this.viewH * this.camera.aspect;
    this.pxToWorld = this.viewH / this.height;
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height, false);
    this.composer?.setSize(this.width, this.height);
    this.updateViewSize();
    this.items.forEach((i) => i.resize?.());
  }

  /** Maps a DOM element's box to world coordinates on the z = 0 plane. */
  worldRect(el) {
    const r = el.getBoundingClientRect();
    const k = this.pxToWorld;
    return {
      x: (r.left + r.width / 2 - this.width / 2) * k,
      y: -(r.top + r.height / 2 - this.height / 2) * k,
      w: r.width * k,
      h: r.height * k,
      visible: r.bottom > -this.height * 0.35 && r.top < this.height * 1.35 && r.width > 0,
    };
  }

  update(dt) {
    this.time += dt;
    const ctx = { dt, t: this.time };

    // Gentle camera parallax driven by the pointer.
    const m = store.mouse;
    this.camera.position.x = damp(this.camera.position.x, m.x * 0.35, 3, dt);
    this.camera.position.y = damp(this.camera.position.y, -m.y * 0.25, 3, dt);
    this.camera.lookAt(this.cameraTarget);

    for (const item of this.items) item.update(ctx);
  }

  /**
   * Compiles every program (with the same render-target state used at runtime) and uploads
   * textures up front, so scrolling into a new section never stalls on shader compilation.
   */
  async warmup() {
    const target = this.composer ? this.composer.readBuffer : null;
    this.renderer.setRenderTarget(target);
    try {
      await this.renderer.compileAsync(this.scene, this.camera);
    } catch (err) {
      console.warn('[SZTSOFT] shader warmup', err);
    }
    this.renderer.setRenderTarget(null);
    for (const t of [...this.screenTextures, ...this.phoneTextures]) this.renderer.initTexture(t);
    // One real frame with everything visible compiles the remaining post-processing / transmission variants.
    const hidden = [];
    this.scene.traverse((o) => {
      if (o !== this.scene && !o.visible) {
        hidden.push(o);
        o.visible = true;
      }
    });
    this.render();
    hidden.forEach((o) => (o.visible = false));
    this.ready = true;
  }

  render() {
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }
}

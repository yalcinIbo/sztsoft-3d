import * as THREE from 'three';

let gold, goldSatin, darkMetal, blackGlass;

/** Polished jewellery gold. */
export function goldMaterial() {
  return (gold ??= new THREE.MeshPhysicalMaterial({
    color: '#f7c75a',
    metalness: 1,
    roughness: 0.13,
    envMapIntensity: 1.5,
  }));
}

/** Brushed / satin gold for secondary pieces. */
export function goldSatinMaterial() {
  return (goldSatin ??= new THREE.MeshPhysicalMaterial({
    color: '#e8b43c',
    metalness: 1,
    roughness: 0.34,
    envMapIntensity: 1.2,
  }));
}

/** Dark anodised aluminium (laptop / phone frames). */
export function darkMetalMaterial() {
  return (darkMetal ??= new THREE.MeshPhysicalMaterial({
    color: '#1d2027',
    metalness: 0.8,
    roughness: 0.34,
    envMapIntensity: 0.65,
  }));
}

/** Glossy black glass (bezels, phone back). */
export function blackGlassMaterial() {
  return (blackGlass ??= new THREE.MeshPhysicalMaterial({
    color: '#07080b',
    metalness: 0.3,
    roughness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 0.9,
  }));
}

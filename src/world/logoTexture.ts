import * as THREE from 'three';
import { type CompanyLogo, logoUrl } from '../company/logo';

/** The same PNG used in the editor and Mission Patches, with colours kept in sRGB. */
export function logoTexture(logo: CompanyLogo): THREE.Texture {
  const texture = new THREE.TextureLoader().load(logoUrl(logo));
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

"use client";

export interface SceneLoadingEventDetail {
  sceneTitle?: string;
  progress?: number;
  label?: string;
}

/**
 * Dinonaktifkan atas permintaan pengguna: seluruh pemuatan halaman & ruang 3D
 * memakai layar penuh matriks titik-titik kecil (VanishingPageTransition).
 */
export function ViewportCurtainLoader() {
  return null;
}

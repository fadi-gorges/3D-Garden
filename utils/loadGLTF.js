import { enableShadows } from "./enableShadows.js";

export const loadGLTF = async (loader, url, name) => {
  // Load a GLTF model
  return new Promise((resolve) => {
    loader.load(url, (geometry) => {
      geometry.scene.name = name;
      geometry.scene.userData = { objectParent: true };
      enableShadows(geometry.scene);
      resolve(geometry.scene);
    });
  });
};

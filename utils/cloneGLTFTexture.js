export const cloneGLTFTexture = (scene) => {
  // Clone the textures of a GLTF model
  scene.traverse((o) => {
    if (o.isMesh) {
      let userData = o.material.userData;
      o.material = o.material.clone();
      o.material.userData = userData;
    }
  });
};

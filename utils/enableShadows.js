export const enableShadows = (scene) => {
  // Enable shadows for a GLTF model
  scene.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true
    }
  })
}

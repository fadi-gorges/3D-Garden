import * as dat from 'dat.gui'
import * as THREE from 'three'
// @ts-ignore
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
// @ts-ignore
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { cloneGLTFTexture } from './utils/cloneGLTFTexture.js'
import { loadGLTF } from './utils/loadGLTF.js'

class App {
  constructor() {
    this.init()
  }

  async init() {
    // Create a renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
    })
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(window.innerWidth, window.innerHeight)

    document.body.appendChild(this.renderer.domElement)

    // Trigger onWindowResize when the window is resized
    window.addEventListener(
      'resize',
      () => {
        this.onWindowResize()
      },
      false
    )

    // Create a camera and scene
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000)
    this.camera.position.set(5, 2, 0)
    this.raycaster = new THREE.Raycaster()

    this.scene = new THREE.Scene()

    // Create a GUI
    this.guiControls = {
      time: 0,
      planeWidth: 1,
      planeHeight: 1,
      editMode: 'move',
    }

    this.gui = new dat.GUI()
    this.gui.add(this.guiControls, 'time', 0, 1).name('Time')
    this.gui.add(this.guiControls, 'planeWidth', 1, 2).name('Plane Width')
    this.gui.add(this.guiControls, 'planeHeight', 1, 2).name('Plane Height')
    this.gui.add(this.guiControls, 'editMode', ['move', 'clone']).name('Edit Mode')

    // Create skybox
    var skyboxMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color('skyblue'),
      side: THREE.BackSide,
    })
    this.skybox = new THREE.Mesh(new THREE.BoxGeometry(1000, 1000, 1000), skyboxMaterial)
    this.scene.add(this.skybox)

    // Create lights
    this.dirLight = new THREE.DirectionalLight(0xffffff, 2)
    this.dirLightCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0, -5),
      new THREE.Vector3(0, 5, 0),
      new THREE.Vector3(0, 0, 5)
    )
    this.dirLight.position.set(0, 0, -5)
    this.dirLight.target.position.set(0, 0, 0)
    this.dirLight.castShadow = true
    this.dirLight.shadow.mapSize.width = 512
    this.dirLight.shadow.mapSize.height = 512
    this.scene.add(this.dirLight)

    this.ambLight = new THREE.AmbientLight(0xffffff, 0.1)
    this.scene.add(this.ambLight)

    // Create orbit controls
    const controls = new OrbitControls(this.camera, this.renderer.domElement)
    controls.target.set(0, 0, 0)
    controls.update()

    // List to store all interactable objects in the scene
    this.objects = []
    this.selectedObject = null

    // Create loaders
    this.gltfLoader = new GLTFLoader()
    this.textureLoader = new THREE.TextureLoader()

    // Load models
    await this.loadModels()

    // Create grass plane
    let grassTexture = this.textureLoader.load('assets/textures/grass.jpg')
    grassTexture.wrapS = THREE.RepeatWrapping
    grassTexture.wrapT = THREE.RepeatWrapping
    grassTexture.repeat = new THREE.Vector2(10, 10)
    let grassMaterial = new THREE.MeshStandardMaterial({
      map: grassTexture,
      side: THREE.DoubleSide,
    })
    this.plane = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), grassMaterial)
    this.plane.receiveShadow = true
    this.plane.rotation.x = -Math.PI / 2
    this.scene.add(this.plane)

    // Place objects to create scene
    this.placeFences()
    this.placeTrees()
    this.placeTiles()
    this.placeLamps()

    // Add event listeners
    window.addEventListener('mousedown', this.onMouseDown.bind(this))
    window.addEventListener('mousemove', this.onMouseMove.bind(this))
    window.addEventListener('keydown', (event) => this.onKeyDown(event))

    // Start the render loop
    this.previousRaf = null
    this.raf()
  }

  async loadModels() {
    // Load GLTF models
    this.fenceModel = await loadGLTF(this.gltfLoader, 'assets/models/fence/scene.gltf', 'fence')
    this.fenceModel.scale.set(0.0075, 0.0075, 0.0075)
    this.treeModel = await loadGLTF(this.gltfLoader, 'assets/models/tree/scene.gltf', 'tree')
    this.treeModel.scale.set(0.002, 0.002, 0.002)
    this.tilesModel = await loadGLTF(this.gltfLoader, 'assets/models/tiles/scene.gltf', 'tiles')
    this.tilesModel.scale.set(0.025, 0.025, 0.025)
    this.lampModel = await loadGLTF(this.gltfLoader, 'assets/models/lamp/scene.gltf', 'lamp')
    this.lampModel.scale.set(0.05, 0.05, 0.05)
  }

  placeFences() {
    // Create fences surrounding the scene
    let fenceGroup = new THREE.Group()

    for (let i = 0; i < 17; i++) {
      let fence = this.fenceModel.clone()
      fence.position.set(2.5, 0, (5 / 17) * i - 2.37)
      fenceGroup.add(fence)
    }

    let sides = [1, 2, 0.5, -0.5]

    for (let i = 0; i < 4; i++) {
      let fenceGroupClone = fenceGroup.clone()
      fenceGroupClone.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), Math.PI * sides[i])
      this.scene?.add(fenceGroupClone)
      fenceGroupClone.children.forEach((fence) => {
        this.objects?.push(fence)
      })
    }
  }

  placeTrees() {
    // Create trees randomly placed in the scene
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 50; j++) {
        let tree = this.treeModel.clone()
        cloneGLTFTexture(tree)

        tree.position.set(Math.random() * 5 - 2.5, 0, Math.random() * 1.85 - (i === 0 ? -0.65 : 2.45))
        this.scene?.add(tree)
        this.objects?.push(tree)
      }
    }
  }

  placeTiles() {
    // Create tile path in the scene
    for (let i = -1; i < 2; i++) {
      if (i === 0) continue

      for (let j = 0; j < 40; j++) {
        let tile = this.tilesModel.clone()
        cloneGLTFTexture(tile)
        tile.position.set(-2.45 + (5 / 40) * j, 0.001, 0 + (5 / 40 / 2) * i)
        this.scene?.add(tile)
        this.objects?.push(tile)
      }
    }
  }

  placeLamps() {
    // Create lamps in the scene
    for (let i = -1; i < 2; i++) {
      if (i === 0) continue

      for (let j = 0; j < 6; j++) {
        let lampGroup = new THREE.Group()
        lampGroup.userData = { objectParent: true }

        let lamp = this.lampModel.clone()
        lamp.userData.objectParent = false
        cloneGLTFTexture(lamp)
        lamp.position.set(0, -0.1, 0)

        let pointLight = new THREE.PointLight(0xffffff, 0.5, 1.5)
        pointLight.position.set(0, 1, 0)
        lampGroup.add(pointLight)

        lampGroup.position.set(-2.1 + (5 / 24) * i + (5 / 6) * j, 0, 0 + 0.2 * i)
        lampGroup.add(lamp)
        this.scene?.add(lampGroup)
        this.objects?.push(lampGroup)
      }
    }
  }

  onMouseDown(event) {
    // Select and deselect objects when clicked
    if (!this.objects || !this.plane) return

    this.raycastMouse(event)
    let intersectsObject = this.raycaster?.intersectObjects(this.objects)
    let intersectsPlane = this.raycaster?.intersectObject(this.plane)

    if (event.button === 0) {
      if (intersectsObject && intersectsObject.length > 0 && !this.selectedObject) {
        this.selectObject(intersectsObject[0].object)
      } else if (intersectsPlane && intersectsPlane.length > 0) {
        if (this.guiControls?.editMode === 'move') this.deselectObject()
        else if (this.guiControls?.editMode === 'clone') this.cloneSelectedObject(intersectsPlane[0].point)
      }
    } else if (event.button === 2) this.deselectObject()
  }

  onMouseMove(event) {
    // Move the selected object when the mouse is moved
    if (!this.selectedObject || !this.plane) return

    this.raycastMouse(event)
    let intersects = this.raycaster?.intersectObject(this.plane)

    if (intersects && intersects.length > 0) {
      intersects[0].point.y = 0.001
      this.selectedObject.position.copy(intersects[0].point)
    }
  }

  onKeyDown(event) {
    // Rotate the selected object when the arrow keys are pressed
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
      this.selectedObject.rotateY(event.key === 'ArrowLeft' ? 0.1 : -0.1)
    // Toggle between move and clone mode when the "e" key is pressed
    else if (event.key === 'e' && this.guiControls) {
      this.deselectObject()
      this.guiControls.editMode = this.guiControls.editMode === 'move' ? 'clone' : 'move'
      this.gui?.updateDisplay()
    }
  }

  selectObject(obj) {
    // Select an object, clone it if editMode is clone and color it red
    obj = this.getParent(obj)
    if (this.guiControls?.editMode === 'clone') {
      obj = obj.clone()
      cloneGLTFTexture(obj)
    }

    this.selectedObject = obj
    this.selectedObject.removeFromParent()
    this.scene?.add(this.selectedObject)
    this.setColor(this.selectedObject, new THREE.Color('red'))
  }

  deselectObject() {
    // Deselect an object and reset its color
    if (!this.selectedObject) return

    if (this.guiControls?.editMode === 'clone') {
      this.scene?.remove(this.selectedObject)
    }

    this.resetColor(this.selectedObject)
    this.selectedObject = null
  }

  cloneSelectedObject(point) {
    // Clone the selected object and place it at the given point
    let object = this.selectedObject.clone()
    cloneGLTFTexture(object)
    this.resetColor(object)
    object.position.copy(point)
    this.scene?.add(object)
    this.objects?.push(object)
  }

  onWindowResize() {
    // Resize the renderer when the window is resized
    if (!this.camera) return

    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer?.setSize(window.innerWidth, window.innerHeight)
  }

  raf() {
    // Render loop
    requestAnimationFrame((t) => {
      if (!this.previousRaf) {
        this.previousRaf = t
      }

      if (!this.scene || !this.camera) return
      this.update(t - this.previousRaf)
      this.renderer?.render(this.scene, this.camera)
      this.previousRaf = t
      this.raf()
    })
  }

  update(timeDelta) {
    // Update the scene based on the GUI controls
    if (!this.guiControls || !this.dirLight || !this.plane || !this.dirLightCurve) return

    let time = 1 - Math.abs(this.guiControls.time - 0.5) * 2
    this.skybox?.material.color.set(`hsl(197, ${100 * time}%, ${70 * time}%)`)
    this.dirLight.intensity = time * 2.5

    this.dirLight.position.copy(this.dirLightCurve.getPointAt(this.guiControls.time))

    this.plane.scale.x = this.guiControls.planeWidth
    this.plane.scale.y = this.guiControls.planeHeight
  }

  raycastMouse(event) {
    // Raycast from the mouse position
    if (!this.camera) return

    let mouse = new THREE.Vector2()
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
    this.raycaster?.setFromCamera(mouse, this.camera)
  }

  getParent(obj) {
    // Get the top parent object of an object
    let object = obj

    while (true) {
      if (object.userData.objectParent) return object
      object = object.parent
    }
  }

  setColor(obj, color) {
    // Set the color of an object and store its previous color
    obj.traverse((o) => {
      if (o.material) {
        o.material.userData = { previousColor: o.material.color }
        o.material.color = color
      }
    })
  }

  resetColor(obj) {
    // Reset the color of an object to its previous color
    obj.traverse((o) => {
      if (o.material) {
        o.material.color = o.material.userData.previousColor
      }
    })
  }
}

let APP

window.addEventListener('DOMContentLoaded', () => {
  APP = new App()
})

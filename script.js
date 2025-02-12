import * as THREE from "three";
import { GLTFLoader } from "GLTFLoader";

let width = window.innerWidth;
let height = window.innerHeight;

const canvas = document.querySelector("#canvas");
const btnS = document.querySelector("#S");
const btnC = document.querySelector("#C");
const btnX = document.querySelector("#X");
btnC.style.display = "none";
btnX.style.display = "none";

let session, sessionActive, webXrSupported;
sessionActive = webXrSupported = false;

let renderer, camera, scene, XR;
let reticle, reticleG, reticleM, controller;

let shapes, size, mesh, meshG, meshM, randomIndex;
size = 1;

let gltfLoader, modelPath, isModel, model, modelSize;
gltfLoader = new GLTFLoader();
modelPath = "./assets/duck/scene.gltf"; // default Model
isModel = false;
modelSize = 0.025;

async function setupScene() {
  console.log(navigator.xr, navigator.xr.isSessionSupported);
  webXrSupported =
    navigator.xr && (await navigator.xr.isSessionSupported("immersive-ar"));
  if (!webXrSupported) {
    console.error("WebXR not supported");
    btnS.textContent = "WebXR NOT SUPPORTED";
    btnS.disabled = true;
    return;
  }

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.xr.enabled = true;
  XR = renderer.xr;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.set(0, 0, 0.5);

  const lightH = new THREE.HemisphereLight(0xffffff, 10);
  scene.add(lightH);

  const lightD = new THREE.DirectionalLight(0xffffff, 2.5);
  lightD.position.set(0, 0.5, 0.5).normalize();
  scene.add(lightD);
}
setupScene();

async function startSession() {
  btnC.style.display = "block";
  btnX.style.display = "block";

  sessionActive = true;
  session = await navigator.xr.requestSession("immersive-ar", {
    optionalFeatures: ["dom-overlay"],
    domOverlay: { root: document.body },
  });

  await XR.setReferenceSpaceType("local");
  await XR.setSession(session);

  controller = XR.getController(0);
  scene.add(controller);

  const referenceSpace = await session.requestReferenceSpace("local");
  const viewerSpace = await session.requestReferenceSpace("viewer");
  const hitTestSource = await session.requestHitTestSource({
    space: viewerSpace,
  });

  reticleG = new THREE.RingGeometry(0.5, 1, 32).rotateX(-Math.PI / 2);
  reticleM = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  reticle = new THREE.Mesh(reticleG, reticleM);
  reticle.visible = reticle.matrixAutoUpdate = false;
  scene.add(reticle);

  // const gltf = await gltfLoader.loadAsync(modelPath);
  // model = gltf.scene;
  // model.scale.set(modelSize, modelSize, modelSize);
  // model.castShadow = true;

  shapes = [
    new THREE.SphereGeometry(size, 32, 32),
    new THREE.BoxGeometry(size, size, size),
    new THREE.ConeGeometry(size, size, 32),
    new THREE.CylinderGeometry(size, size, size, 32),
    new THREE.TorusGeometry(size, size / 4, 16, 100),
  ];

  controller.addEventListener("select", async () => {
    if (reticle.visible) {
      if (isModel) {
        const gltf = await gltfLoader.loadAsync(modelPath);
        model = gltf.scene;
        model.scale.set(modelSize, modelSize, modelSize);
        model.position.setFromMatrixPosition(reticle.matrix);
        model.castShadow = true;
        console.log(model);
        scene.add(model);
      } else {
        randomIndex = getRandomNumber(0, 4);
        console.log(randomIndex);
        meshG = shapes[randomIndex];
        console.log(meshG);
        meshM = new THREE.MeshBasicMaterial({
          color: 0xffffff * Math.random(),
        });
        mesh = new THREE.Mesh(meshG, meshM);
        mesh.position.setFromMatrixPosition(reticle.matrix);
        scene.add(mesh);
      }
    }
  });

  renderer.setAnimationLoop((timestamp, frame) => {
    if (!frame) return;

    const hitTestResults = frame.getHitTestResults(hitTestSource);
    if (hitTestResults.length > 0) {
      const hit = hitTestResults[0];
      const hitPose = hit.getPose(referenceSpace);
      reticle.visible = true;
      reticle.matrix.fromArray(hitPose.transform.matrix);
    } else {
      reticle.visible = false;
    }

    renderer.render(scene, camera);
  });
}

async function endSession() {
  session.end();
  renderer.clear();
  renderer.setAnimationLoop(null);
  sessionActive = false;
}

btnS.addEventListener("click", () => {
  if (sessionActive) {
    btnS.textContent = "START";
    endSession();
  } else {
    btnS.textContent = "END";
    startSession();
  }
});

btnC.addEventListener("click", () => {
  console.log("Clear Scene");

  while (scene.children.length > 0) {
    scene.remove(scene.children[0]);
  }
});

btnX.addEventListener("click", () => {
  console.log("MODE Change");
  isModel = !isModel;
  btnX.textContent = isModel ? "Mode : MODEL" : "Mode : SHAPE";
});

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

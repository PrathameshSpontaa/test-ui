import * as THREE from "three";
import { projects } from "./data.js";
import { vertexShader, fragmentShader } from "./shaders.js";

const config = {
  cellSize: .3,
  zoomLevel: 1.25,
  lerpFactor: 0.075,
  borderColor: "rgba(255, 255, 255, 0)",
  backgroundColor: "rgba(0, 0, 0, 1)",
  textColor: "rgba(128, 128, 128, 1)",
  hoverColor: "rgba(255, 255, 255, 0)",
  borderRadius: 1,
  yellowBorderColor: "rgba(255, 255, 0, 1)",
};

let scene, camera, renderer, plane;
let isDragging = false,
  isClick = true,
  clickStartTime = 0;
let previousMouse = { x: 0, y: 0 };
let offset = { x: 0, y: 0 },
  targetOffset = { x: 0, y: 0 };
let mousePosition = { x: -1, y: -1 };
let zoomLevel = 1.0,
  targetZoom = 1.0;
let textTextures = [];

// Add scaling animation state
let scalingImageIndex = -1;
let scalingProgress = 0;
let targetScalingProgress = 0;
let scalingStartTime = 0;
const scalingDuration = 800; // milliseconds

// Add flip animation state
let flipProgress = 0;
let targetFlipProgress = 0;
let flipStartTime = 0;
const flipDuration = 600; // milliseconds

// Add radial menu state
let showRadialMenu = false;
let radialMenuImageIndex = -1;
let radialMenuPosition = { x: 0, y: 0 };
let radialMenuButtons = [
  { id: 'view', label: 'View', icon: '👁️' },
  { id: 'edit', label: 'Edit', icon: '✏️' },
  { id: 'share', label: 'Share', icon: '📤' },
  { id: 'delete', label: 'Delete', icon: '🗑️' }
];

const rgbaToArray = (rgba) => {
  const match = rgba.match(/rgba?\(([^)]+)\)/);
  if (!match) return [1, 1, 1, 1];
  return match[1]
    .split(",")
    .map((v, i) =>
      i < 3 ? parseFloat(v.trim()) / 255 : parseFloat(v.trim() || 1)
    );
};

const createTextTexture = (title, year) => {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, 2048, 256);
  ctx.font = "80px IBM Plex Mono";
  ctx.fillStyle = config.textColor;
  ctx.textBaseline = "middle";
  ctx.imageSmoothingEnabled = false;

  // ctx.textAlign = "left";
  // ctx.fillText(title.toUpperCase(), 30, 128);
  // ctx.textAlign = "right";
  // ctx.fillText(year.toString().toUpperCase(), 2048 - 30, 128);

  const texture = new THREE.CanvasTexture(canvas);
  Object.assign(texture, {
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    flipY: false,
    generateMipmaps: false,
    format: THREE.RGBAFormat,
  });

  return texture;
};

const createTextureAtlas = (textures, isText = false) => {
  const atlasSize = Math.ceil(Math.sqrt(textures.length));
  const textureSize = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = atlasSize * textureSize;
  const ctx = canvas.getContext("2d");

  if (isText) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  textures.forEach((texture, index) => {
    const x = (index % atlasSize) * textureSize;
    const y = Math.floor(index / atlasSize) * textureSize;

    if (isText && texture.source?.data) {
      ctx.drawImage(texture.source.data, x, y, textureSize, textureSize);
    } else if (!isText && texture.image?.complete) {
      ctx.drawImage(texture.image, x, y, textureSize, textureSize);
    }
  });

  const atlasTexture = new THREE.CanvasTexture(canvas);
  Object.assign(atlasTexture, {
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    flipY: false,
  });

  return atlasTexture;
};

const createSizeTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, 512, 512);
  
  // Create a texture where each pixel represents the size of a project
  const imageData = ctx.createImageData(512, 512);
  const data = imageData.data;
  
  for (let i = 0; i < projects.length; i++) {
    const size = projects[i].size;
    const x = i % 512;
    const y = Math.floor(i / 512);
    const index = (y * 512 + x) * 4;
    
    // Store size in the red channel (normalized to 0-1 range)
    data[index] = Math.floor(size * 255); // Red channel
    data[index + 1] = 0; // Green channel
    data[index + 2] = 0; // Blue channel
    data[index + 3] = 255; // Alpha channel
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  const texture = new THREE.CanvasTexture(canvas);
  Object.assign(texture, {
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    flipY: false,
    generateMipmaps: false,
    format: THREE.RGBAFormat,
  });

  return texture;
};

const loadTextures = () => {
  const textureLoader = new THREE.TextureLoader();
  const imageTextures = [];
  let loadedCount = 0;

  return new Promise((resolve) => {
    projects.forEach((project) => {
      const texture = textureLoader.load(project.image, () => {
        if (++loadedCount === projects.length) resolve(imageTextures);
      });

      Object.assign(texture, {
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
      });

      imageTextures.push(texture);
      textTextures.push(createTextTexture(project.title, project.year));
    });
  });
};

const updateMousePosition = (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  mousePosition.x = event.clientX - rect.left;
  mousePosition.y = event.clientY - rect.top;
  plane?.material.uniforms.uMousePos.value.set(
    mousePosition.x,
    mousePosition.y
  );
};

const startDrag = (x, y) => {
  isDragging = true;
  isClick = true;
  clickStartTime = Date.now();
  document.body.classList.add("dragging");
  previousMouse.x = x;
  previousMouse.y = y;
  setTimeout(() => isDragging && (targetZoom = config.zoomLevel), 150);
};

const onPointerDown = (e) => startDrag(e.clientX, e.clientY);
const onTouchStart = (e) => {
  e.preventDefault();
  startDrag(e.touches[0].clientX, e.touches[0].clientY);
};

const handleMove = (currentX, currentY) => {
  if (!isDragging || currentX === undefined || currentY === undefined) return;

  const deltaX = currentX - previousMouse.x;
  const deltaY = currentY - previousMouse.y;

  if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
    isClick = false;
    if (targetZoom === 1.0) targetZoom = config.zoomLevel;
  }

  targetOffset.x -= deltaX * 0.003;
  targetOffset.y += deltaY * 0.003;
  previousMouse.x = currentX;
  previousMouse.y = currentY;
};

const onPointerMove = (e) => handleMove(e.clientX, e.clientY);
const onTouchMove = (e) => {
  e.preventDefault();
  handleMove(e.touches[0].clientX, e.touches[0].clientY);
};

const onPointerUp = (event) => {
  isDragging = false;
  document.body.classList.remove("dragging");
  targetZoom = 1.0;

  if (isClick && Date.now() - clickStartTime < 200) {
    const endX = event.clientX || event.changedTouches?.[0]?.clientX;
    const endY = event.clientY || event.changedTouches?.[0]?.clientY;

    if (endX !== undefined && endY !== undefined) {
      const rect = renderer.domElement.getBoundingClientRect();
      const screenX = ((endX - rect.left) / rect.width) * 2 - 1;
      const screenY = -(((endY - rect.top) / rect.height) * 2 - 1);

      const radius = Math.sqrt(screenX * screenX + screenY * screenY);
      const distortion = 1.0 - 0.08 * radius * radius;

      let worldX =
        screenX * distortion * (rect.width / rect.height) * zoomLevel +
        offset.x;
      let worldY = screenY * distortion * zoomLevel + offset.y;

      const cellX = Math.floor(worldX / config.cellSize);
      const cellY = Math.floor(worldY / config.cellSize);
      const texIndex = Math.floor((cellX + cellY * 3.0) % projects.length);
      const actualIndex = texIndex < 0 ? projects.length + texIndex : texIndex;

      // Trigger scaling animation
      if (scalingImageIndex === actualIndex) {
        // If clicking the same image, reverse the animation
        targetScalingProgress = targetScalingProgress === 1.0 ? 0.0 : 1.0;
        targetFlipProgress = targetFlipProgress === 1.0 ? 0.0 : 1.0;
        
        // Toggle radial menu
        if (targetScalingProgress === 0.0) {
          hideRadialMenu();
        } else {
          displayRadialMenu(endX, endY, actualIndex);
        }
      } else {
        // If clicking a different image, reset and start new animation
        scalingImageIndex = actualIndex;
        targetScalingProgress = 1.0;
        targetFlipProgress = 1.0;
        displayRadialMenu(endX, endY, actualIndex);
      }
      scalingStartTime = Date.now();
      flipStartTime = Date.now();
    }
  }
};

const onWindowResize = () => {
  const container = document.getElementById("gallery");
  if (!container) return;

  const { offsetWidth: width, offsetHeight: height } = container;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  plane?.material.uniforms.uResolution.value.set(width, height);
};

const setupEventListeners = () => {
  document.addEventListener("mousedown", onPointerDown);
  document.addEventListener("mousemove", onPointerMove);
  document.addEventListener("mouseup", onPointerUp);
  document.addEventListener("mouseleave", onPointerUp);

  const passiveOpts = { passive: false };
  document.addEventListener("touchstart", onTouchStart, passiveOpts);
  document.addEventListener("touchmove", onTouchMove, passiveOpts);
  document.addEventListener("touchend", onPointerUp, passiveOpts);

  window.addEventListener("resize", onWindowResize);
  document.addEventListener("contextmenu", (e) => e.preventDefault());

  renderer.domElement.addEventListener("mousemove", updateMousePosition);
  renderer.domElement.addEventListener("mouseleave", () => {
    mousePosition.x = mousePosition.y = -1;
    plane?.material.uniforms.uMousePos.value.set(-1, -1);
  });

  // Setup radial menu event listeners
  setupRadialMenuEvents();
};

const animate = () => {
  requestAnimationFrame(animate);

  offset.x += (targetOffset.x - offset.x) * config.lerpFactor;
  offset.y += (targetOffset.y - offset.y) * config.lerpFactor;
  zoomLevel += (targetZoom - zoomLevel) * config.lerpFactor;

  // Update scaling animation
  const currentTime = Date.now();
  const elapsed = currentTime - scalingStartTime;
  const progress = Math.min(elapsed / scalingDuration, 1.0);
  
  // Use ease-in-out easing
  const easedProgress = progress < 0.5 
    ? 2 * progress * progress 
    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
  
  scalingProgress += (targetScalingProgress - scalingProgress) * 0.1;

  // Update flip animation
  const flipElapsed = currentTime - flipStartTime;
  const flipProgressRaw = Math.min(flipElapsed / flipDuration, 1.0);
  
  // Use ease-in-out easing for flip
  const flipEasedProgress = flipProgressRaw < 0.5 
    ? 2 * flipProgressRaw * flipProgressRaw 
    : 1 - Math.pow(-2 * flipProgressRaw + 2, 2) / 2;
  
  flipProgress += (targetFlipProgress - flipProgress) * 0.1;

  if (plane?.material.uniforms) {
    plane.material.uniforms.uOffset.value.set(offset.x, offset.y);
    plane.material.uniforms.uZoom.value = zoomLevel;
    plane.material.uniforms.uScalingImageIndex.value = scalingImageIndex;
    plane.material.uniforms.uScalingProgress.value = scalingProgress;
    plane.material.uniforms.uFlipProgress.value = flipProgress;
  }

  renderer.render(scene, camera);
};

const init = async () => {
  const container = document.getElementById("gallery");
  if (!container) return;

  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 1;

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(container.offsetWidth, container.offsetHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  const bgColor = rgbaToArray(config.backgroundColor);
  renderer.setClearColor(
    new THREE.Color(bgColor[0], bgColor[1], bgColor[2]),
    bgColor[3]
  );
  container.appendChild(renderer.domElement);

  const imageTextures = await loadTextures();
  const imageAtlas = createTextureAtlas(imageTextures, false);
  const textAtlas = createTextureAtlas(textTextures, true);
  const sizeTexture = createSizeTexture();

  const uniforms = {
    uOffset: { value: new THREE.Vector2(0, 0) },
    uResolution: {
      value: new THREE.Vector2(container.offsetWidth, container.offsetHeight),
    },
    uBorderColor: {
      value: new THREE.Vector4(...rgbaToArray(config.borderColor)),
    },
    uHoverColor: {
      value: new THREE.Vector4(...rgbaToArray(config.hoverColor)),
    },
    uBackgroundColor: {
      value: new THREE.Vector4(...rgbaToArray(config.backgroundColor)),
    },
    uYellowBorderColor: {
      value: new THREE.Vector4(...rgbaToArray(config.yellowBorderColor)),
    },
    uMousePos: { value: new THREE.Vector2(-1, -1) },
    uZoom: { value: 1.0 },
    uCellSize: { value: config.cellSize },
    uTextureCount: { value: projects.length },
    uBorderRadius: { value: config.borderRadius },
    uImageAtlas: { value: imageAtlas },
    uTextAtlas: { value: textAtlas },
    uSizeTexture: { value: sizeTexture },
    uScalingImageIndex: { value: -1 },
    uScalingProgress: { value: 0.0 },
    uFlipProgress: { value: 0.0 },
  };

  const geometry = new THREE.PlaneGeometry(2, 2);
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
  });

  plane = new THREE.Mesh(geometry, material);
  scene.add(plane);

  setupEventListeners();
  animate();
};

const displayRadialMenu = (x, y, imageIndex) => {
  const radialMenu = document.getElementById('radial-menu');
  const radialMenuButtons = radialMenu.querySelector('.radial-menu-buttons');
  const buttons = radialMenuButtons.querySelectorAll('.radial-menu-button');

  // --- Calculate image center and radius in screen coordinates ---
  // Get renderer and camera info
  const rect = renderer.domElement.getBoundingClientRect();
  // Find the cell (image) center in world coordinates
  const cellCountX = 3.0;
  const cellX = imageIndex % cellCountX;
  const cellY = Math.floor(imageIndex / cellCountX);
  // Use the same distortion as in the shader
  let worldX = (cellX + 0.5) * config.cellSize - offset.x;
  let worldY = (cellY + 0.5) * config.cellSize - offset.y;
  // Apply zoom
  worldX /= zoomLevel;
  worldY /= zoomLevel;
  // Apply aspect ratio
  const aspect = rect.width / rect.height;
  let screenX = (worldX / aspect);
  let screenY = worldY;
  // Apply distortion (reverse of shader)
  // (approximate, since shader is not easily invertible)
  // Map to screen
  screenX = ((screenX / 2) + 0.5) * rect.width + rect.left;
  screenY = ((-screenY / 2) + 0.5) * rect.height + rect.top;

  // --- Calculate image radius in screen space ---
  // Get project size and scaling
  const projectSize = projects[imageIndex].size;
  let imageSize = 0.85 * projectSize;
  if (scalingImageIndex === imageIndex && scalingProgress > 0.0) {
    imageSize *= 1.0 + scalingProgress * 0.2;
  }
  // Convert image size to screen pixels
  const imageRadius = (imageSize * config.cellSize * rect.height) / 2 / zoomLevel;

  // --- Arc settings ---
  const buttonRadius = 30; // half button size
  const gap = 8; // gap between image and button
  const arcRadius = imageRadius + buttonRadius + gap;
  const arcStart = -35; // degrees, top-right
  const arcEnd = 115; // degrees, lower-right
  const arcCount = buttons.length;

  // --- Position menu anchor at image top-right edge ---
  // Place anchor at the top-right of the image circle
  const anchorAngle = -35 * (Math.PI / 180);
  const anchorX = screenX + Math.cos(anchorAngle) * imageRadius;
  const anchorY = screenY + Math.sin(anchorAngle) * imageRadius;
  radialMenuButtons.style.left = `${anchorX}px`;
  radialMenuButtons.style.top = `${anchorY}px`;

  // --- Position each button along the arc ---
  for (let i = 0; i < arcCount; i++) {
    const angle = (arcStart + (arcEnd - arcStart) * (i / (arcCount - 1))) * (Math.PI / 180);
    const bx = Math.cos(angle) * arcRadius;
    const by = Math.sin(angle) * arcRadius;
    buttons[i].style.left = `${bx - buttonRadius}px`;
    buttons[i].style.top = `${by - buttonRadius}px`;
    buttons[i].style.transitionDelay = `${0.1 + i * 0.07}s`;
    buttons[i].style.transform = 'scale(0)';
    setTimeout(() => {
      buttons[i].style.transform = 'scale(1)';
    }, 10 + i * 60);
  }

  radialMenu.classList.add('active');
  showRadialMenu = true;
  radialMenuImageIndex = imageIndex;
  radialMenuPosition = { x: anchorX, y: anchorY };
};

const hideRadialMenu = () => {
  const radialMenu = document.getElementById('radial-menu');
  radialMenu.classList.remove('active');
  showRadialMenu = false;
  radialMenuImageIndex = -1;
};

const setupRadialMenuEvents = () => {
  const radialMenu = document.getElementById('radial-menu');
  const buttons = radialMenu.querySelectorAll('.radial-menu-button');
  
  buttons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = button.getAttribute('data-action');
      handleRadialMenuAction(action);
    });
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!radialMenu.contains(e.target) && showRadialMenu) {
      hideRadialMenu();
    }
  });
};

const handleRadialMenuAction = (action) => {
  const project = projects[radialMenuImageIndex];
  console.log(`Action: ${action} on project: ${project.title}`);
  
  switch (action) {
    case 'view':
      alert(`Viewing: ${project.title}`);
      break;
    case 'edit':
      alert(`Editing: ${project.title}`);
      break;
    case 'share':
      alert(`Sharing: ${project.title}`);
      break;
    case 'delete':
      if (confirm(`Delete "${project.title}"?`)) {
        alert(`Deleted: ${project.title}`);
      }
      break;
  }
  
  hideRadialMenu();
};

init();

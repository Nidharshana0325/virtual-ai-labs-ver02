// Three.js Pendulum Simulation
let scene, camera, renderer, pendulum, string, pivot, floor;
let animationId;
let isAnimating = false;
let angle = 0;
let angularVelocity = 0;

// Simulation parameters
let simParams = {
    length: 1.0,
    gravity: 9.81,
    amplitude: 11,
    mass: 0.5,
    airResistance: 0.01,
    mediumDensity: 1.23,
    releaseAngle: 15,
    stringStiffness: 1000,
    temperature: 25,
    oscillationCount: 10,
    _pivotY: 3
};

// Initialize Three.js scene
function initSimulation() {
    const canvas = document.getElementById('simulation-canvas');
    const container = canvas.parentElement;
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e1a);
    
    camera = new THREE.PerspectiveCamera(
        50,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.set(3, 2, 5);
    camera.lookAt(0, 0, 0);
    
    renderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        antialias: true 
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0x00ffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 50;
    scene.add(directionalLight);
    
    const pointLight = new THREE.PointLight(0xa855f7, 0.6);
    pointLight.position.set(-5, 5, -5);
    scene.add(pointLight);
    
    const gridHelper = new THREE.GridHelper(10, 20, 0x00ffff, 0x1e293b);
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);
    
    const floorGeometry = new THREE.PlaneGeometry(10, 10);
    const floorMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
    floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.5;
    floor.receiveShadow = true;
    scene.add(floor);
    
    createPendulum();
    addOrbitControls();
    animate();
    
    window.addEventListener('resize', onWindowResize);
}

function createPendulum() {
    if (pendulum) {
        scene.remove(pendulum);
        scene.remove(string);
        scene.remove(pivot);
    }
    
    const minPivotHeight = simParams.length + 1.5;
    const pivotY = Math.max(3, minPivotHeight);
    
    const pivotGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const pivotMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x00ffff,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0x00ffff,
        emissiveIntensity: 0.3
    });
    pivot = new THREE.Mesh(pivotGeometry, pivotMaterial);
    pivot.position.set(0, pivotY, 0);
    pivot.castShadow = true;
    scene.add(pivot);
    
    const stringGeometry = new THREE.CylinderGeometry(0.005, 0.005, 1, 8);
    const stringMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x94a3b8,
        metalness: 0.3,
        roughness: 0.7
    });
    string = new THREE.Mesh(stringGeometry, stringMaterial);
    string.position.set(0, pivotY - simParams.length / 2, 0);
    string.scale.y = simParams.length;
    scene.add(string);
    
    const bobRadius = Math.min(0.1 + (simParams.mass * 0.05), 0.5);
    const bobGeometry = new THREE.SphereGeometry(bobRadius, 32, 32);
    const bobMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xfbbf24,
        metalness: 0.6,
        roughness: 0.3,
        emissive: 0xfbbf24,
        emissiveIntensity: 0.1
    });
    pendulum = new THREE.Mesh(bobGeometry, bobMaterial);
    pendulum.position.set(0, pivotY - simParams.length, 0);
    pendulum.castShadow = true;
    scene.add(pendulum);
    
    simParams._pivotY = pivotY;
    
    angle = (simParams.releaseAngle * Math.PI) / 180;
    angularVelocity = 0;
    updatePendulumPosition();
    adjustCameraForLength();
}

function updatePendulumPosition() {
    if (!pendulum || !string) return;
    
    const pivotY = simParams._pivotY || 2;
    const bobX = simParams.length * Math.sin(angle);
    const bobY = pivotY - simParams.length * Math.cos(angle);
    
    pendulum.position.set(bobX, bobY, 0);
    string.position.set(bobX / 2, pivotY - simParams.length / 2, 0);
    string.rotation.z = angle;
    string.scale.y = simParams.length;
}

function animate() {
    animationId = requestAnimationFrame(animate);
    
    if (isAnimating) {
        const angularAcceleration = -(simParams.gravity / simParams.length) * Math.sin(angle);
        const damping = simParams.airResistance * (1 + simParams.mediumDensity * 0.1);
        
        angularVelocity += angularAcceleration * 0.016;
        angularVelocity *= (1 - damping);
        angle += angularVelocity * 0.016;
        
        updatePendulumPosition();
    }
    
    renderer.render(scene, camera);
}

function startSimulation() {
    isAnimating = true;
    angle = (simParams.releaseAngle * Math.PI) / 180;
    angularVelocity = 0;
}

function stopSimulation() {
    isAnimating = false;
}

function resetSimulation() {
    stopSimulation();
    angle = (simParams.releaseAngle * Math.PI) / 180;
    angularVelocity = 0;
    updatePendulumPosition();
}

function updateParameter(param, value) {
    simParams[param] = parseFloat(value);
    
    if (param === 'length' || param === 'mass') {
        createPendulum();
    }
    
    if (param === 'releaseAngle' && !isAnimating) {
        angle = (simParams.releaseAngle * Math.PI) / 180;
        updatePendulumPosition();
    }
}

let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let cameraRotation = { x: 0.2, y: 0.8 };
let cameraDistance = 10;

function addOrbitControls() {
    const canvas = document.getElementById('simulation-canvas');
    
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;
            
            if (e.shiftKey) {
                camera.position.x -= deltaX * 0.02;
                camera.position.y += deltaY * 0.02;
            } else {
                cameraRotation.y += deltaX * 0.01;
                cameraRotation.x += deltaY * 0.01;
                cameraRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraRotation.x));
                updateCameraPosition();
            }
            
            previousMousePosition = { x: e.clientX, y: e.clientY };
        }
    });
    
    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        cameraDistance += e.deltaY * 0.01;
        cameraDistance = Math.max(5, Math.min(20, cameraDistance));
        updateCameraPosition();
    });
}

function updateCameraPosition() {
    camera.position.x = cameraDistance * Math.sin(cameraRotation.y) * Math.cos(cameraRotation.x);
    camera.position.y = cameraDistance * Math.sin(cameraRotation.x) + (simParams._pivotY || 2) / 2;
    camera.position.z = cameraDistance * Math.cos(cameraRotation.y) * Math.cos(cameraRotation.x);
    camera.lookAt(0, (simParams._pivotY || 2) / 2, 0);
}

function adjustCameraForLength() {
    const minDistance = Math.max(6, simParams.length * 2 + 4);
    if (cameraDistance < minDistance) {
        cameraDistance = minDistance;
        updateCameraPosition();
    }
}

function onWindowResize() {
    const container = document.getElementById('simulation-canvas').parentElement;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

window.addEventListener('load', () => {
    initSimulation();

    // Sync slider displays and ensure simParams match UI
    Object.keys(simParams).forEach(key => {
        const val = simParams[key];
        const valueSpan = document.getElementById(`${key}-value`);
        if (valueSpan) {
            valueSpan.textContent = (typeof val === 'number') ? val.toFixed(2) : val;
        }
        const slider = document.getElementById(`${key}-slider`);
        if (slider) {
            slider.value = val;
            updateParameter(key, slider.value);
        }
    });

    // Hide training progress initially (parity with separation implementation)
    const trainSection = document.getElementById('training-progress-section');
    if (trainSection) trainSection.style.display = 'none';
});
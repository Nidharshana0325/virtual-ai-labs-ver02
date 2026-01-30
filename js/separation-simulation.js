// Three.js Separation of Substances Simulation
let scene, camera, renderer, beaker, magnet, filter, water;
let ironParticles = [], sandParticles = [], saltParticles = [], saltCrystals = [];
let animationId;
let isAnimating = false;

let separationState = {
    magneticDone: false,
    dissolutionDone: false,
    filtrationDone: false,
    evaporationDone: false
};

let simParams = {
    magnetic: 0.5,
    solvent: 100,
    evaporation: 5,
    particlesize: 100,
    stirring: 300,
    temperature: 25,
    filterpore: 50,
    impurity: 5,
    septime: 60,
    manual: 90
};

let separationAmounts = {
    initialMass: 30,
    iron: 10,
    sand: 10,
    salt: 10
};

let collectedAmounts = {
    iron: 0,
    sand: 0,
    salt: 0,
    saltRecovered: 0
};

function initSimulation() {
    const canvas = document.getElementById('simulation-canvas');
    const container = canvas.parentElement;
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e1a);
    
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(5, 4, 8);
    camera.lookAt(0, 2, 0);
    
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0x00ffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    const pointLight = new THREE.PointLight(0xa855f7, 0.5);
    pointLight.position.set(-5, 5, -5);
    scene.add(pointLight);
    
    const gridHelper = new THREE.GridHelper(10, 20, 0x00ffff, 0x1e293b);
    gridHelper.position.y = 0;
    scene.add(gridHelper);
    
    createBeaker();
    createMagnet();
    createFilter();
    createParticles();
    addOrbitControls();
    animate();
    
    window.addEventListener('resize', onWindowResize);
}

function createBeaker() {
    const beakerGroup = new THREE.Group();
    
    const bodyGeometry = new THREE.CylinderGeometry(1.5, 1.2, 4, 32, 1, true);
    const bodyMaterial = new THREE.MeshPhysicalMaterial({ 
        color: 0xffffff, transparent: true, opacity: 0.15,
        metalness: 0.1, roughness: 0.1, transmission: 0.9, thickness: 0.5
    });
    const beakerBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
    beakerBody.position.y = 2;
    beakerGroup.add(beakerBody);
    
    const rimGeometry = new THREE.TorusGeometry(1.5, 0.05, 8, 32);
    const rimMaterial = new THREE.MeshStandardMaterial({ color: 0x00ffff, metalness: 0.8, roughness: 0.2 });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.position.y = 4;
    rim.rotation.x = Math.PI / 2;
    beakerGroup.add(rim);
    
    const bottomGeometry = new THREE.CircleGeometry(1.2, 32);
    const bottomMaterial = new THREE.MeshPhysicalMaterial({ 
        color: 0xffffff, transparent: true, opacity: 0.2, side: THREE.DoubleSide
    });
    const bottom = new THREE.Mesh(bottomGeometry, bottomMaterial);
    bottom.position.y = 0.01;
    bottom.rotation.x = -Math.PI / 2;
    beakerGroup.add(bottom);
    
    const waterGeometry = new THREE.CylinderGeometry(1.45, 1.15, 0.1, 32);
    const waterMaterial = new THREE.MeshPhysicalMaterial({ 
        color: 0x4dd0e1, transparent: true, opacity: 0,
        metalness: 0, roughness: 0.1, transmission: 0.8
    });
    water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.position.y = 0.5;
    water.visible = false;
    beakerGroup.add(water);
    
    beaker = beakerGroup;
    scene.add(beaker);
}

function createMagnet() {
    const magnetGroup = new THREE.Group();
    
    const magnetGeometry = new THREE.BoxGeometry(0.3, 0.8, 0.3);
    const magnetMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff0000, metalness: 0.9, roughness: 0.2,
        emissive: 0xff0000, emissiveIntensity: 0.2
    });
    
    const magnetLeft = new THREE.Mesh(magnetGeometry, magnetMaterial);
    magnetLeft.position.set(-0.4, 0, 0);
    magnetGroup.add(magnetLeft);
    
    const magnetRight = new THREE.Mesh(magnetGeometry, magnetMaterial);
    magnetRight.position.set(0.4, 0, 0);
    magnetGroup.add(magnetRight);
    
    const barGeometry = new THREE.BoxGeometry(1.1, 0.2, 0.3);
    const barMesh = new THREE.Mesh(barGeometry, magnetMaterial);
    barMesh.position.set(0, 0.5, 0);
    magnetGroup.add(barMesh);
    
    magnetGroup.position.set(0, 5.5, 0);
    magnetGroup.visible = false;
    
    magnet = magnetGroup;
    scene.add(magnet);
}

function createFilter() {
    const filterGroup = new THREE.Group();
    
    const filterGeometry = new THREE.CylinderGeometry(1.4, 1.4, 0.05, 32);
    const filterMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xf5f5f5, transparent: true, opacity: 0.8, side: THREE.DoubleSide
    });
    const filterMesh = new THREE.Mesh(filterGeometry, filterMaterial);
    
    filterGroup.add(filterMesh);
    filterGroup.position.set(0, 2, 0);
    filterGroup.visible = false;
    
    filter = filterGroup;
    scene.add(filter);
}

function createParticles() {
    const particleCount = 50;
    
    for (let i = 0; i < particleCount; i++) {
        const size = 0.02 + Math.random() * 0.03;
        const geometry = new THREE.SphereGeometry(size, 8, 8);
        const material = new THREE.MeshStandardMaterial({ color: 0x404040, metalness: 0.9, roughness: 0.3 });
        const particle = new THREE.Mesh(geometry, material);
        
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 1.0;
        particle.position.set(Math.cos(angle) * radius, 0.2 + Math.random() * 0.3, Math.sin(angle) * radius);
        particle.userData = { type: 'iron', collected: false, velocity: new THREE.Vector3(0, 0, 0) };
        
        ironParticles.push(particle);
        scene.add(particle);
    }
    
    for (let i = 0; i < particleCount; i++) {
        const size = 0.015 + Math.random() * 0.025;
        const geometry = new THREE.SphereGeometry(size, 6, 6);
        const material = new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.9 });
        const particle = new THREE.Mesh(geometry, material);
        
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 1.0;
        particle.position.set(Math.cos(angle) * radius, 0.15 + Math.random() * 0.2, Math.sin(angle) * radius);
        particle.userData = { type: 'sand', filtered: false, velocity: new THREE.Vector3(0, 0, 0) };
        
        sandParticles.push(particle);
        scene.add(particle);
    }
    
    for (let i = 0; i < particleCount; i++) {
        const size = 0.01 + Math.random() * 0.02;
        const geometry = new THREE.SphereGeometry(size, 6, 6);
        const material = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
        const particle = new THREE.Mesh(geometry, material);
        
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 1.0;
        particle.position.set(Math.cos(angle) * radius, 0.25 + Math.random() * 0.25, Math.sin(angle) * radius);
        particle.userData = { type: 'salt', dissolved: false, velocity: new THREE.Vector3(0, 0, 0) };
        
        saltParticles.push(particle);
        scene.add(particle);
    }
}

function animate() {
    animationId = requestAnimationFrame(animate);
    if (isAnimating) updateParticles();
    renderer.render(scene, camera);
}

function updateParticles() {
    const dt = 0.016;
    
    [...ironParticles, ...sandParticles].forEach(particle => {
        if (!particle.userData.collected && !particle.userData.filtered) {
            if (particle.position.y > 0.1) {
                particle.userData.velocity.y -= 9.8 * dt * 0.1;
                particle.position.add(particle.userData.velocity.clone().multiplyScalar(dt));
                
                if (particle.position.y < 0.1) {
                    particle.position.y = 0.1;
                    particle.userData.velocity.y *= -0.3;
                }
            }
        }
    });
    
    if (water.visible && simParams.stirring > 0) {
        const stirSpeed = simParams.stirring * 0.0001;
        saltParticles.forEach(particle => {
            if (!particle.userData.dissolved && particle.position.y < water.position.y + 1) {
                const angle = Math.atan2(particle.position.z, particle.position.x);
                particle.position.x += Math.cos(angle + Math.PI / 2) * stirSpeed;
                particle.position.z += Math.sin(angle + Math.PI / 2) * stirSpeed;
            }
        });
    }
}

function updateStatusDisplay() {
    const statusDiv = document.getElementById('separation-status');
    if (!statusDiv) return;
    
    statusDiv.innerHTML = `
        <div style="color: var(--text-secondary); font-size: 0.85rem;">
            Mixture: ${separationAmounts.initialMass}g (Iron: ${separationAmounts.iron}g, Sand: ${separationAmounts.sand}g, Salt: ${separationAmounts.salt}g)
        </div>
        ${collectedAmounts.iron > 0 ? `<div style="color: var(--text-primary); margin-top: 0.5rem;">
            Iron Collected: ${collectedAmounts.iron.toFixed(1)}g (${((collectedAmounts.iron/separationAmounts.iron)*100).toFixed(1)}%)
        </div>` : ''}
        ${collectedAmounts.salt > 0 ? `<div style="color: var(--text-primary); margin-top: 0.25rem;">
            Salt Dissolved: ${collectedAmounts.salt.toFixed(1)}g (${((collectedAmounts.salt/separationAmounts.salt)*100).toFixed(1)}%)
        </div>` : ''}
        ${collectedAmounts.sand > 0 ? `<div style="color: var(--text-primary); margin-top: 0.25rem;">
            Sand Filtered: ${collectedAmounts.sand.toFixed(1)}g (${((collectedAmounts.sand/separationAmounts.sand)*100).toFixed(1)}%)
        </div>` : ''}
        ${collectedAmounts.saltRecovered > 0 ? `<div style="color: var(--cyan); margin-top: 0.5rem; font-weight: bold;">
            Pure Salt Recovered: ${collectedAmounts.saltRecovered.toFixed(1)}g (${((collectedAmounts.saltRecovered/separationAmounts.salt)*100).toFixed(1)}%)
        </div>` : ''}
    `;
}

function enableButton(buttonId) {
    const btn = document.getElementById(buttonId);
    if (btn) {
        btn.disabled = false;
        btn.style.opacity = '1';
    }
}

function disableButton(buttonId) {
    const btn = document.getElementById(buttonId);
    if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.5';
    }
}

function startMagneticSeparation() {
    if (separationState.magneticDone) {
        alert('Magnetic separation already completed!');
        return;
    }
    
    disableButton('btn-magnetic');
    magnet.visible = true;
    isAnimating = true;
    
    const magnetStrength = simParams.magnetic;
    const efficiency = Math.min(0.95, magnetStrength * 0.5);
    const manualFactor = simParams.manual / 100;
    collectedAmounts.iron = separationAmounts.iron * efficiency * manualFactor;
    
    ironParticles.forEach((particle, index) => {
        if (Math.random() < efficiency * manualFactor) {
            setTimeout(() => animateParticleToMagnet(particle), index * (1000 / magnetStrength) / 10);
        }
    });
    
    setTimeout(() => {
        separationState.magneticDone = true;
        updateStatusDisplay();
        enableButton('btn-dissolution');
        
        alert(`Magnetic separation complete!\n\nIron collected: ${collectedAmounts.iron.toFixed(1)}g / ${separationAmounts.iron}g\nEfficiency: ${(efficiency * 100).toFixed(1)}%`);
    }, ironParticles.length * (1000 / magnetStrength) / 10 + 1000);
}

function animateParticleToMagnet(particle) {
    const targetPos = new THREE.Vector3(
        magnet.position.x + (Math.random() - 0.5) * 0.5,
        magnet.position.y - 0.4,
        magnet.position.z + (Math.random() - 0.5) * 0.5
    );
    
    const startPos = particle.position.clone();
    const duration = 1000;
    const startTime = Date.now();
    
    function animateStep() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        particle.position.lerpVectors(startPos, targetPos, progress);
        
        if (progress < 1) {
            requestAnimationFrame(animateStep);
        } else {
            particle.userData.collected = true;
        }
    }
    animateStep();
}

function startDissolution() {
    if (!separationState.magneticDone) {
        alert('Please complete magnetic separation first!');
        return;
    }
    
    if (separationState.dissolutionDone) {
        alert('Dissolution already completed!');
        return;
    }
    
    disableButton('btn-dissolution');
    water.visible = true;
    water.material.opacity = 0;
    
    const solventCapacity = simParams.solvent;
    const saltSolubility = 360;
    const maxSaltDissolvable = (solventCapacity / 1000) * saltSolubility;
    const tempFactor = 1 + (simParams.temperature - 25) / 100;
    const stirringFactor = Math.min(1.2, 0.7 + (simParams.stirring / 1000) * 0.5);
    const effectiveDissolution = Math.min(1, (maxSaltDissolvable / separationAmounts.salt) * tempFactor * stirringFactor);
    
    collectedAmounts.salt = separationAmounts.salt * effectiveDissolution;
    
    const targetHeight = Math.min(3, 1 + solventCapacity / 200);
    const startHeight = 0.5;
    const duration = 2000;
    const startTime = Date.now();
    
    function animateWater() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentHeight = startHeight + (targetHeight - startHeight) * progress;
        water.position.y = currentHeight;
        water.scale.y = currentHeight * 4;
        water.material.opacity = Math.min(0.6, progress * 0.6);
        if (progress < 1) requestAnimationFrame(animateWater);
    }
    animateWater();
    
    saltParticles.forEach((particle, index) => {
        if (Math.random() < effectiveDissolution) {
            setTimeout(() => dissolveSaltParticle(particle), index * 100 / stirringFactor);
        }
    });
    
    setTimeout(() => {
        separationState.dissolutionDone = true;
        updateStatusDisplay();
        enableButton('btn-filtration');
        alert(`Dissolution complete!\n\nSalt dissolved: ${collectedAmounts.salt.toFixed(1)}g / ${separationAmounts.salt}g\nDissolution: ${(effectiveDissolution * 100).toFixed(1)}%`);
    }, duration + saltParticles.length * 100 / stirringFactor);
}

function dissolveSaltParticle(particle) {
    const duration = 1500;
    const startTime = Date.now();
    const startOpacity = particle.material.opacity;
    
    function animateStep() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        particle.material.opacity = startOpacity * (1 - progress);
        particle.position.y += 0.01;
        
        if (progress < 1) {
            requestAnimationFrame(animateStep);
        } else {
            particle.userData.dissolved = true;
            particle.visible = false;
        }
    }
    animateStep();
}

function startFiltration() {
    if (!separationState.dissolutionDone) {
        alert('Please complete dissolution first!');
        return;
    }
    
    if (separationState.filtrationDone) {
        alert('Filtration already completed!');
        return;
    }
    
    disableButton('btn-filtration');
    filter.visible = true;
    filter.position.y = 2.5;
    
    const poreSize = simParams.filterpore;
    const particleSize = simParams.particlesize;
    let filtrationEfficiency = 0.95;
    
    if (poreSize > particleSize * 0.5) {
        filtrationEfficiency = 0.6;
    } else if (poreSize < particleSize * 0.1) {
        filtrationEfficiency = 0.98;
    }
    
    const manualFactor = simParams.manual / 100;
    collectedAmounts.sand = separationAmounts.sand * filtrationEfficiency * manualFactor;
    
    sandParticles.forEach((particle, index) => {
        if (Math.random() < filtrationEfficiency * manualFactor) {
            setTimeout(() => animateSandToFilter(particle), index * 80);
        }
    });
    
    setTimeout(() => lowerWaterLevel(), 1000);
    
    setTimeout(() => {
        separationState.filtrationDone = true;
        updateStatusDisplay();
        enableButton('btn-evaporation');
        alert(`Filtration complete!\n\nSand filtered: ${collectedAmounts.sand.toFixed(1)}g / ${separationAmounts.sand}g\nEfficiency: ${(filtrationEfficiency * 100).toFixed(1)}%`);
    }, sandParticles.length * 80 + 3000);
}

function animateSandToFilter(particle) {
    const duration = 1000;
    const startTime = Date.now();
    const startY = particle.position.y;
    const targetY = filter.position.y + 0.05;
    
    function animateStep() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        particle.position.y = startY + (targetY - startY) * progress;
        if (progress < 1) {
            requestAnimationFrame(animateStep);
        } else {
            particle.userData.filtered = true;
        }
    }
    animateStep();
}

function lowerWaterLevel() {
    const duration = 2000;
    const startTime = Date.now();
    const startHeight = water.position.y;
    const targetHeight = 1.5;
    
    function animateStep() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        water.position.y = startHeight + (targetHeight - startHeight) * progress;
        water.scale.y = (startHeight + (targetHeight - startHeight) * progress) * 2;
        if (progress < 1) requestAnimationFrame(animateStep);
    }
    animateStep();
}

function startEvaporation() {
    if (!separationState.filtrationDone) {
        alert('Please complete filtration first!');
        return;
    }
    
    if (separationState.evaporationDone) {
        alert('Evaporation already completed!');
        return;
    }
    
    disableButton('btn-evaporation');
    
    const evapRate = simParams.evaporation;
    const impurityFactor = (100 - simParams.impurity) / 100;
    const evapEfficiency = Math.min(0.95, evapRate / 15);
    const totalRecoveryEfficiency = evapEfficiency * impurityFactor;
    
    collectedAmounts.saltRecovered = collectedAmounts.salt * totalRecoveryEfficiency;
    
    const duration = 3000 / (evapRate / 5);
    const startTime = Date.now();
    const startHeight = water.position.y;
    
    function animateEvaporation() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        water.position.y = startHeight * (1 - progress * 0.95);
        water.scale.y = startHeight * (1 - progress * 0.95) * 2;
        water.material.opacity = 0.6 * (1 - progress);
        
        if (progress < 1) {
            requestAnimationFrame(animateEvaporation);
        } else {
            water.visible = false;
            createSaltCrystals(totalRecoveryEfficiency);
        }
    }
    animateEvaporation();
    
    setTimeout(() => {
        separationState.evaporationDone = true;
        updateStatusDisplay();
        
        const totalRecovered = collectedAmounts.iron + collectedAmounts.sand + collectedAmounts.saltRecovered;
        alert(`Separation complete!\n\nSalt recovered: ${collectedAmounts.saltRecovered.toFixed(1)}g / ${separationAmounts.salt}g\nTotal: ${totalRecovered.toFixed(1)}g / ${separationAmounts.initialMass}g`);
    }, duration + 1500);
}

function createSaltCrystals(recoveryEfficiency) {
    const maxCrystals = 40;
    const crystalCount = Math.floor(maxCrystals * recoveryEfficiency);
    
    for (let i = 0; i < crystalCount; i++) {
        const size = 0.03 + Math.random() * 0.04;
        const geometry = new THREE.OctahedronGeometry(size);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xffffff, metalness: 0.3, roughness: 0.4,
            emissive: 0xffffff, emissiveIntensity: 0.3
        });
        const crystal = new THREE.Mesh(geometry, material);
        
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 0.9;
        crystal.position.set(Math.cos(angle) * radius, 0.05 + Math.random() * 0.02, Math.sin(angle) * radius);
        crystal.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        crystal.castShadow = true;
        
        saltCrystals.push(crystal);
        scene.add(crystal);
        
        crystal.scale.set(0, 0, 0);
        const duration = 1000;
        const startTime = Date.now();
        
        function growCrystal() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const scale = progress;
            crystal.scale.set(scale, scale, scale);
            if (progress < 1) requestAnimationFrame(growCrystal);
        }
        setTimeout(growCrystal, i * 50);
    }
}

function resetExperiment() {
    separationState = { magneticDone: false, dissolutionDone: false, filtrationDone: false, evaporationDone: false };
    collectedAmounts = { iron: 0, sand: 0, salt: 0, saltRecovered: 0 };
    
    enableButton('btn-magnetic');
    disableButton('btn-dissolution');
    disableButton('btn-filtration');
    disableButton('btn-evaporation');
    
    updateStatusDisplay();
    
    magnet.visible = false;
    filter.visible = false;
    water.visible = false;
    
    saltCrystals.forEach(crystal => {
        scene.remove(crystal);
        if (crystal.geometry) crystal.geometry.dispose();
        if (crystal.material) crystal.material.dispose();
    });
    saltCrystals = [];
    
    ironParticles.forEach(particle => {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 1.0;
        particle.position.set(Math.cos(angle) * radius, 0.2 + Math.random() * 0.3, Math.sin(angle) * radius);
        particle.visible = true;
        particle.userData.collected = false;
        particle.material.opacity = 1;
    });
    
    sandParticles.forEach(particle => {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 1.0;
        particle.position.set(Math.cos(angle) * radius, 0.15 + Math.random() * 0.2, Math.sin(angle) * radius);
        particle.visible = true;
        particle.userData.filtered = false;
    });
    
    saltParticles.forEach(particle => {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 1.0;
        particle.position.set(Math.cos(angle) * radius, 0.25 + Math.random() * 0.25, Math.sin(angle) * radius);
        particle.visible = true;
        particle.userData.dissolved = false;
        particle.material.opacity = 1;
    });
    
    isAnimating = false;
}

function updateParameter(param, value) {
    simParams[param] = parseFloat(value);
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
    
    canvas.addEventListener('mouseup', () => { isDragging = false; });
    
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        cameraDistance += e.deltaY * 0.01;
        cameraDistance = Math.max(5, Math.min(20, cameraDistance));
        updateCameraPosition();
    });
}

function updateCameraPosition() {
    camera.position.x = cameraDistance * Math.sin(cameraRotation.y) * Math.cos(cameraRotation.x);
    camera.position.y = cameraDistance * Math.sin(cameraRotation.x) + 2;
    camera.position.z = cameraDistance * Math.cos(cameraRotation.y) * Math.cos(cameraRotation.x);
    camera.lookAt(0, 2, 0);
}

function onWindowResize() {
    const container = document.getElementById('simulation-canvas').parentElement;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

window.addEventListener('load', () => {
    initSimulation();
    if (document.getElementById('separation-status')) {
        updateStatusDisplay();
    }
});

// AI Model Training and Prediction for Separation
let aiModel = null;
let trainingData = [];
let isTraining = false;
let lossHistory = [];
let selectedArchitecture = 'simple';

const aiParameters = [
    { key: 'magnetic', name: 'Magnetic Strength (T)', min: 0.1, max: 2, step: 0.01, default: 0.5, formula: true },
    { key: 'solvent', name: 'Solvent Volume (mL)', min: 10, max: 500, step: 1, default: 100, formula: true },
    { key: 'evaporation', name: 'Evaporation Rate (mL/min)', min: 1, max: 20, step: 0.1, default: 5, formula: true },
    { key: 'particlesize', name: 'Particle Size (µm)', min: 10, max: 1000, step: 10, default: 100, formula: false },
    { key: 'stirring', name: 'Stirring Speed (RPM)', min: 0, max: 1000, step: 10, default: 300, formula: false },
    { key: 'temperature', name: 'Temperature (°C)', min: 0, max: 100, step: 1, default: 25, formula: false },
    { key: 'filterpore', name: 'Filter Pore Size (µm)', min: 5, max: 500, step: 5, default: 50, formula: false },
    { key: 'impurity', name: 'Impurity (%)', min: 0, max: 50, step: 1, default: 5, formula: false },
    { key: 'septime', name: 'Separation Time (s)', min: 10, max: 300, step: 5, default: 60, formula: false },
    { key: 'manual', name: 'Manual Efficiency (%)', min: 50, max: 100, step: 1, default: 90, formula: false }
];

/**
 * ACADEMICALLY CORRECT: Calculate ideal efficiency using formula parameters
 * Based on standard separation efficiency models in chemical engineering
 * 
 * E_m (Magnetic): Based on magnetic field strength (B) and susceptibility
 * E_d (Dissolution): Based on solubility limits and volume
 * E_f (Filtration): Fixed efficiency for particle retention
 * E_e (Evaporation): Based on evaporation rate and completeness
 */
function calculateIdealEfficiency(magnetic, solvent, evaporation) {
    // Magnetic separation efficiency (0-25%)
    // Based on: η_mag = (B / B_sat) × 100, where B_sat ≈ 2T for typical iron filings
    const E_m = Math.min(25, (magnetic / 2.0) * 25);
    
    // Dissolution efficiency (0-25%)
    // Based on: Solubility of NaCl ≈ 360 g/L at 25°C
    // For 10g salt, optimal volume ≈ 30mL, max considered 500mL
    // Efficiency increases with volume up to saturation point
    const optimalVolume = 30;
    const E_d = Math.min(25, 25 * Math.min(1, solvent / optimalVolume));
    
    // Filtration efficiency (fixed at 25% for ideal case)
    // Standard filter paper retains >99% of sand particles
    const E_f = 25;
    
    // Evaporation efficiency (0-25%)
    // Based on: Higher rate = better recovery (less time for losses)
    // Optimal rate ≈ 10-15 mL/min for minimal losses
    const optimalEvapRate = 12.5;
    const E_e = Math.min(25, 25 * Math.min(1, evaporation / optimalEvapRate));
    
    return E_m + E_d + E_f + E_e;
}

/**
 * ACADEMICALLY CORRECT: Simulate realistic efficiency with all parameters
 * Incorporates real-world factors from chemical engineering principles
 */
function simulateRealisticEfficiency(params) {
    // Start with ideal efficiency
    let efficiency = calculateIdealEfficiency(params.magnetic, params.solvent, params.evaporation);
    
    // PARTICLE SIZE EFFECT (Stokes' Law)
    // Smaller particles are harder to separate (both magnetically and by filtration)
    // Optimal range: 50-200 µm
    const optimalParticleSize = 100;
    const particleSizeDeviation = Math.abs(params.particlesize - optimalParticleSize) / optimalParticleSize;
    const particleFactor = 1 - (particleSizeDeviation * 0.15); // Max 15% reduction
    efficiency *= Math.max(0.7, particleFactor);
    
    // STIRRING SPEED EFFECT
    // Enhances dissolution rate (increases surface area exposure)
    // Optimal range: 200-400 RPM (too fast causes splashing, too slow is ineffective)
    let stirringBonus = 0;
    if (params.stirring >= 200 && params.stirring <= 400) {
        stirringBonus = 5; // Optimal stirring adds 5%
    } else if (params.stirring > 400) {
        stirringBonus = 3 - ((params.stirring - 400) / 600) * 3; // Decreases with excessive speed
    } else {
        stirringBonus = (params.stirring / 200) * 5; // Scales up to optimal
    }
    efficiency += Math.max(0, stirringBonus);
    
    // TEMPERATURE EFFECT (Solubility increases with temperature)
    // NaCl solubility: ~360 g/L at 20°C to ~390 g/L at 100°C
    // Effect primarily on dissolution efficiency
    const tempBonus = (params.temperature - 20) / 80; // Normalized 0 to 1
    efficiency += tempBonus * 8; // Up to 8% improvement
    
    // FILTER PORE SIZE EFFECT
    // Sand particle size typically 100-1000 µm
    // Optimal pore size: 20-100 µm (retains sand, allows water/salt through)
    let filterFactor = 1;
    if (params.filterpore < 20) {
        // Too fine: Clogs easily, reduces flow
        filterFactor = 0.85 - ((20 - params.filterpore) / 20) * 0.15;
    } else if (params.filterpore > 150) {
        // Too coarse: Sand particles pass through
        filterFactor = 1 - ((params.filterpore - 150) / 350) * 0.3;
    }
    efficiency *= Math.max(0.7, filterFactor);
    
    // IMPURITY EFFECT
    // Contaminants reduce purity of recovered materials
    const purityFactor = (100 - params.impurity) / 100;
    efficiency *= Math.max(0.5, purityFactor);
    
    // TIME EFFECT (Equilibrium considerations)
    // Insufficient time = incomplete separation
    // Optimal time: 60-120 seconds per step
    const timeFactor = Math.min(1, params.septime / 60);
    efficiency *= Math.max(0.5, timeFactor);
    
    // MANUAL SKILL EFFECT (Human error factor)
    // Technique, care in handling, etc.
    const manualFactor = params.manual / 100;
    efficiency *= manualFactor;
    
    // Cap at 100% (theoretical maximum)
    efficiency = Math.min(100, efficiency);
    
    // Add small realistic noise (±2%) to simulate experimental variation
    const noise = (Math.random() - 0.5) * 4;
    efficiency += noise;
    
    return Math.max(0, efficiency);
}

function addDataPoint() {
    const dataPoint = {
        inputs: aiParameters.map(p => {
            const slider = document.getElementById(`ai-${p.key}-slider`);
            return slider ? parseFloat(slider.value) : p.default;
        }),
        output: 0
    };
    
    const params = {};
    aiParameters.forEach((p, i) => {
        params[p.key] = dataPoint.inputs[i];
    });
    dataPoint.output = simulateRealisticEfficiency(params);
    
    trainingData.push(dataPoint);
    
    const dataCount = trainingData.length;
    document.getElementById('data-count').textContent = dataCount;
    
    const collectedDataDiv = document.getElementById('collected-data');
    const dataPointDiv = document.createElement('div');
    dataPointDiv.className = 'data-point';
    dataPointDiv.style.cssText = 'background: rgba(0, 255, 255, 0.1); padding: 0.75rem; border-radius: 0.5rem; margin-top: 0.5rem; border-left: 3px solid var(--cyan);';
    dataPointDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong>Data Point ${dataCount}</strong>
                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">
                    Mag=${params.magnetic.toFixed(2)}T, Solv=${params.solvent.toFixed(0)}mL, Temp=${params.temperature.toFixed(0)}°C
                </div>
            </div>
            <div style="color: var(--cyan); font-weight: bold; font-size: 1.1rem;">
                ${dataPoint.output.toFixed(1)}%
            </div>
        </div>
    `;
    collectedDataDiv.appendChild(dataPointDiv);
    
    const addBtn = document.getElementById('add-data-btn');
    if (addBtn) {
        addBtn.textContent = `Add Data Point (${dataCount}/10)`;
    }
    
    // Enable training button when we have enough points
    // Require 10+ points to prevent overfitting on small dataset
    if (dataCount >= 10) {
        const trainBtn = document.getElementById('start-train-btn');
        if (trainBtn) {
            trainBtn.style.display = 'block';
            trainBtn.textContent = 'Proceed to Training';
            trainBtn.disabled = false;
        }
    }
}

function showAITrainSection() {
    if (trainingData.length < 10) {
        alert('Please collect at least 10 data points before proceeding to training!\n\nMore data points help the model learn better and avoid overfitting.');
        return;
    }
    document.getElementById('ai-collect').style.display = 'none';
    document.getElementById('ai-train').style.display = 'block';
}

/**
 * MACHINE LEARNING BEST PRACTICES:
 * - Minimum 10 data points required (prevents severe overfitting)
 * - Input normalization (z-score standardization)
 * - Validation split (20% for monitoring overfitting)
 * - Early stopping if validation loss increases
 * - Appropriate learning rate (0.001 for Adam optimizer)
 * - Regularization through architecture choice
 */
async function startTraining() {
    if (trainingData.length < 10) {
        alert('Please collect at least 10 data points before training!');
        return;
    }
    
    if (isTraining) {
        alert('Training already in progress!');
        return;
    }
    
    isTraining = true;
    
    document.getElementById('training-progress-section').style.display = 'block';
    document.getElementById('loss-chart').style.display = 'block';
    
    const inputs = tf.tensor2d(trainingData.map(d => d.inputs));
    const outputs = tf.tensor2d(trainingData.map(d => [d.output]));
    
    // Z-score normalization for better training stability
    const inputMean = inputs.mean(0);
    const inputStd = inputs.sub(inputMean).square().mean(0).sqrt();
    const normalizedInputs = inputs.sub(inputMean).div(inputStd.add(1e-7));
    
    // Normalize outputs to 0-1 range for better gradient flow
    const outputMin = outputs.min();
    const outputMax = outputs.max();
    const outputRange = outputMax.sub(outputMin).add(1e-7);
    const normalizedOutputs = outputs.sub(outputMin).div(outputRange);
    
    if (selectedArchitecture === 'simple') {
        aiModel = tf.sequential({
            layers: [
                tf.layers.dense({ 
                    inputShape: [10], 
                    units: 16, 
                    activation: 'relu', 
                    kernelInitializer: 'heNormal',
                    kernelRegularizer: tf.regularizers.l2({ l2: 0.001 }) // L2 regularization
                }),
                tf.layers.dropout({ rate: 0.1 }), // Dropout for regularization
                tf.layers.dense({ 
                    units: 8, 
                    activation: 'relu', 
                    kernelInitializer: 'heNormal',
                    kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
                }),
                tf.layers.dense({ units: 1, activation: 'sigmoid' }) // Sigmoid for 0-1 output
            ]
        });
    } else {
        aiModel = tf.sequential({
            layers: [
                tf.layers.dense({ 
                    inputShape: [10], 
                    units: 32, 
                    activation: 'relu', 
                    kernelInitializer: 'heNormal',
                    kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
                }),
                tf.layers.dropout({ rate: 0.15 }),
                tf.layers.dense({ 
                    units: 24, 
                    activation: 'relu', 
                    kernelInitializer: 'heNormal',
                    kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
                }),
                tf.layers.dropout({ rate: 0.1 }),
                tf.layers.dense({ 
                    units: 16, 
                    activation: 'relu', 
                    kernelInitializer: 'heNormal',
                    kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
                }),
                tf.layers.dense({ 
                    units: 8, 
                    activation: 'relu', 
                    kernelInitializer: 'heNormal'
                }),
                tf.layers.dense({ units: 1, activation: 'sigmoid' })
            ]
        });
    }
    
    aiModel.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
        metrics: ['mae']
    });
    
    // Adaptive epochs based on dataset size
    const epochs = Math.min(500, Math.max(200, trainingData.length * 20));
    lossHistory = [];
    
    setupLossChart();
    
    let bestValLoss = Infinity;
    let patienceCounter = 0;
    const patience = 50; // Early stopping patience
    
    await aiModel.fit(normalizedInputs, normalizedOutputs, {
        epochs: epochs,
        batchSize: Math.min(8, Math.floor(trainingData.length * 0.4)),
        shuffle: true,
        validationSplit: 0.2,
        callbacks: {
            onEpochEnd: async (epoch, logs) => {
                const progress = ((epoch + 1) / epochs) * 100;
                document.getElementById('train-progress').style.width = progress + '%';
                document.getElementById('train-progress').textContent = Math.round(progress) + '%';
                document.getElementById('epoch-display').textContent = epoch + 1;
                document.getElementById('loss-display').textContent = logs.loss.toFixed(6);
                
                lossHistory.push({
                    epoch: epoch + 1,
                    loss: logs.loss,
                    valLoss: logs.val_loss || logs.loss
                });
                
                // Early stopping check
                if (logs.val_loss < bestValLoss) {
                    bestValLoss = logs.val_loss;
                    patienceCounter = 0;
                } else {
                    patienceCounter++;
                }
                
                if ((epoch + 1) % 10 === 0 || epoch === epochs - 1) {
                    updateLossChart();
                }
                
                await tf.nextFrame();
                
                // Stop if overfitting detected
                if (patienceCounter >= patience && epoch > 100) {
                    console.log('Early stopping triggered at epoch', epoch + 1);
                    aiModel.stopTraining = true;
                }
            }
        }
    });
    
    // Store normalization parameters
    aiModel.inputMean = await inputMean.array();
    aiModel.inputStd = await inputStd.array();
    aiModel.outputMin = await outputMin.data();
    aiModel.outputMax = await outputMax.data();
    aiModel.architecture = selectedArchitecture;
    
    window.trainedAIModel = aiModel;
    
    const archName = selectedArchitecture === 'simple' ? 'Simple Network' : 'Deep Network';
    document.getElementById('training-complete').style.display = 'block';
    document.getElementById('final-data-count').textContent = trainingData.length;
    document.getElementById('final-arch-name').textContent = archName;
    document.getElementById('final-loss').textContent = lossHistory[lossHistory.length - 1].loss.toFixed(6);
    
    inputs.dispose();
    outputs.dispose();
    normalizedInputs.dispose();
    normalizedOutputs.dispose();
    inputMean.dispose();
    inputStd.dispose();
    outputMin.dispose();
    outputMax.dispose();
    outputRange.dispose();
    
    isTraining = false;
}

function setupLossChart() {
    const canvas = document.getElementById('loss-canvas');
    const container = canvas.parentElement;
    canvas.width = container.clientWidth - 32;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function updateLossChart() {
    const canvas = document.getElementById('loss-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, width, height);
    
    if (lossHistory.length < 2) return;
    
    const padding = { top: 40, right: 40, bottom: 50, left: 70 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const losses = lossHistory.map(h => h.loss);
    const valLosses = lossHistory.map(h => h.valLoss);
    const allLosses = [...losses, ...valLosses];
    const maxLoss = Math.max(...allLosses);
    const minLoss = Math.min(...allLosses);
    const range = maxLoss - minLoss || 1;
    
    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();
        
        const value = maxLoss - (range / 5) * i;
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(value.toFixed(4), padding.left - 10, y);
    }
    
    for (let i = 0; i <= 5; i++) {
        const x = padding.left + (chartWidth / 5) * i;
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + chartHeight);
        ctx.stroke();
        
        const epoch = Math.round((lossHistory.length / 5) * i);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(epoch.toString(), x, padding.top + chartHeight + 10);
    }
    
    // Draw axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.stroke();
    
    // Draw training loss
    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
    gradient.addColorStop(0, '#a855f7');
    gradient.addColorStop(1, '#7c3aed');
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    
    lossHistory.forEach((point, i) => {
        const x = padding.left + (i / (lossHistory.length - 1)) * chartWidth;
        const normalizedLoss = (point.loss - minLoss) / range;
        const y = padding.top + chartHeight - (normalizedLoss * chartHeight);
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
    
    // Draw validation loss
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    
    lossHistory.forEach((point, i) => {
        const x = padding.left + (i / (lossHistory.length - 1)) * chartWidth;
        const normalizedLoss = (point.valLoss - minLoss) / range;
        const y = padding.top + chartHeight - (normalizedLoss * chartHeight);
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Fill area under training curve
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.closePath();
    
    const areaGradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
    areaGradient.addColorStop(0, 'rgba(168, 85, 247, 0.3)');
    areaGradient.addColorStop(1, 'rgba(124, 58, 237, 0.1)');
    ctx.fillStyle = areaGradient;
    ctx.fill();
    
    // Draw legend
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(padding.left + 10, padding.top + 10, 20, 3);
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Training Loss', padding.left + 35, padding.top + 13);
    
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding.left + 10, padding.top + 28);
    ctx.lineTo(padding.left + 30, padding.top + 28);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Validation Loss', padding.left + 35, padding.top + 31);
    
    // Draw title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Training & Validation Loss', width / 2, 10);
    
    // Draw axis labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Epoch', width / 2, height - 20);
    
    ctx.save();
    ctx.translate(20, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Loss', 0, 0);
    ctx.restore();
}

async function predictWithAI(params) {
    const model = window.trainedAIModel || aiModel;
    
    if (!model || !model.inputMean) {
        console.error('Model not trained yet!');
        return null;
    }
    
    const inputArray = aiParameters.map(p => params[p.key]);
    const normalizedInput = inputArray.map((val, i) => {
        return (val - model.inputMean[i]) / (model.inputStd[i] + 1e-7);
    });
    
    const inputTensor = tf.tensor2d([normalizedInput]);
    const prediction = model.predict(inputTensor);
    const predictionData = await prediction.data();
    
    // Denormalize output
    const normalizedPred = predictionData[0];
    const result = normalizedPred * (model.outputMax[0] - model.outputMin[0]) + model.outputMin[0];
    
    inputTensor.dispose();
    prediction.dispose();
    
    return result;
}
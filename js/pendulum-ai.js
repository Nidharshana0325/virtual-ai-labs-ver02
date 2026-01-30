// AI Model Training and Prediction for Pendulum
let aiModel = null;
let trainingData = [];
let isTraining = false;
let lossHistory = [];
let selectedArchitecture = 'simple';

// AI Parameters - All 10 parameters for pendulum
const aiParameters = [
    { key: 'length', name: 'Length (m)', min: 0.1, max: 30, step: 0.01, default: 1.0, formula: true },
    { key: 'gravity', name: 'Gravity (m/s²)', min: 0.1, max: 50, step: 0.01, default: 9.81, formula: true },
    { key: 'temperature', name: 'Temperature (°C)', min: -50, max: 100, step: 0.1, default: 25, formula: true },
    { key: 'amplitude', name: 'Amplitude (°)', min: 1, max: 85, step: 0.1, default: 11, formula: false },
    { key: 'mass', name: 'Mass (kg)', min: 0.01, max: 10, step: 0.01, default: 0.5, formula: false },
    { key: 'airResistance', name: 'Air Resistance', min: 0, max: 1, step: 0.001, default: 0.01, formula: false },
    { key: 'mediumDensity', name: 'Medium Density (kg/m³)', min: 0.01, max: 20, step: 0.01, default: 1.23, formula: false },
    { key: 'releaseAngle', name: 'Release Angle (°)', min: 1, max: 89, step: 0.1, default: 15, formula: false },
    { key: 'stringStiffness', name: 'String Stiffness (N/m)', min: 10, max: 10000, step: 10, default: 1000, formula: false },
    { key: 'oscillationCount', name: 'Oscillation Count', min: 1, max: 50, step: 1, default: 10, formula: false }
];

// Calculate ideal period using only formula parameters
function calculateIdealPeriod(length, gravity, temperature) {
    // Thermal expansion coefficient for typical string material
    const alpha = 1.2e-5; // per °C
    const refTemp = 20; // reference temperature
    
    // Adjust length for thermal expansion
    const thermalExpansion = alpha * (temperature - refTemp);
    const effectiveLength = length * (1 + thermalExpansion);
    
    // Simple pendulum formula: T = 2π√(L/g)
    const period = 2 * Math.PI * Math.sqrt(effectiveLength / gravity);
    
    return period;
}

// Simulate realistic period considering all parameters
function simulateRealisticPeriod(params) {
    // Start with ideal period
    let period = calculateIdealPeriod(params.length, params.gravity, params.temperature);
    
    // Large angle correction (non-linear restoring force)
    const angleRad = params.amplitude * Math.PI / 180;
    if (angleRad > 0.2) { // > ~11 degrees
        const largeAngleCorrection = 1 + (angleRad * angleRad) / 16 + (11 * angleRad * angleRad * angleRad * angleRad) / 3072;
        period *= largeAngleCorrection;
    }
    
    // Air resistance effect (damping increases period slightly)
    const dragFactor = params.airResistance * params.mediumDensity;
    const dampingCorrection = 1 + (dragFactor * 0.01);
    period *= dampingCorrection;
    
    // String stiffness effect (rigid strings reduce effective length)
    const stiffnessFactor = 1 - (10000 - params.stringStiffness) / 100000;
    period *= stiffnessFactor;
    
    // Release angle effect (different from amplitude, initial conditions)
    const releaseRad = params.releaseAngle * Math.PI / 180;
    if (releaseRad > 0.3) {
        period *= (1 + releaseRad * 0.05);
    }
    
    // Add small realistic noise
    const noise = (Math.random() - 0.5) * 0.02;
    period *= (1 + noise);
    
    return period;
}

// Add data point for training
function addDataPoint() {
    const dataPoint = {
        inputs: aiParameters.map(p => {
            const slider = document.getElementById(`ai-${p.key}-slider`);
            return slider ? parseFloat(slider.value) : p.default;
        }),
        output: 0
    };
    
    // Calculate realistic period for this combination
    const params = {};
    aiParameters.forEach((p, i) => {
        params[p.key] = dataPoint.inputs[i];
    });
    dataPoint.output = simulateRealisticPeriod(params);
    
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
                    L=${params.length.toFixed(2)}m, g=${params.gravity.toFixed(2)}m/s², T=${params.temperature.toFixed(1)}°C
                </div>
            </div>
            <div style="color: var(--cyan); font-weight: bold; font-size: 1.1rem;">
                ${dataPoint.output.toFixed(3)}s
            </div>
        </div>
    `;
    collectedDataDiv.appendChild(dataPointDiv);
    
    // Update button text
    const addBtn = document.getElementById('add-data-btn');
    if (addBtn) {
        addBtn.textContent = `Add Data Point (${dataCount}/5)`;
    }
    
    // Enable training button when we have 5 or more points
    if (dataCount >= 5) {
        const trainBtn = document.getElementById('start-train-btn');
        if (trainBtn) {
            trainBtn.style.display = 'block';
            trainBtn.textContent = 'Proceed to Training';
            trainBtn.disabled = false;
        }
    }
}

// Show AI training section
function showAITrainSection() {
    if (trainingData.length < 5) {
        alert('Please collect at least 5 data points before proceeding to training!');
        return;
    }
    document.getElementById('ai-collect').style.display = 'none';
    document.getElementById('ai-train').style.display = 'block';
}

// Create and train neural network
async function startTraining() {
    if (trainingData.length < 5) {
        alert('Please collect at least 5 data points before training!');
        return;
    }
    
    if (isTraining) {
        alert('Training already in progress!');
        return;
    }
    
    isTraining = true;
    
    // Show training section
    document.getElementById('training-progress-section').style.display = 'block';
    document.getElementById('loss-chart').style.display = 'block';
    
    // Prepare training data
    const inputs = tf.tensor2d(trainingData.map(d => d.inputs));
    const outputs = tf.tensor2d(trainingData.map(d => [d.output]));
    
    // Normalize inputs
    const inputMean = inputs.mean(0);
    const inputStd = inputs.sub(inputMean).square().mean(0).sqrt();
    const normalizedInputs = inputs.sub(inputMean).div(inputStd.add(1e-7));
    
    // Create model based on selected architecture
    if (selectedArchitecture === 'simple') {
        aiModel = tf.sequential({
            layers: [
                tf.layers.dense({ inputShape: [10], units: 16, activation: 'relu', kernelInitializer: 'heNormal' }),
                tf.layers.dense({ units: 8, activation: 'relu', kernelInitializer: 'heNormal' }),
                tf.layers.dense({ units: 1, activation: 'linear' })
            ]
        });
    } else {
        aiModel = tf.sequential({
            layers: [
                tf.layers.dense({ inputShape: [10], units: 32, activation: 'relu', kernelInitializer: 'heNormal' }),
                tf.layers.dense({ units: 24, activation: 'relu', kernelInitializer: 'heNormal' }),
                tf.layers.dense({ units: 16, activation: 'relu', kernelInitializer: 'heNormal' }),
                tf.layers.dense({ units: 8, activation: 'relu', kernelInitializer: 'heNormal' }),
                tf.layers.dense({ units: 1, activation: 'linear' })
            ]
        });
    }
    
    // Compile model
    aiModel.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
        metrics: ['mae']
    });
    
    // Training configuration
    const epochs = 500;
    lossHistory = [];
    
    // Setup loss chart
    setupLossChart();
    
    // Train model
    await aiModel.fit(normalizedInputs, outputs, {
        epochs: epochs,
        batchSize: Math.min(32, trainingData.length),
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
                
                if ((epoch + 1) % 10 === 0 || epoch === epochs - 1) {
                    updateLossChart();
                }
                
                await tf.nextFrame();
            }
        }
    });
    
    // Store normalization parameters
    aiModel.inputMean = await inputMean.array();
    aiModel.inputStd = await inputStd.array();
    aiModel.architecture = selectedArchitecture;
    
    // Store in global variable
    window.trainedAIModel = aiModel;
    
    // Show completion
    const archName = selectedArchitecture === 'simple' ? 'Simple Network' : 'Deep Network';
    document.getElementById('training-complete').style.display = 'block';
    document.getElementById('final-data-count').textContent = trainingData.length;
    document.getElementById('final-arch-name').textContent = archName;
    document.getElementById('final-loss').textContent = lossHistory[lossHistory.length - 1].loss.toFixed(6);
    
    // Cleanup tensors
    inputs.dispose();
    outputs.dispose();
    normalizedInputs.dispose();
    inputMean.dispose();
    inputStd.dispose();
    
    isTraining = false;
}

// Setup loss chart canvas
function setupLossChart() {
    const canvas = document.getElementById('loss-canvas');
    const container = canvas.parentElement;
    canvas.width = container.clientWidth - 32;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Update loss chart with beautiful rendering
function updateLossChart() {
    const canvas = document.getElementById('loss-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, width, height);
    
    if (lossHistory.length < 2) return;
    
    const padding = { top: 40, right: 40, bottom: 50, left: 70 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Find min/max for scaling
    const losses = lossHistory.map(h => h.loss);
    const maxLoss = Math.max(...losses);
    const minLoss = Math.min(...losses);
    const range = maxLoss - minLoss || 1;
    
    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    const numHLines = 5;
    for (let i = 0; i <= numHLines; i++) {
        const y = padding.top + (chartHeight / numHLines) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();
        
        // Y-axis labels
        const value = maxLoss - (range / numHLines) * i;
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(value.toFixed(4), padding.left - 10, y);
    }
    
    // Draw vertical grid lines
    const numVLines = 5;
    for (let i = 0; i <= numVLines; i++) {
        const x = padding.left + (chartWidth / numVLines) * i;
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + chartHeight);
        ctx.stroke();
        
        // X-axis labels
        const epoch = Math.round((lossHistory.length / numVLines) * i);
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
    
    // Draw loss curve with gradient
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
    
    // Fill area under curve
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.closePath();
    
    const areaGradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
    areaGradient.addColorStop(0, 'rgba(168, 85, 247, 0.3)');
    areaGradient.addColorStop(1, 'rgba(124, 58, 237, 0.1)');
    ctx.fillStyle = areaGradient;
    ctx.fill();
    
    // Draw current point
    if (lossHistory.length > 0) {
        const lastIndex = lossHistory.length - 1;
        const lastLoss = lossHistory[lastIndex].loss;
        const x = padding.left + (lastIndex / (lossHistory.length - 1)) * chartWidth;
        const normalizedLoss = (lastLoss - minLoss) / range;
        const y = padding.top + chartHeight - (normalizedLoss * chartHeight);
        
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Draw title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Training Loss Over Time', width / 2, 10);
    
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
    
    // Draw current loss value
    if (lossHistory.length > 0) {
        const currentLoss = lossHistory[lossHistory.length - 1].loss;
        ctx.fillStyle = '#a855f7';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Current Loss: ${currentLoss.toFixed(6)}`, padding.left + 10, padding.top + 10);
    }
}

// Make prediction with trained model
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
    const result = await prediction.data();
    
    inputTensor.dispose();
    prediction.dispose();
    
    return result[0];
}
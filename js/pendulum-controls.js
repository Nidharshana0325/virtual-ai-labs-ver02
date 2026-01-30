// UI Controls and Navigation for Pendulum Experiment

function goBack() {
    window.location.href = '../index.html';
}

function showTheory() {
    document.getElementById('theory-view').style.display = 'block';
    document.getElementById('formula-view').style.display = 'none';
    document.getElementById('ai-view').style.display = 'none';
}

function showFormulaMode() {
    document.getElementById('theory-view').style.display = 'none';
    document.getElementById('formula-view').style.display = 'block';
    document.getElementById('ai-view').style.display = 'none';
}

function showAIMode() {
    document.getElementById('theory-view').style.display = 'none';
    document.getElementById('formula-view').style.display = 'none';
    document.getElementById('ai-view').style.display = 'block';
    
    if (!document.getElementById('ai-length-slider')) {
        initializeAISliders();
    }
    showAICollect();
}

function showAICollect() {
    document.getElementById('ai-collect').style.display = 'block';
    document.getElementById('ai-train').style.display = 'none';
    document.getElementById('ai-simulate').style.display = 'none';
}

function showAISimulate() {
    document.getElementById('ai-collect').style.display = 'none';
    document.getElementById('ai-train').style.display = 'none';
    document.getElementById('ai-simulate').style.display = 'block';
    document.getElementById('ai-data-count').textContent = trainingData.length;
    
    if (!document.getElementById('aisim-length-slider')) {
        initializeAISimulateSliders();
    }
}

function startTrainingWithArchitecture() {
    const selectedRadio = document.querySelector('input[name="architecture"]:checked');
    selectedArchitecture = selectedRadio ? selectedRadio.value : 'simple';
    
    startTraining();
}

function updateSlider(param, value) {
    const displayValue = parseFloat(value).toFixed(2);
    document.getElementById(`${param}-value`).textContent = displayValue;
    updateParameter(param, value);
}

function updateAISlider(param, value) {
    const displayValue = parseFloat(value).toFixed(2);
    document.getElementById(`ai-${param}-value`).textContent = displayValue;
}

function updateAISimSlider(param, value) {
    const displayValue = parseFloat(value).toFixed(2);
    document.getElementById(`aisim-${param}-value`).textContent = displayValue;
}

function initializeAISliders() {
    const container = document.getElementById('ai-sliders');
    container.innerHTML = '';
    
    aiParameters.forEach(param => {
        const sliderGroup = document.createElement('div');
        sliderGroup.className = `slider-group ${param.formula ? 'formula-param' : 'reallife-param'}`;
        sliderGroup.innerHTML = `
            <div class="slider-header">
                <div class="slider-label">
                    <span class="param-badge ${param.formula ? 'formula' : 'reallife'}">${param.formula ? 'FORMULA' : 'REAL-LIFE'}</span>
                    <span>${param.name}</span>
                </div>
                <span class="slider-value" id="ai-${param.key}-value">${param.default.toFixed(2)}</span>
            </div>
            <input type="range" class="slider" id="ai-${param.key}-slider" 
                   min="${param.min}" max="${param.max}" step="${param.step}" value="${param.default}" 
                   oninput="updateAISlider('${param.key}', this.value)">
            <div class="slider-range">
                <span>${param.min}</span>
                <span>${param.max}</span>
            </div>
        `;
        container.appendChild(sliderGroup);
    });
}

function initializeAISimulateSliders() {
    const container = document.getElementById('ai-simulate-sliders');
    container.innerHTML = '';
    
    aiParameters.forEach(param => {
        const sliderGroup = document.createElement('div');
        sliderGroup.className = `slider-group ${param.formula ? 'formula-param' : 'reallife-param'}`;
        sliderGroup.innerHTML = `
            <div class="slider-header">
                <div class="slider-label">
                    <span class="param-badge ${param.formula ? 'formula' : 'reallife'}">${param.formula ? 'FORMULA' : 'REAL-LIFE'}</span>
                    <span>${param.name}</span>
                </div>
                <span class="slider-value" id="aisim-${param.key}-value">${param.default.toFixed(2)}</span>
            </div>
            <input type="range" class="slider" id="aisim-${param.key}-slider" 
                   min="${param.min}" max="${param.max}" step="${param.step}" value="${param.default}" 
                   oninput="updateAISimSlider('${param.key}', this.value)">
            <div class="slider-range">
                <span>${param.min}</span>
                <span>${param.max}</span>
            </div>
        `;
        container.appendChild(sliderGroup);
    });
}

function simulateFormula() {
    const length = parseFloat(document.getElementById('length-slider').value);
    const gravity = parseFloat(document.getElementById('gravity-slider').value);
    const temperature = parseFloat(document.getElementById('temperature-slider').value);
    
    const period = calculateIdealPeriod(length, gravity, temperature);
    const frequency = 1 / period;
    
    updateParameter('length', length);
    updateParameter('gravity', gravity);
    updateParameter('temperature', temperature);
    
    showSimulationResult('Formula', period, {
        frequency,
        note: 'Only formula parameters (L, g, T) affect this result. Real-life factors change simulation visually.'
    });
    
    resetSimulation();
    startSimulation();
    
    setTimeout(() => {
        stopSimulation();
    }, period * simParams.oscillationCount * 1000);
}

async function simulateAI() {
    if (!window.trainedAIModel || typeof window.trainedAIModel.predict !== 'function') {
        alert('Please train the AI model first!');
        return;
    }
    
    const params = {};
    aiParameters.forEach(p => {
        const slider = document.getElementById(`aisim-${p.key}-slider`);
        params[p.key] = slider ? parseFloat(slider.value) : p.default;
    });
    
    // Update simulation parameters
    Object.keys(params).forEach(key => {
        updateParameter(key, params[key]);
    });
    
    const aiPrediction = await predictWithAI(params);
    if (!aiPrediction) {
        alert('AI prediction failed.');
        return;
    }
    
    const formulaPrediction = calculateIdealPeriod(params.length, params.gravity, params.temperature);
    const frequency = 1 / aiPrediction;
    
    showSimulationResult('AI Model', aiPrediction, {
        frequency,
        params,
        formulaPrediction,
        difference: Math.abs(aiPrediction - formulaPrediction),
        note: 'AI considers ALL 10 parameters including real-world factors!'
    });
    
    resetSimulation();
    startSimulation();
    
    setTimeout(() => {
        stopSimulation();
    }, aiPrediction * params.oscillationCount * 1000);
}

function showSimulationResult(mode, period, details) {
    let overlay = document.getElementById('result-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'result-overlay';
        overlay.style.cssText = `
            position: fixed; top: 80px; left: 20px;
            background: linear-gradient(135deg, rgba(0, 255, 255, 0.15), rgba(168, 85, 247, 0.15));
            backdrop-filter: blur(10px); border: 2px solid var(--cyan); border-radius: 1rem;
            padding: 1.5rem; max-width: 400px; z-index: 1000;
            box-shadow: 0 10px 40px rgba(0, 255, 255, 0.3);
        `;
        document.body.appendChild(overlay);
    }
    
    let content = `
        <h3 style="color: var(--cyan); margin-bottom: 1rem;">${mode} Result</h3>
        <div style="background: rgba(0, 0, 0, 0.3); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">
            <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Period (T)</div>
            <div style="font-size: 2rem; color: var(--cyan); font-weight: bold;">${period.toFixed(4)}s</div>
            <div style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 0.5rem;">Frequency (f)</div>
            <div style="font-size: 1.5rem; color: var(--purple); font-weight: bold;">${details.frequency.toFixed(4)}Hz</div>
        </div>
    `;
    
    if (details.formulaPrediction) {
        content += `
            <div style="background: rgba(168, 85, 247, 0.1); padding: 0.75rem; border-radius: 0.5rem; margin-bottom: 0.75rem;">
                <div style="font-size: 0.85rem; color: var(--text-secondary);">Formula: ${details.formulaPrediction.toFixed(4)}s</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">Difference: ${details.difference.toFixed(4)}s</div>
            </div>
        `;
    }
    
    if (details.note) {
        content += `<div style="background: rgba(168, 85, 247, 0.1); padding: 0.75rem; border-radius: 0.5rem; font-size: 0.9rem;">${details.note}</div>`;
    }
    
    content += `<button onclick="closeResultOverlay()" style="margin-top: 1rem; width: 100%; padding: 0.75rem; background: transparent; border: 1px solid var(--cyan); color: var(--cyan); border-radius: 0.5rem; cursor: pointer;">Close</button>`;
    
    overlay.innerHTML = content;
}

function closeResultOverlay() {
    const overlay = document.getElementById('result-overlay');
    if (overlay) overlay.remove();
}

document.addEventListener('DOMContentLoaded', () => {
    const archOptions = document.querySelectorAll('.architecture-option');
    archOptions.forEach(option => {
        option.addEventListener('click', function() {
            archOptions.forEach(opt => opt.style.border = '2px solid transparent');
            this.style.border = '2px solid var(--cyan)';
        });
    });
    const checkedOption = document.querySelector('.architecture-option input:checked')?.closest('.architecture-option');
    if (checkedOption) checkedOption.style.border = '2px solid var(--cyan)';
});
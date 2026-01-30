// UI Controls for Separation Experiment
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
    
    if (!document.getElementById('ai-magnetic-slider')) {
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
    
    if (!document.getElementById('aisim-magnetic-slider')) {
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
    const magnetic = parseFloat(document.getElementById('magnetic-slider').value);
    const solvent = parseFloat(document.getElementById('solvent-slider').value);
    const evaporation = parseFloat(document.getElementById('evaporation-slider').value);
    
    const efficiency = calculateIdealEfficiency(magnetic, solvent, evaporation);
    
    updateParameter('magnetic', magnetic);
    updateParameter('solvent', solvent);
    updateParameter('evaporation', evaporation);
    
    showSimulationResult('Formula', efficiency, {
        magnetic,
        solvent,
        evaporation,
        breakdown: {
            'Magnetic (E_m)': Math.min(25, (magnetic / 2.0) * 25).toFixed(1) + '%',
            'Dissolution (E_d)': Math.min(25, 25 * Math.min(1, solvent / 30)).toFixed(1) + '%',
            'Filtration (E_f)': '25.0%',
            'Evaporation (E_e)': Math.min(25, 25 * Math.min(1, evaporation / 12.5)).toFixed(1) + '%'
        },
        note: 'Formula considers only 3 primary parameters. Real-life factors affect actual results.'
    });
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
    
    const aiPrediction = await predictWithAI(params);
    if (!aiPrediction) {
        alert('AI prediction failed.');
        return;
    }
    
    const formulaPrediction = calculateIdealEfficiency(params.magnetic, params.solvent, params.evaporation);
    
    showSimulationResult('AI Model', aiPrediction, {
        params,
        formulaPrediction,
        difference: Math.abs(aiPrediction - formulaPrediction),
        note: 'AI considers ALL 10 parameters including particle size, stirring, temperature, filter properties, impurities, time, and manual skill!'
    });
}

function showSimulationResult(mode, efficiency, details) {
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
            <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Overall Efficiency</div>
            <div style="font-size: 2rem; color: var(--cyan); font-weight: bold;">${efficiency.toFixed(2)}%</div>
        </div>
    `;
    
    if (details.breakdown) {
        content += `
            <div style="background: rgba(168, 85, 247, 0.1); padding: 0.75rem; border-radius: 0.5rem; margin-bottom: 0.75rem;">
                <div style="font-size: 0.9rem; color: var(--purple); font-weight: bold; margin-bottom: 0.5rem;">Efficiency Breakdown:</div>
        `;
        Object.entries(details.breakdown).forEach(([key, value]) => {
            content += `<div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">${key}: ${value}</div>`;
        });
        content += `</div>`;
    }
    
    if (details.formulaPrediction) {
        content += `
            <div style="background: rgba(168, 85, 247, 0.1); padding: 0.75rem; border-radius: 0.5rem; margin-bottom: 0.75rem;">
                <div style="font-size: 0.85rem; color: var(--text-secondary);">Formula Prediction: ${details.formulaPrediction.toFixed(2)}%</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">Difference: ${details.difference.toFixed(2)}%</div>
                ${details.difference > 10 ? '<div style="font-size: 0.85rem; color: var(--cyan); margin-top: 0.25rem;">⚠️ Large difference indicates significant real-world effects!</div>' : ''}
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
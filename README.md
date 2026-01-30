# Open terminal in the project folder
python -m http.server 8000
# Then open: http://localhost:8000
# 📋 EXPERIMENT TEMPLATE GUIDE

## How to Create New Experiments

This guide helps you replicate the experiment structure for Chemistry and Biology labs.

---

## 🧬 Required Files for Each Experiment

For each new experiment, you need:

1. **HTML File**: `experiments/your-experiment.html`
2. **Simulation JS**: `js/your-experiment-simulation.js`
3. **AI Logic JS**: `js/your-experiment-ai.js`
4. **Controls JS**: `js/your-experiment-controls.js`

---

## 📝 Step-by-Step Creation Process

### Step 1: Define Your Experiment

Answer these questions:

1. **What's the main formula/relationship?**
   - Example: T = 2π√(L/g) for pendulum
   - Example: Rate = k[A]^m[B]^n for reactions

2. **What are the 3 formula parameters?**
   - These should appear in the main equation
   - Example: Length, Gravity, Temperature

3. **What are the 7 real-life parameters?**
   - These affect outcomes but aren't in formula
   - Example: Air resistance, mass, medium density

4. **What should the 3D visualization show?**
   - Example: Swinging pendulum
   - Example: Dissolving solute particles
   - Example: Growing plant with roots/leaves

---
## ✅ Testing Checklist

Before considering the experiment complete:

### Visual
- [ ] 3D scene renders correctly
- [ ] Objects are visible and sized appropriately
- [ ] Lighting looks good
- [ ] Camera controls work (rotate, zoom, pan)
- [ ] Colors match theme (cyan/purple)

### Functionality
- [ ] Theory page displays correctly
- [ ] All 10 sliders work
- [ ] Formula mode calculates correctly
- [ ] Only formula params affect result in formula mode
- [ ] AI data collection works (5+ points)
- [ ] AI training completes successfully
- [ ] AI predictions work
- [ ] Simulations run smoothly

### Educational
- [ ] Formula explanation is clear
- [ ] Parameters are well explained
- [ ] Fun fact is interesting
- [ ] Distinction between ideal/real is clear
- [ ] Students can learn from it
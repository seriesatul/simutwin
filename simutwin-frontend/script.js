window.onload = () => {
    const socket = io("http://localhost:4000");

    socket.on("connect", () => {
        console.log("Connected to the SimuTwin Engine!");
        document.getElementById('sim-status').textContent = 'Ready';
    });

    const canvas = new fabric.Canvas('factory-canvas', {
        width: document.getElementById('canvas-container').clientWidth,
        height: document.getElementById('canvas-container').clientHeight,
        backgroundColor: '#fafafa'
    });

    // --- Get references to ALL UI elements, including new ones ---
    const addMachineBtn = document.getElementById('add-machine-btn');
    const addConveyorBtn = document.getElementById('add-conveyor-btn');
    const runBtn = document.getElementById('run-btn');
    const resetBtn = document.getElementById('reset-btn');
    const inspectorPanel = document.getElementById('inspector-panel');
    const inspectorTitle = document.getElementById('inspector-title');
    const nameInput = document.getElementById('name-input');
    const descriptionInput = document.getElementById('description-input');
    const processingTimeInput = document.getElementById('processing-time-input');
    const productsCompletedSpan = document.getElementById('products-completed');
    const simStatusSpan = document.getElementById('sim-status');

    let machineIdCounter = 0, conveyorIdCounter = 0;
    const productVisuals = {};

    // --- Create Objects with Text Labels ---
    addMachineBtn.addEventListener('click', () => {
        machineIdCounter++;
        const machineName = `Machine ${machineIdCounter}`;
        
        // Create a rectangle and a text label
        const rect = new fabric.Rect({ fill: '#007bff', width: 100, height: 80, originX: 'center', originY: 'center' });
        const label = new fabric.Text(machineName, { fontSize: 14, fill: 'white', originX: 'center', originY: 'center' });
        
        // Group them together so they move as one
        const group = new fabric.Group([rect, label], {
            left: 70 + (machineIdCounter - 1) * 170, top: 150,
            id: `M-${machineIdCounter}`,
            // Store custom properties directly on the group
            name: machineName,
            description: '',
            processingTime: 5
        });
        canvas.add(group);
    });

    addConveyorBtn.addEventListener('click', () => {
        conveyorIdCounter++;
        const conveyorName = `Conveyor ${conveyorIdCounter}`;
        
        const rect = new fabric.Rect({ fill: '#6c757d', width: 200, height: 25, originX: 'center', originY: 'center' });
        const label = new fabric.Text(conveyorName, { fontSize: 12, fill: 'white', originX: 'center', originY: 'center' });
        
        const group = new fabric.Group([rect, label], {
            left: 150, top: 250 + (conveyorIdCounter - 1) * 50,
            id: `C-${conveyorIdCounter}`,
            name: conveyorName,
            description: ''
        });
        canvas.add(group);
    });

    // --- Fully Functional Inspector Panel ---
    canvas.on('mouse:down', (options) => {
        if (options.target) {
            const selectedObj = options.target;
            inspectorPanel.classList.remove('hidden');
            inspectorTitle.innerText = `Properties for ${selectedObj.name}`;
            
            // Populate all fields from the object's properties
            nameInput.value = selectedObj.name;
            descriptionInput.value = selectedObj.description;

            // Only show the processing time field for machines
            if (selectedObj.id && selectedObj.id.startsWith('M-')) {
                processingTimeInput.parentElement.style.display = 'block';
                processingTimeInput.value = selectedObj.processingTime;
            } else {
                processingTimeInput.parentElement.style.display = 'none';
            }
            canvas.setActiveObject(selectedObj);
        } else {
            inspectorPanel.classList.add('hidden');
            canvas.discardActiveObject();
            canvas.renderAll();
        }
    });

    // --- Live Updates from Inspector Panel to Canvas Object ---
    const updateObjectProperties = () => {
        const activeObj = canvas.getActiveObject();
        if (!activeObj) return;
        
        const newName = nameInput.value;
        // Update the visual text label inside the group
        const textObject = activeObj._objects[1]; // The text is the 2nd item in the group
        if (textObject && textObject.text !== newName) {
            textObject.set('text', newName);
        }

        // Update the custom properties on the group object
        activeObj.set('name', newName);
        activeObj.set('description', descriptionInput.value);
        if (activeObj.id.startsWith('M-')) {
            activeObj.set('processingTime', parseInt(processingTimeInput.value, 10) || 5);
        }
        canvas.renderAll();
    };

    nameInput.addEventListener('input', updateObjectProperties);
    descriptionInput.addEventListener('input', updateObjectProperties);
    processingTimeInput.addEventListener('input', updateObjectProperties);

    // --- Run Button (sends all the new data) ---
    runBtn.addEventListener('click', () => {
        const layoutObjects = canvas.getObjects();
        const simplifiedLayout = layoutObjects.map(obj => ({
            id: obj.id,
            name: obj.name, // <-- Send name
            description: obj.description, // <-- Send description
            customType: (obj.id && obj.id.startsWith('M-')) ? 'machine' : 'other',
            left: obj.left, top: obj.top,
            width: obj.width * (obj.scaleX || 1),
            height: obj.height * (obj.scaleY || 1),
            processingTime: obj.processingTime
        }));
        socket.emit('start-simulation', simplifiedLayout);
    });
    
    // --- Reset Button (unchanged but included for completeness) ---
    resetBtn.addEventListener('click', () => {
        for (const visualId in productVisuals) { canvas.remove(productVisuals[visualId]); }
        Object.keys(productVisuals).forEach(key => delete productVisuals[key]);
        simStatusSpan.textContent = 'Resetting...';
        productsCompletedSpan.textContent = '0';
        canvas.renderAll();
        socket.emit('reset-simulation');
    });

    socket.on('simulation-reset', () => {
        simStatusSpan.textContent = 'Ready';
        console.log('Simulation has been reset by the server.');
        // Reset machine colors
        canvas.getObjects().forEach(obj => {
            if (obj.id && obj.id.startsWith('M-')) {
                obj._objects[0].set('fill', '#007bff');
            }
        });
        canvas.renderAll();
    });

    // --- Simulation Update (with Bottleneck Visualization) ---
    socket.on('simulation-update', (state) => {
        simStatusSpan.textContent = 'Running';
        productsCompletedSpan.textContent = state.totalProductsFinished;

        // --- NEW: Update machine colors based on bottleneck status ---
        state.machines.forEach(machineData => {
            const machineObject = canvas.getObjects().find(obj => obj.id === machineData.id);
            if (machineObject) {
                const shape = machineObject._objects[0]; // The rectangle inside the group
                const color = machineData.isBottleneck ? '#dc3545' : '#007bff'; // Red if bottleneck, else blue
                if (shape.fill !== color) {
                    shape.set('fill', color);
                }
            }
        });

        // (Product animation logic is unchanged)
        state.products.forEach(productData => {
            const targetPos = { left: productData.x, top: productData.y };
            if (productVisuals[productData.id]) {
                productVisuals[productData.id].animate(targetPos, {
                    duration: 400,
                    onChange: canvas.renderAll.bind(canvas),
                    easing: fabric.util.ease.easeInOutQuad
                });
            } else {
                const newProductVisual = new fabric.Circle({
                    ...targetPos, radius: 10, fill: '#28a745',
                    originX: 'center', originY: 'center'
                });
                canvas.add(newProductVisual);
                productVisuals[productData.id] = newProductVisual;
            }
        });

        for (const visualId in productVisuals) {
            if (!state.products.find(p => p.id === visualId)) {
                canvas.remove(productVisuals[visualId]);
                delete productVisuals[visualId];
            }
        }
        canvas.renderAll();
    });
};
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- CHANGE 1: The Machine class now stores name and description ---
class Machine {
    constructor(name, description, processingTime, id, left, top, width, height) {
        this.name = name;
        this.description = description; // <-- ADDED
        this.processingTime = processingTime; 
        this.id = id;
        this.left = left; this.top = top; this.width = width; this.height = height;
        this.currentProduct = null; this.timeRemaining = 0; this.productsCompleted = 0;
    }
    startWork(product) { if (!this.currentProduct) { this.currentProduct = product; this.timeRemaining = this.processingTime; return true; } return false; }
    simulateTick() { if (this.currentProduct) { this.timeRemaining--; if (this.timeRemaining <= 0) { const finishedProduct = this.currentProduct; this.currentProduct = null; this.productsCompleted++; return finishedProduct; } } return null; }
}

// --- Main Server Logic ---
io.on('connection', (socket) => {
    console.log('A user connected!');
    let simulationInterval;

    socket.on('start-simulation', (layout) => {
        console.log('Received layout, starting simulation...');
        if (simulationInterval) clearInterval(simulationInterval);

        // --- Use the user-defined name, description, and processing time ---
        const factoryLine = layout.filter(obj => obj.customType === 'machine').sort((a, b) => a.left - b.left)
            .map(obj => new Machine(obj.name, obj.description, obj.processingTime || 5, obj.id, obj.left, obj.top, obj.width, obj.height));

        if (factoryLine.length === 0) { console.log("Cannot start simulation: No machines in layout."); return; }
        
        // --- CHANGE 2: Simple AI - Bottleneck Detection ---
        // Find the longest processing time among all machines. This is our bottleneck.
        const maxProcessingTime = Math.max(...factoryLine.map(m => m.processingTime));

        let productCounter = 0;
        const products = {};
        let totalProductsFinished = 0;

        simulationInterval = setInterval(() => {
            for (let i = factoryLine.length - 1; i >= 0; i--) {
                const finishedProduct = factoryLine[i].simulateTick();
                if (finishedProduct) {
                    const nextMachine = factoryLine[i + 1];
                    if (nextMachine) { 
                        nextMachine.startWork(finishedProduct); 
                    } else { 
                        delete products[finishedProduct.id];
                        totalProductsFinished++;
                    }
                }
            }

            productCounter++;
            const newProduct = { id: `P-${productCounter}` };
            if (factoryLine.length > 0 && factoryLine[0].startWork(newProduct)) {
               products[newProduct.id] = { id: newProduct.id };
            }

            factoryLine.forEach(machine => {
                if (machine.currentProduct) {
                    const product = products[machine.currentProduct.id];
                    if(product) {
                        product.x = machine.left + (machine.width / 2);
                        product.y = machine.top + (machine.height / 2);
                    }
                }
            });
            
            // --- CHANGE 3: Enrich the data packet with bottleneck info ---
            const machineStatuses = factoryLine.map(machine => ({
                id: machine.id,
                isBottleneck: machine.processingTime === maxProcessingTime
            }));
            
            const updateData = { 
                products: Object.values(products),
                totalProductsFinished: totalProductsFinished,
                machines: machineStatuses // <-- SEND THE NEW DATA
            };
            
            socket.emit('simulation-update', updateData);

        }, 1000);
    });
    
    socket.on('reset-simulation', () => {
        console.log('Received reset command. Stopping simulation.');
        clearInterval(simulationInterval);
        socket.emit('simulation-reset');
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
        clearInterval(simulationInterval);
    });
});

const PORT = 4000;
server.listen(PORT, () => {
    console.log(`SimuTwin Engine listening on http://localhost:${PORT}`);
});
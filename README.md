# SimuTwin: A Smart Factory Simulator

SimuTwin is a full-stack web application that provides an accessible, web-based Digital Twin to help small and medium-sized factories find and fix costly bottlenecks.

https://www.linkedin.com/posts/atul-singh-chauhan-a955b529b_fullstackdevelopment-nodejs-javascript-activity-7378050290245124096-lPt5?utm_source=social_share_send&utm_medium=member_desktop_web&rcm=ACoAAEiGjtEBGTOP9XtZZTHqFYI_687RbG2hpcw
<!-- Link your YouTube video here -->


---

## Key Features

- **Drag-and-Drop Factory Builder:** Intuitively model a production line with machines and conveyors.
- **Real-Time Simulation:** Run a powerful simulation powered by a Node.js backend.
- **Automatic Bottleneck Detection:** The system intelligently analyzes machine data and visually highlights the slowest components in red.
- **Realistic Visual Queues:** Products are shown physically moving along conveyors and forming queues behind busy machines.
- **"What-If" Scenario Testing:** Easily change machine properties (like processing time) to test upgrades and validate business decisions risk-free.
- **Persistent Layouts:** The factory layout is automatically saved to the browser's local storage for a seamless user experience.

## Technology Stack

- **Backend:** Node.js, Express.js
- **Real-Time Communication:** Socket.IO (WebSockets)
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Canvas Library:** Fabric.js for interactive object manipulation

## How to Run Locally

1.  **Backend:**
    ```bash
    cd simutwin-engine
    npm install
    node index.js
    ```
    (The backend will be running on `http://localhost:4000`)

2.  **Frontend:**
    ```bash
    cd simutwin-frontend
    # Use a simple live server to avoid CORS issues
    npx serve
    ```
    (The frontend will be accessible at `http://localhost:3000`)

// WebSocket Configuration
const WS_CONFIG = {
    url: 'ws://10.25.74.7:8080', // WebSocket server URL
    apiUrl: 'http://10.25.74.7:8080', // HTTP API for historical data
    reconnectInterval: 3000 // Reconnect after 3 seconds if connection drops
};

// PPM thresholds
const THRESHOLDS = {
    safe: 35,      // Below 35 ppm is safe
    warning: 50,   // 35-49 ppm is warning
    danger: 50     // 50+ ppm is dangerous
};

// WebSocket Connection Manager
class SensorWebSocket {
    constructor(url) {
        this.url = url;
        this.ws = null;
        this.reconnectTimer = null;
        this.isConnected = false;
        this.messageHandlers = [];
        this.sensorData = new Map(); // Store latest data for each device UUID
        this.historyData = new Map(); // Store historical readings by UUID
        this.sensorRegistry = new Map(); // Map UUID -> {name, location, index, uuid}
        this.nextSensorIndex = 0; // Auto-increment index for new sensors
    }

    connect() {
        try {
            console.log('Connecting to WebSocket:', this.url);
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.isConnected = true;
                this.updateConnectionStatus(true);
                
                // Clear reconnect timer if exists
                if (this.reconnectTimer) {
                    clearTimeout(this.reconnectTimer);
                    this.reconnectTimer = null;
                }
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    // Check if data is an array (batch of readings)
                    if (Array.isArray(data)) {
                        console.log(`📦 Received ${data.length} sensor readings`);
                        data.forEach(reading => this.handleMessage(reading));
                    } else {
                        // Single reading
                        this.handleMessage(data);
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateConnectionStatus(false);
            };

            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.isConnected = false;
                this.updateConnectionStatus(false);
                this.scheduleReconnect();
            };

        } catch (error) {
            console.error('Failed to create WebSocket:', error);
            this.scheduleReconnect();
        }
    }

    handleMessage(data) {
        // Expected format from server:
        // {
        //   "id": "019ac63e-f51c-763d-90c6-2e4a8680388d",
        //   "sensor_id": "019ac63e-f51c-763d-90c6-2e4a8680388d",
        //   "name": "Kitchen Sensor",
        //   "location": "Main Kitchen",
        //   "value": 45.5,
        //   "timestamp": 1764261279
        // }

        if (!data.id || data.value === undefined || !data.timestamp) {
            console.warn('Invalid data format:', data);
            return;
        }

        // Use sensor_id as the device identifier
        const uuid = data.sensor_id || data.id;
        
        // Auto-register new sensor if not seen before
        if (!this.sensorRegistry.has(uuid)) {
            const sensorIndex = this.nextSensorIndex++;
            this.sensorRegistry.set(uuid, {
                uuid: uuid,
                name: data.name || `Sensor ${sensorIndex + 1}`,
                location: data.location || 'Unknown',
                index: sensorIndex
            });
            console.log(`🆕 New sensor registered: ${data.name || uuid}`);
            
            // Regenerate sensor cards to include new sensor
            if (typeof generateSensorCards === 'function') {
                generateSensorCards();
            }
        } else {
            // Update sensor info if name/location changed
            const sensor = this.sensorRegistry.get(uuid);
            if (data.name && sensor.name !== data.name) {
                sensor.name = data.name;
                if (typeof updateSensorCardInfo === 'function') {
                    updateSensorCardInfo(sensor.index);
                }
            }
            if (data.location && sensor.location !== data.location) {
                sensor.location = data.location;
                if (typeof updateSensorCardInfo === 'function') {
                    updateSensorCardInfo(sensor.index);
                }
            }
        }
        
        const sensorInfo = this.sensorRegistry.get(uuid);
        const sensorIndex = sensorInfo.index;
        
        // Store the latest data with UUID as key
        this.sensorData.set(uuid, {
            value: data.value,
            timestamp: data.timestamp,
            id: data.id,
            uuid: uuid,
            name: data.name || sensorInfo.name,
            location: data.location || sensorInfo.location,
            index: sensorIndex,
            receivedAt: Date.now()
        });

        // Add to history using UUID
        if (!this.historyData.has(uuid)) {
            this.historyData.set(uuid, []);
        }
        const history = this.historyData.get(uuid);
        history.push({
            value: data.value,
            timestamp: data.timestamp
        });
        
        // Keep only last 20 readings
        if (history.length > 20) {
            history.shift();
        }

        console.log(`📊 Received data from ${sensorInfo.name} (${uuid}):`, data.value, 'ppm');

        // Notify all handlers
        this.messageHandlers.forEach(handler => handler(sensorIndex, data));

        // Update UI
        this.updateUI(sensorIndex, data);
    }

    updateUI(sensorIndex, data) {
        const ppmValue = Math.round(data.value * 10) / 10; // Round to 1 decimal
        
        // Update gauge if on status detail screen
        const gaugeValue = document.getElementById('gas-value');
        if (gaugeValue && document.getElementById('status-detail').classList.contains('active')) {
            gaugeValue.textContent = Math.round(ppmValue);
            this.updateGauge(ppmValue);
        }

        // Update sensor cards on main screen
        this.updateSensorCard(sensorIndex, ppmValue);

        // Check if alert should be triggered
        if (ppmValue >= THRESHOLDS.danger) {
            this.triggerAlert(sensorIndex, ppmValue);
        }
    }

    updateGauge(value) {
        const gaugeFill = document.querySelector('.gauge-fill');
        const gaugeNumber = document.querySelector('.gauge-number');
        
        if (!gaugeFill) return;

        // Determine color based on thresholds
        let color, textColor;
        if (value >= THRESHOLDS.danger) {
            color = '#EF4444'; // Red
            textColor = '#EF4444';
        } else if (value >= THRESHOLDS.warning) {
            color = '#F59E0B'; // Orange
            textColor = '#F59E0B';
        } else {
            color = '#10B981'; // Green
            textColor = '#10B981';
        }

        gaugeFill.setAttribute('stroke', color);
        if (gaugeNumber) {
            gaugeNumber.style.color = textColor;
        }

        // Update gauge arc (scale: 0-100 ppm)
        const percentage = Math.min(100, (value / 100) * 100);
        const offset = 251.2 - (251.2 * percentage / 100);
        gaugeFill.setAttribute('stroke-dashoffset', offset);
    }

    updateSensorCard(sensorIndex, value) {
        // This updates the sensor cards on the main screen
        if (sensorIndex < 0 || sensorIndex >= WS_CONFIG.devices.length) {
            console.warn('Invalid sensor index:', sensorIndex);
            return;
        }

        const cards = document.querySelectorAll('.sensor-card');
        
        if (cards[sensorIndex]) {
            const statusElement = cards[sensorIndex].querySelector('.status-label');
            const statusContainer = cards[sensorIndex].querySelector('.sensor-status');
            const sensorIcon = cards[sensorIndex].querySelector('.sensor-icon');
            
            if (value >= THRESHOLDS.danger) {
                if (statusElement) statusElement.textContent = 'Peligro';
                if (statusContainer) statusContainer.className = 'sensor-status danger';
                if (sensorIcon) sensorIcon.className = 'sensor-icon danger';
            } else if (value >= THRESHOLDS.warning) {
                if (statusElement) statusElement.textContent = 'Advertencia';
                if (statusContainer) statusContainer.className = 'sensor-status warning';
                if (sensorIcon) sensorIcon.className = 'sensor-icon warning';
            } else {
                if (statusElement) statusElement.textContent = 'Sin riesgo';
                if (statusContainer) statusContainer.className = 'sensor-status safe';
                if (sensorIcon) sensorIcon.className = 'sensor-icon safe';
            }
        }
    }

    triggerAlert(sensorIndex, value) {
        console.warn('🚨 ALERT: Dangerous gas level detected!', value, 'ppm');
        
        // Update alert screen values
        const alertValue = document.querySelector('.alert-value.danger');
        if (alertValue) {
            alertValue.textContent = `${Math.round(value)} ppm`;
        }

        const alertTime = document.getElementById('alert-time');
        if (alertTime) {
            const now = new Date();
            alertTime.textContent = now.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        // Show alert screen if not already showing
        if (!document.getElementById('alert-screen').classList.contains('active')) {
            setTimeout(() => {
                showScreen('alert-screen');
            }, 500);
        }
    }

    updateConnectionStatus(connected) {
        // You can add a connection indicator in your UI
        console.log(connected ? '🟢 Connected' : '🔴 Disconnected');
        
        // Optional: Add visual indicator to UI
        const indicator = document.getElementById('connection-status');
        if (indicator) {
            indicator.textContent = connected ? '🟢 Conectado' : '🔴 Desconectado';
            indicator.className = connected ? 'status-online' : 'status-offline';
        }
    }

    scheduleReconnect() {
        if (this.reconnectTimer) return;
        
        console.log(`Reconnecting in ${WS_CONFIG.reconnectInterval / 1000} seconds...`);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, WS_CONFIG.reconnectInterval);
    }

    onMessage(handler) {
        this.messageHandlers.push(handler);
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    getLatestData(sensorIndex) {
        // Convert index to UUID
        const sensor = this.getSensorByIndex(sensorIndex);
        return sensor ? this.sensorData.get(sensor.uuid) : null;
    }

    getHistory(sensorIndex) {
        // Convert index to UUID
        const sensor = this.getSensorByIndex(sensorIndex);
        return sensor ? (this.historyData.get(sensor.uuid) || []) : [];
    }
    
    getUUID(sensorIndex) {
        const sensor = this.getSensorByIndex(sensorIndex);
        return sensor ? sensor.uuid : null;
    }
    
    getSensorInfo(sensorIndex) {
        return this.getSensorByIndex(sensorIndex) || { name: `Sensor ${sensorIndex + 1}`, location: 'Unknown', index: sensorIndex };
    }
    
    getSensorByIndex(index) {
        for (let sensor of this.sensorRegistry.values()) {
            if (sensor.index === index) {
                return sensor;
            }
        }
        return null;
    }
    
    getAllSensors() {
        return Array.from(this.sensorRegistry.values()).sort((a, b) => a.index - b.index);
    }

    // Fetch all sensors from the server
    async fetchAllSensors() {
        try {
            const url = `${WS_CONFIG.apiUrl}/sensor`;
            console.log('📥 Fetching all sensors from:', url);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const sensors = await response.json();
            
            if (Array.isArray(sensors)) {
                console.log(`✅ Found ${sensors.length} sensors`);
                
                // Register each sensor
                sensors.forEach((sensor) => {
                    if (sensor.id && !this.sensorRegistry.has(sensor.id)) {
                        const sensorIndex = this.nextSensorIndex++;
                        this.sensorRegistry.set(sensor.id, {
                            uuid: sensor.id,
                            name: sensor.name || `Sensor ${sensorIndex + 1}`,
                            location: sensor.location || 'Unknown',
                            index: sensorIndex
                        });
                        console.log(`✓ Registered: ${sensor.name || sensor.id}`);
                    }
                });
                
                // Generate sensor cards after registration
                if (typeof generateSensorCards === 'function') {
                    generateSensorCards();
                }
                
                return sensors;
            } else {
                console.warn('Sensor list is not an array:', sensors);
                return [];
            }
        } catch (error) {
            console.error('❌ Failed to fetch sensors:', error);
            return [];
        }
    }

    // Fetch historical data from HTTP API
    async fetchHistoricalData(sensorIndex) {
        try {
            const sensor = this.getSensorByIndex(sensorIndex);
            if (!sensor) {
                console.warn(`⚠️ No sensor found at index ${sensorIndex}`);
                return [];
            }
            
            const uuid = sensor.uuid;
            const url = `${WS_CONFIG.apiUrl}/sensor/${uuid}/history`;
            console.log(`📥 Fetching historical data for ${sensor.name} from:`, url);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (Array.isArray(data)) {
                console.log(`✅ Loaded ${data.length} historical readings for ${sensor.name}`);
                
                // Store in history using UUID
                this.historyData.set(uuid, data.map(reading => ({
                    value: reading.value,
                    timestamp: reading.timestamp,
                    id: reading.id
                })));
                
                return data;
            } else {
                console.warn('Historical data is not an array:', data);
                return [];
            }
        } catch (error) {
            console.error(`❌ Failed to fetch historical data for sensor ${sensorIndex}:`, error);
            return [];
        }
    }

    // Load all sensor histories
    async loadAllHistories() {
        const sensors = this.getAllSensors();
        const promises = sensors.map(sensor => 
            this.fetchHistoricalData(sensor.index)
        );
        
        try {
            await Promise.all(promises);
            console.log('✅ All historical data loaded');
        } catch (error) {
            console.error('❌ Error loading historical data:', error);
        }
    }
}

// Global WebSocket instance
let sensorWS = null;

// Initialize WebSocket when page loads
function initializeWebSocket() {
    if (sensorWS) {
        sensorWS.disconnect();
    }

    sensorWS = new SensorWebSocket(WS_CONFIG.url);
    
    // First, fetch all available sensors
    sensorWS.fetchAllSensors().then(() => {
        console.log('📡 Sensors registered, connecting WebSocket...');
        
        // Then connect to WebSocket for real-time updates
        sensorWS.connect();
        
        // Load historical data for all registered sensors
        return sensorWS.loadAllHistories();
    }).then(() => {
        console.log('📊 Historical data ready');
        // Update chart if on history screen
        updateHistoryChart();
    }).catch(error => {
        console.error('❌ Initialization error:', error);
        // Still try to connect WebSocket even if sensor fetch failed
        sensorWS.connect();
    });

    // Optional: Add custom message handler
    sensorWS.onMessage((deviceId, data) => {
        console.log('Custom handler:', deviceId, data.value);
        // Add any custom processing here
    });
}

// Export for use in script.js
window.sensorWebSocket = {
    init: initializeWebSocket,
    getInstance: () => sensorWS
};

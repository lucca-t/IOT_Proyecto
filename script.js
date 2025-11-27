// Screen management
function showScreen(screenId, sensorNum = null) {
    // Hide all screens
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.remove('active'));

    // Show selected screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }

    // Update sensor number and name if provided
    if (sensorNum) {
        const ws = window.sensorWebSocket?.getInstance();
        const sensorIndex = parseInt(sensorNum) - 1;
        const sensorInfo = ws?.getSensorInfo(sensorIndex);
        
        // Update status detail screen
        const statusSensorNameTitle = document.getElementById('status-sensor-name-title');
        const statusSensorName = document.getElementById('status-sensor-name');
        if (statusSensorNameTitle && sensorInfo) {
            statusSensorNameTitle.textContent = sensorInfo.name;
        }
        if (statusSensorName && sensorInfo) {
            statusSensorName.textContent = sensorInfo.uuid || '';
        }
        
        // Update history screen
        const historySensorNameTitle = document.getElementById('history-sensor-name-title');
        const historySensorName = document.getElementById('history-sensor-name');
        if (historySensorNameTitle && sensorInfo) {
            historySensorNameTitle.textContent = sensorInfo.name;
        }
        if (historySensorName && sensorInfo) {
            historySensorName.textContent = sensorInfo.uuid || '';
        }
        
        // Load history data for this sensor
        if (screenId === 'sensor-history') {
            updateHistoryChart();
        }
    }
}

// Mark alert as attended
function markAttended() {
    showScreen('sensor-list');
    // Show success notification
    showNotification('Alerta marcada como atendida', 'success');
}

// Show mock alert
function showMockAlert() {
    alert('¡ALERTA!\n\nNivel crítico de gas detectado\n\nNivel actual: 55 ppm\nUbicación: Cocina - Sensor 1\nHora: ' + new Date().toLocaleTimeString('es-ES'));
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10B981' : '#3B82F6'};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Simulate gas level monitoring with realistic variation
function updateGasLevel() {
    const gasValue = document.getElementById('gas-value');
    if (gasValue) {
        const currentValue = parseInt(gasValue.textContent) || 20;
        // Add small random variation (-3 to +3)
        const variation = Math.floor(Math.random() * 7) - 3;
        const newValue = Math.max(10, Math.min(100, currentValue + variation));
        
        gasValue.textContent = newValue;
        
        // Update gauge color based on level
        const gaugeFill = document.querySelector('.gauge-fill');
        const gaugeNumber = document.querySelector('.gauge-number');
        
        if (gaugeFill) {
            if (newValue >= 50) { // Dangerous level
                gaugeFill.setAttribute('stroke', '#EF4444'); // Red
                if (gaugeNumber) gaugeNumber.style.color = '#EF4444';
            } else if (newValue >= 35) { // Warning level
                gaugeFill.setAttribute('stroke', '#F59E0B'); // Orange
                if (gaugeNumber) gaugeNumber.style.color = '#F59E0B';
            } else { // Safe level (0-34)
                gaugeFill.setAttribute('stroke', '#10B981'); // Green
                if (gaugeNumber) gaugeNumber.style.color = '#10B981';
            }
            
            // Update gauge arc (251.2 is full circumference)
            // Scale: 0-100 ppm range
            const percentage = Math.min(100, (newValue / 100) * 100);
            const offset = 251.2 - (251.2 * percentage / 100);
            gaugeFill.setAttribute('stroke-dashoffset', offset);
        }
    }
}

// Update last reading time
function updateLastReading() {
    const lastReadingElement = document.getElementById('last-reading-time');
    if (lastReadingElement) {
        const now = new Date();
        const formattedDate = now.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        const formattedTime = now.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        lastReadingElement.textContent = `${formattedDate} ${formattedTime}`;
    }
}

// Update alert time
function updateAlertTime() {
    const alertTimeElement = document.getElementById('alert-time');
    if (alertTimeElement) {
        const now = new Date();
        const formattedTime = now.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        alertTimeElement.textContent = formattedTime;
    }
}

// Animate numbers
function animateValue(element, start, end, duration) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            element.textContent = Math.round(end);
            clearInterval(timer);
        } else {
            element.textContent = Math.round(current);
        }
    }, 16);
}

// Generate sensor cards dynamically based on config
function generateSensorCards() {
    const container = document.getElementById('sensor-container');
    if (!container) return;
    
    container.innerHTML = ''; // Clear existing cards
    
    const ws = window.sensorWebSocket?.getInstance();
    if (!ws) {
        console.log('⚠️ WebSocket not initialized yet');
        return;
    }
    
    const sensors = ws.getAllSensors();
    
    sensors.forEach((sensor) => {
        const sensorNum = sensor.index + 1;
        
        const card = document.createElement('div');
        card.className = 'sensor-card';
        card.setAttribute('data-sensor-index', sensor.index);
        card.onclick = () => showScreen('status-detail', sensorNum);
        
        card.innerHTML = `
            <div class="sensor-icon safe">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                    <path d="M2 17l10 5 10-5M2 12l10 5 10-5"></path>
                </svg>
            </div>
            <div class="sensor-info">
                <h3 class="sensor-name">${sensor.name}</h3>
                <p class="sensor-location">${sensor.uuid}</p>
            </div>
            <div class="sensor-status safe">
                <span class="status-dot"></span>
                <span class="status-label">Sin riesgo</span>
            </div>
            <svg class="sensor-arrow" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
        `;
        
        container.appendChild(card);
    });
    
    console.log(`✅ Generated ${container.children.length} sensor cards`);
}

// Update sensor card info dynamically when new data arrives
function updateSensorCardInfo(sensorIndex) {
    const ws = window.sensorWebSocket?.getInstance();
    if (!ws) return;
    
    const sensorInfo = ws.getSensorInfo(sensorIndex);
    const card = document.querySelector(`.sensor-card[data-sensor-index="${sensorIndex}"]`);
    
    if (card) {
        const nameElement = card.querySelector('.sensor-name');
        const locationElement = card.querySelector('.sensor-location');
        
        if (nameElement && sensorInfo.name) {
            nameElement.textContent = sensorInfo.name;
        }
        if (locationElement && sensorInfo.location) {
            locationElement.textContent = sensorInfo.location;
        }
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // Don't generate cards yet - wait for sensor data
    // generateSensorCards() will be called after fetchAllSensors()
    
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Show sensor list by default
    showScreen('sensor-list');

    // Initialize WebSocket connection for real-time data
    if (window.sensorWebSocket) {
        console.log('🔌 Initializing WebSocket connection...');
        window.sensorWebSocket.init();
    }

    // Fallback: Update gas levels every 10 seconds if WebSocket not available
    // This will be overridden by real WebSocket data
    setInterval(updateGasLevel, 10000);

    // Update last reading time every minute
    setInterval(updateLastReading, 60000);

    // Initial updates
    updateGasLevel();
    updateLastReading();
    
    // Add smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
});

// Navigation helpers
function goToSensorDetail(sensorNum) {
    showScreen('sensor-history', sensorNum);
}

function goToStatusDetail() {
    showScreen('status-detail');
}

function goHome() {
    showScreen('sensor-list');
}

// Update history chart with real data
function updateHistoryChart() {
    const sensorNum = document.getElementById('sensor-num')?.textContent || '1';
    
    // Get the sensor index (0-based) from sensor number (1-based)
    const sensorIndex = parseInt(sensorNum) - 1;
    
    if (!window.sensorWebSocket) return;
    
    const ws = window.sensorWebSocket.getInstance();
    if (!ws) return;
    
    const history = ws.getHistory(sensorIndex);
    
    if (history && history.length > 0) {
        console.log(`📈 Updating chart for Sensor ${sensorNum} with ${history.length} data points`);
        
        // Update the SVG chart with actual data
        updateChartSVG(history);
        
        // Update the reading cards with latest 3 readings
        const readingCards = document.querySelectorAll('.reading-card');
        const latestReadings = history.slice(-3).reverse();
        
        latestReadings.forEach((reading, index) => {
            if (readingCards[index]) {
                const valueElement = readingCards[index].querySelector('.reading-value');
                const timeElement = readingCards[index].querySelector('.reading-time');
                const statusElement = readingCards[index].querySelector('.reading-status');
                
                if (valueElement) {
                    valueElement.textContent = `${Math.round(reading.value)} ppm`;
                }
                
                if (timeElement) {
                    const date = new Date(reading.timestamp * 1000);
                    const timeText = date.toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    timeElement.querySelector('svg').nextSibling.textContent = ' ' + timeText;
                }
                
                if (statusElement) {
                    if (reading.value >= THRESHOLDS.danger) {
                        statusElement.textContent = 'Peligro';
                        statusElement.className = 'reading-status danger';
                    } else if (reading.value >= THRESHOLDS.warning) {
                        statusElement.textContent = 'Advertencia';
                        statusElement.className = 'reading-status warning';
                    } else {
                        statusElement.textContent = 'Sin riesgo';
                        statusElement.className = 'reading-status safe';
                    }
                }
            }
        });
    }
}

// Update the SVG chart with actual sensor data
function updateChartSVG(history) {
    const chartSvg = document.querySelector('.chart-svg');
    if (!chartSvg) return;
    
    // Chart dimensions
    const width = 700; // 750 - 50 for left margin
    const height = 250; // 300 - 50 for top/bottom margins
    const startX = 50;
    const startY = 50;
    const maxY = startY + height;
    
    // Get max PPM value for scaling (with minimum of 50 for scale)
    const maxPPM = Math.max(50, ...history.map(r => r.value), 50);
    const minPPM = 0;
    
    // Take last 10 readings for the chart
    const dataPoints = history.slice(-10);
    const numPoints = dataPoints.length;
    
    if (numPoints === 0) return;
    
    // Calculate X spacing
    const xSpacing = width / Math.max(numPoints - 1, 1);
    
    // Generate path data
    let pathData = '';
    let fillPathData = '';
    let circles = '';
    let xLabels = '';
    
    dataPoints.forEach((reading, index) => {
        const x = startX + (index * xSpacing);
        const ppm = reading.value;
        
        // Scale Y (invert because SVG Y increases downward)
        const y = maxY - ((ppm - minPPM) / (maxPPM - minPPM)) * height;
        
        // Build path
        if (index === 0) {
            pathData += `M ${x} ${y}`;
            fillPathData += `M ${x} ${y}`;
        } else {
            pathData += ` L ${x} ${y}`;
            fillPathData += ` L ${x} ${y}`;
        }
        
        // Add circle for data point
        circles += `<circle cx="${x}" cy="${y}" r="4" fill="#3B82F6"/>`;
        
        // Add X-axis label (time)
        const date = new Date(reading.timestamp * 1000);
        const timeLabel = date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Only show labels for some points to avoid crowding
        if (numPoints <= 5 || index % Math.ceil(numPoints / 5) === 0 || index === numPoints - 1) {
            xLabels += `<text x="${x - 15}" y="330" font-size="12" fill="#6B7280">${timeLabel}</text>`;
        }
    });
    
    // Close the fill path
    const lastX = startX + ((numPoints - 1) * xSpacing);
    fillPathData += ` L ${lastX} ${maxY} L ${startX} ${maxY} Z`;
    
    // Update Y-axis labels based on max value
    const yStep = maxPPM / 5;
    let yLabels = '';
    for (let i = 0; i <= 5; i++) {
        const value = Math.round(maxPPM - (i * yStep));
        const y = startY + (i * (height / 5));
        yLabels += `<text x="20" y="${y + 5}" font-size="12" fill="#6B7280">${value}</text>`;
    }
    
    // Rebuild the SVG content
    chartSvg.innerHTML = `
        <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:0.3" />
                <stop offset="100%" style="stop-color:#3B82F6;stop-opacity:0" />
            </linearGradient>
        </defs>
        
        <!-- Y-axis labels -->
        ${yLabels}
        
        <!-- Y-axis label -->
        <text x="15" y="20" font-size="14" font-weight="600" fill="#374151">PPM</text>
        
        <!-- X-axis labels -->
        ${xLabels}
        
        <!-- X-axis label -->
        <text x="360" y="350" font-size="14" font-weight="600" fill="#374151">Tiempo</text>
        
        <!-- Grid lines -->
        <line x1="50" y1="50" x2="750" y2="50" stroke="#E5E7EB" stroke-width="1" stroke-dasharray="4"/>
        <line x1="50" y1="100" x2="750" y2="100" stroke="#E5E7EB" stroke-width="1" stroke-dasharray="4"/>
        <line x1="50" y1="150" x2="750" y2="150" stroke="#E5E7EB" stroke-width="1" stroke-dasharray="4"/>
        <line x1="50" y1="200" x2="750" y2="200" stroke="#E5E7EB" stroke-width="1" stroke-dasharray="4"/>
        <line x1="50" y1="250" x2="750" y2="250" stroke="#E5E7EB" stroke-width="1" stroke-dasharray="4"/>
        <line x1="50" y1="300" x2="750" y2="300" stroke="#E5E7EB" stroke-width="1"/>
        
        <!-- Data line -->
        <path d="${pathData}" stroke="#3B82F6" stroke-width="3" fill="none"/>
        <path d="${fillPathData}" fill="url(#chartGradient)"/>
        
        <!-- Data points -->
        ${circles}
    `;
}

// Simulate real-time updates for demo
let updateInterval;
function startRealTimeUpdates() {
    updateInterval = setInterval(() => {
        updateGasLevel();
        updateLastReading();
    }, 5000);
}

function stopRealTimeUpdates() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
}


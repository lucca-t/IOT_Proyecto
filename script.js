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

    // Update sensor number if provided
    if (sensorNum && document.getElementById('sensor-num')) {
        document.getElementById('sensor-num').textContent = sensorNum;
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

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
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

    // Update gas levels every 10 seconds (for demo purposes)
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


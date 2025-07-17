// Global variables
let windRoseChart = null;
let optimalRunwayDirection = null;

// Define colors for cardinal and intercardinal directions
const directionColors = {
    'N': '#FF0000',    // Red
    'NNE': '#FF4500',
    'NE': '#FF8C00',
    'ENE': '#FFD700',
    'E': '#FFFF00',    // Yellow
    'ESE': '#ADFF2F',
    'SE': '#32CD32',
    'SSE': '#008000',
    'S': '#0000FF',    // Blue
    'SSW': '#4B0082',
    'SW': '#8A2BE2',
    'WSW': '#9932CC',
    'W': '#800080',    // Purple
    'WNW': '#C71585',
    'NW': '#FF1493',
    'NNW': '#FF69B4'
};

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get references to DOM elements
    const csvFileInput = document.getElementById('csv-file');
    const fileInfoDiv = document.getElementById('file-info');
    const chartCanvas = document.getElementById('wind-rose-chart');
    const runwayInfoDiv = document.createElement('div');
    runwayInfoDiv.id = 'runway-info';
    document.querySelector('.data-info').prepend(runwayInfoDiv);
    
    // Create custom tooltip element
    const customTooltip = document.createElement('div');
    customTooltip.id = 'custom-tooltip';
    customTooltip.style.display = 'none';
    customTooltip.innerHTML = 'Tooltip test';
    document.body.appendChild(customTooltip);
    
    console.log('Custom tooltip created:', customTooltip);
    
    // Add event listener for file selection
    csvFileInput.addEventListener('change', handleFileSelect);
    
    // Create direction references immediately when the page loads
    createDirectionReferences(['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']);
    
    // Check URL parameters for test mode
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('test') && urlParams.get('test') === 'sample') {
        console.log('Loading sample data from URL parameter');
        loadSampleData();
    }
    
    /**
     * Handle file selection event
     * @param {Event} event - The file input change event
     */
    function handleFileSelect(event) {
        const file = event.target.files[0];
        
        if (!file) {
            return;
        }
        
        // Display file information
        fileInfoDiv.innerHTML = `
            <p><strong>Nombre:</strong> ${file.name}</p>
            <p><strong>Tamaño:</strong> ${(file.size / 1024).toFixed(2)} KB</p>
            <p><strong>Tipo:</strong> ${file.type || 'text/csv'}</p>
        `;
        
        // Parse CSV file
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: function(results) {
                if (results.errors.length) {
                    fileInfoDiv.innerHTML += `<p class="error">Error al procesar el archivo: ${results.errors[0].message}</p>`;
                    return;
                }
                
                // Process the data and create the wind rose chart
                processDataAndCreateChart(results.data);
                
                // Display data preview
                displayDataPreview(results.data, results.meta.fields);
            },
            error: function(error) {
                fileInfoDiv.innerHTML += `<p class="error">Error al leer el archivo: ${error.message}</p>`;
            }
        });
    }
    
    /**
     * Process the CSV data and create the wind rose chart
     * @param {Array} data - The parsed CSV data
     */
    function processDataAndCreateChart(data) {
        // Check if data contains the required columns
        // We expect columns for wind direction and wind speed
        // The column names might vary, so we'll try to detect them
        
        const firstRow = data[0];
        let directionColumn = null;
        let speedColumn = null;
        
        // Try to identify direction and speed columns
        for (const key in firstRow) {
            const lowerKey = key.toLowerCase();
            if (lowerKey.includes('dir') || lowerKey.includes('dirección') || lowerKey.includes('direccion')) {
                directionColumn = key;
            } else if (lowerKey.includes('vel') || lowerKey.includes('speed') || lowerKey.includes('velocidad')) {
                speedColumn = key;
            }
        }
        
        // If we couldn't identify the columns, use the first two columns
        if (!directionColumn || !speedColumn) {
            const columns = Object.keys(firstRow);
            if (columns.length >= 2) {
                directionColumn = columns[0];
                speedColumn = columns[1];
            } else {
                fileInfoDiv.innerHTML += `<p class="error">El archivo CSV no contiene suficientes columnas. Se requieren columnas para dirección y velocidad del viento.</p>`;
                return;
            }
        }
        
        // Process the data to get direction and speed distributions
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        const directionDegrees = [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5];
        
        const speedRanges = [
            { min: 0, max: 5, label: '0-5 km/h', color: 'rgba(0, 255, 0, 0.5)' },
            { min: 5, max: 10, label: '5-10 km/h', color: 'rgba(173, 255, 47, 0.5)' },
            { min: 10, max: 15, label: '10-15 km/h', color: 'rgba(255, 255, 0, 0.5)' },
            { min: 15, max: 20, label: '15-20 km/h', color: 'rgba(255, 165, 0, 0.5)' },
            { min: 20, max: Infinity, label: '>20 km/h', color: 'rgba(255, 0, 0, 0.5)' }
        ];
        
        // Initialize counts for each direction and speed range
        const counts = {};
        directions.forEach(dir => {
            counts[dir] = Array(speedRanges.length).fill(0);
        });
        
        // Count occurrences for each direction and speed range
        data.forEach(row => {
            let direction = row[directionColumn];
            let speed = row[speedColumn];
            
            // Skip if direction or speed is missing
            if (direction === undefined || speed === undefined) {
                return;
            }
            
            // Convert direction to degrees if it's not already
            if (typeof direction === 'string') {
                // Check if it's a cardinal direction (N, NE, etc.)
                const cardinalIndex = directions.indexOf(direction.toUpperCase());
                if (cardinalIndex !== -1) {
                    // Convert cardinal direction to degrees (N = 0, E = 90, S = 180, W = 270)
                    direction = cardinalIndex * (360 / directions.length);
                } else {
                    // Try to parse as a number
                    direction = parseFloat(direction);
                    if (isNaN(direction)) {
                        return; // Skip if we can't parse the direction
                    }
                }
            }
            
            // Convert speed to number if it's not already
            if (typeof speed === 'string') {
                speed = parseFloat(speed);
                if (isNaN(speed)) {
                    return; // Skip if we can't parse the speed
                }
            }
            
            // Convert direction to cardinal direction index
            const dirIndex = Math.round(direction / (360 / directions.length)) % directions.length;
            const dir = directions[dirIndex];
            
            // Find the speed range index
            let speedRangeIndex = speedRanges.findIndex(range => speed >= range.min && speed < range.max);
            if (speedRangeIndex === -1) {
                speedRangeIndex = speedRanges.length - 1; // Use the last range for speeds above the highest defined range
            }
            
            // Increment the count
            counts[dir][speedRangeIndex]++;
        });
        
        // Calculate optimal runway direction based on wind data
        const optimalDirection = calculateOptimalRunwayDirection(data, directionColumn, speedColumn);
        optimalRunwayDirection = optimalDirection;
        
        // Prepare data for Chart.js
        const datasets = speedRanges.map((range, i) => {
            return {
                label: range.label,
                data: directions.map(dir => counts[dir][i]),
                backgroundColor: directions.map(dir => directionColors[dir] + '80')  // Add 50% transparency
            };
        });
        
        // Create or update the chart
        createWindRoseChart(chartCanvas, directions, datasets);
        
        // Display runway information
        displayRunwayInfo(optimalDirection);
        
        // Create direction references
        createDirectionReferences(directions);
    }
    
    /**
     * Create the wind rose chart using Chart.js
     * @param {HTMLCanvasElement} canvas - The canvas element
     * @param {Array} labels - The direction labels
     * @param {Array} datasets - The datasets for each speed range
     */
    function createWindRoseChart(canvas, labels, datasets) {
        // Destroy existing chart if it exists
        if (windRoseChart) {
            windRoseChart.destroy();
        }
        
        // Create new chart
        windRoseChart = new Chart(canvas, {
            type: 'polarArea',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 40,     // Add more padding at the top to prevent overlap
                        bottom: 40,  // Add padding at the bottom for degree markings
                        left: 20,    // Add some padding on the sides as well
                        right: 20
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        ticks: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false  // Hide the legend below the chart
                    },
                    title: {
                        display: false  // Remove the title from the chart itself
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.raw || 0;
                                return `${label}: ${value} ocurrencias`;
                            }
                        }
                    }
                }
            },
            plugins: [{
                id: 'degreeMarkings',
                beforeDraw: function(chart) {
                    const ctx = chart.ctx;
                    const centerX = chart.chartArea.left + (chart.chartArea.right - chart.chartArea.left) / 2;
                    const centerY = chart.chartArea.top + (chart.chartArea.bottom - chart.chartArea.top) / 2;
                    const radius = Math.min(chart.chartArea.right - chart.chartArea.left, chart.chartArea.bottom - chart.chartArea.top) / 2;
                    
                    // Draw degree markings
                    ctx.save();
                    ctx.font = '12px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#333';
                    
                    // Draw all degree markings
                    for (let deg = 0; deg < 360; deg += 5) {
                        // Convert degrees to radians (0 degrees is North, positive clockwise)
                        const rad = (deg * Math.PI) / 180;
                        
                        // Position for the text (slightly outside the chart)
                        const textX = centerX + Math.sin(rad) * (radius * 1.1);
                        const textY = centerY - Math.cos(rad) * (radius * 1.1);
                        
                        // Draw the degree text (only show numbers for multiples of 15 degrees)
                        if (deg % 15 === 0) {
                            ctx.fillText(`${deg}°`, textX, textY);
                        } else {
                            // Draw a small tick mark for other degrees
                            const innerX = centerX + Math.sin(rad) * (radius * 1.05);
                            const innerY = centerY - Math.cos(rad) * (radius * 1.05);
                            const outerX = centerX + Math.sin(rad) * (radius * 1.08);
                            const outerY = centerY - Math.cos(rad) * (radius * 1.08);
                            
                            ctx.beginPath();
                            ctx.moveTo(innerX, innerY);
                            ctx.lineTo(outerX, outerY);
                            ctx.stroke();
                        }
                    }
                    
                    ctx.restore();
                }
            }, {
                id: 'runwayTooltip',
                afterInit: function(chart) {
                    console.log('Runway tooltip plugin initialized');
                    
                    // Add event listeners for custom tooltip
                    chart.canvas.addEventListener('mousemove', function(e) {
                        const rect = chart.canvas.getBoundingClientRect();
                        const mouseX = e.clientX - rect.left;
                        const mouseY = e.clientY - rect.top;
                        
                        const customTooltip = document.getElementById('custom-tooltip');
                        
                        // Check if runway rectangle exists
                        if (chart.runwayRectangle) {
                            // Check if mouse is over runway rectangle
                            const isOver = isPointInPolygon(mouseX, mouseY, chart.runwayRectangle.points);
                            console.log('Mouse position:', mouseX, mouseY, 'Is over runway:', isOver);
                            
                            if (isOver) {
                                // Show tooltip
                                customTooltip.innerHTML = `Dirección de pista: ${Math.round(chart.runwayRectangle.direction)}°`;
                                customTooltip.style.display = 'block';
                                customTooltip.style.left = (e.clientX + 10) + 'px';
                                customTooltip.style.top = (e.clientY + 10) + 'px';
                            } else {
                                // Hide tooltip
                                customTooltip.style.display = 'none';
                            }
                        }
                    });
                    
                    chart.canvas.addEventListener('mouseout', function() {
                        // Hide tooltip when mouse leaves canvas
                        const customTooltip = document.getElementById('custom-tooltip');
                        customTooltip.style.display = 'none';
                    });
                }
            }, {
                id: 'runwayOverlay',
                afterDraw: function(chart) {
                    if (optimalRunwayDirection !== null) {
                        const ctx = chart.ctx;
                        const centerX = chart.chartArea.left + (chart.chartArea.right - chart.chartArea.left) / 2;
                        const centerY = chart.chartArea.top + (chart.chartArea.bottom - chart.chartArea.top) / 2;
                        const radius = Math.min(chart.chartArea.right - chart.chartArea.left, chart.chartArea.bottom - chart.chartArea.top) / 2;
                        
                        // Convert runway direction to radians (0 degrees is North, positive clockwise)
                        const runwayRad = (optimalRunwayDirection * Math.PI) / 180;
                        const perpendicularRad1 = runwayRad + Math.PI/2;
                        const perpendicularRad2 = runwayRad - Math.PI/2;
                        
                        // Define rectangle width (perpendicular to runway direction)
                        const rectWidth = radius * 0.2; // 20% of radius
                        
                        // Calculate the four corners of the rectangle
                        const point1X = centerX + Math.sin(runwayRad) * radius * 0.9 + Math.sin(perpendicularRad1) * rectWidth/2;
                        const point1Y = centerY - Math.cos(runwayRad) * radius * 0.9 - Math.cos(perpendicularRad1) * rectWidth/2;
                        
                        const point2X = centerX + Math.sin(runwayRad) * radius * 0.9 + Math.sin(perpendicularRad2) * rectWidth/2;
                        const point2Y = centerY - Math.cos(runwayRad) * radius * 0.9 - Math.cos(perpendicularRad2) * rectWidth/2;
                        
                        const point3X = centerX - Math.sin(runwayRad) * radius * 0.9 + Math.sin(perpendicularRad2) * rectWidth/2;
                        const point3Y = centerY + Math.cos(runwayRad) * radius * 0.9 - Math.cos(perpendicularRad2) * rectWidth/2;
                        
                        const point4X = centerX - Math.sin(runwayRad) * radius * 0.9 + Math.sin(perpendicularRad1) * rectWidth/2;
                        const point4Y = centerY + Math.cos(runwayRad) * radius * 0.9 - Math.cos(perpendicularRad1) * rectWidth/2;
                        
                        // Draw runway rectangle
                        ctx.save();
                        ctx.beginPath();
                        ctx.moveTo(point1X, point1Y);
                        ctx.lineTo(point2X, point2Y);
                        ctx.lineTo(point3X, point3Y);
                        ctx.lineTo(point4X, point4Y);
                        ctx.closePath();
                        
                        // Use a color different from the direction references
                        ctx.fillStyle = 'rgba(128, 128, 128, 0.6)'; // Translucent gray
                        ctx.fill();
                        
                        // Store the runway rectangle data for tooltip detection
                        chart.runwayRectangle = {
                            points: [
                                { x: point1X, y: point1Y },
                                { x: point2X, y: point2Y },
                                { x: point3X, y: point3Y },
                                { x: point4X, y: point4Y }
                            ],
                            direction: optimalRunwayDirection
                        };
                        
                        console.log('Runway rectangle created:', chart.runwayRectangle);
                        
                        ctx.restore();
                    }
                }
            }]
        });
    }
    
    /**
     * Calculate the optimal runway direction based on wind data
     * @param {Array} data - The parsed CSV data
     * @param {String} directionColumn - The column name for wind direction
     * @param {String} speedColumn - The column name for wind speed
     * @returns {Number} - The optimal runway direction in degrees
     */
    function calculateOptimalRunwayDirection(data, directionColumn, speedColumn) {
        // Convert all wind directions and speeds to vectors
        const vectors = data.map(row => {
            let direction = row[directionColumn];
            let speed = row[speedColumn];
            
            // Skip if direction or speed is missing
            if (direction === undefined || speed === undefined) {
                return null;
            }
            
            // Convert direction to number if it's not already
            if (typeof direction === 'string') {
                direction = parseFloat(direction);
                if (isNaN(direction)) {
                    return null;
                }
            }
            
            // Convert speed to number if it's not already
            if (typeof speed === 'string') {
                speed = parseFloat(speed);
                if (isNaN(speed)) {
                    return null;
                }
            }
            
            // Convert to radians (meteorological convention: 0 = North, 90 = East)
            const dirRad = (direction * Math.PI) / 180;
            
            // Convert to cartesian components
            return {
                x: speed * Math.sin(dirRad),  // East component
                y: speed * Math.cos(dirRad)   // North component
            };
        }).filter(v => v !== null);
        
        // Sum all vectors to get resultant wind vector
        const resultant = vectors.reduce((acc, vec) => {
            return { x: acc.x + vec.x, y: acc.y + vec.y };
        }, { x: 0, y: 0 });
        
        // Calculate the direction of the resultant vector
        let resultantDirection = Math.atan2(resultant.x, resultant.y) * (180 / Math.PI);
        if (resultantDirection < 0) {
            resultantDirection += 360;
        }
        
        // The optimal runway direction is perpendicular to the resultant wind direction
        let runwayDirection = (resultantDirection + 90) % 360;
        
        // Round to nearest 10 degrees (common for runway numbering)
        runwayDirection = Math.round(runwayDirection / 10) * 10;
        
        return runwayDirection;
    }
    
    /**
     * Display runway information
     * @param {Number} direction - The optimal runway direction in degrees
     */
    function displayRunwayInfo(direction) {
        const runwayInfoDiv = document.getElementById('runway-info');
        
        // Convert direction to runway designation (e.g., 270 degrees -> Runway 27)
        // Runway numbers are in tens of degrees, from 01 to 36
        let runwayNumber = Math.round(direction / 10);
        if (runwayNumber === 0) runwayNumber = 36;
        if (runwayNumber > 36) runwayNumber = runwayNumber - 36;
        
        // Format with leading zero if needed
        const runwayDesignation = runwayNumber < 10 ? `0${runwayNumber}` : `${runwayNumber}`;
        
        // Calculate the reciprocal runway (opposite direction)
        let reciprocalNumber = (runwayNumber + 18) % 36;
        if (reciprocalNumber === 0) reciprocalNumber = 36;
        
        // Format with leading zero if needed
        const reciprocalDesignation = reciprocalNumber < 10 ? `0${reciprocalNumber}` : `${reciprocalNumber}`;
        
        runwayInfoDiv.innerHTML = `
            <h3>Dirección de Pista Sugerida</h3>
            <div class="runway-details">
                <p><strong>Dirección óptima:</strong> ${direction}° (${Math.round(direction)}°)</p>
                <p><strong>Designación de pista:</strong> ${runwayDesignation}/${reciprocalDesignation}</p>
                <p><strong>Orientación:</strong> ${Math.round(direction)}°/${Math.round((direction + 180) % 360)}°</p>
            </div>
        `;
    }
    
    /**
     * Display a preview of the parsed data
     * @param {Array} data - The parsed CSV data
     * @param {Array} fields - The CSV column headers
     */
    function displayDataPreview(data, fields) {
        // Display all rows of the data
        const previewData = data;
        
        let previewHtml = '<h4>Vista previa de datos (todas las filas):</h4>';
        previewHtml += '<table style="width:100%; border-collapse: collapse;">';
        
        // Add header row
        previewHtml += '<tr>';
        fields.forEach(field => {
            previewHtml += `<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">${field}</th>`;
        });
        previewHtml += '</tr>';
        
        // Add data rows
        previewData.forEach(row => {
            previewHtml += '<tr>';
            fields.forEach(field => {
                previewHtml += `<td style="border: 1px solid #ddd; padding: 8px;">${row[field] !== undefined ? row[field] : ''}</td>`;
            });
            previewHtml += '</tr>';
        });
        
        previewHtml += '</table>';
        previewHtml += `<p><strong>Total de filas:</strong> ${data.length}</p>`;
        
        // Append to file info div
        fileInfoDiv.innerHTML += previewHtml;
    }
    
    /**
     * Check if a point is inside a polygon
     * @param {Number} x - The x coordinate of the point
     * @param {Number} y - The y coordinate of the point
     * @param {Array} polygon - Array of points forming the polygon
     * @returns {Boolean} - True if the point is inside the polygon
     */
    function isPointInPolygon(x, y, polygon) {
        // Simplified approach: check if point is within the bounding box of the polygon
        // This is less accurate but more reliable for our rectangle
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        // Find the bounding box
        for (let i = 0; i < polygon.length; i++) {
            const point = polygon[i];
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        }
        
        // Check if point is within bounding box
        const isInside = x >= minX && x <= maxX && y >= minY && y <= maxY;
        return isInside;
    }
    
    /**
     * Load sample data for testing
     */
    function loadSampleData() {
        // Create hardcoded sample data (based on sample_wind_data.csv)
        const sampleData = [
            { direccion: 0, velocidad: 5, fecha: "2023-01-01", hora: "00:00" },
            { direccion: 45, velocidad: 8, fecha: "2023-01-01", hora: "01:00" },
            { direccion: 90, velocidad: 12, fecha: "2023-01-01", hora: "02:00" },
            { direccion: 135, velocidad: 7, fecha: "2023-01-01", hora: "03:00" },
            { direccion: 180, velocidad: 3, fecha: "2023-01-01", hora: "04:00" },
            { direccion: 225, velocidad: 6, fecha: "2023-01-01", hora: "05:00" },
            { direccion: 270, velocidad: 15, fecha: "2023-01-01", hora: "06:00" },
            { direccion: 315, velocidad: 9, fecha: "2023-01-01", hora: "07:00" },
            { direccion: 0, velocidad: 11, fecha: "2023-01-01", hora: "08:00" },
            { direccion: 45, velocidad: 14, fecha: "2023-01-01", hora: "09:00" },
            { direccion: 90, velocidad: 18, fecha: "2023-01-01", hora: "10:00" },
            { direccion: 135, velocidad: 22, fecha: "2023-01-01", hora: "11:00" },
            { direccion: 180, velocidad: 16, fecha: "2023-01-01", hora: "12:00" },
            { direccion: 225, velocidad: 10, fecha: "2023-01-01", hora: "13:00" },
            { direccion: 270, velocidad: 7, fecha: "2023-01-01", hora: "14:00" },
            { direccion: 315, velocidad: 4, fecha: "2023-01-01", hora: "15:00" }
        ];
        
        // Define column fields
        const fields = ["direccion", "velocidad", "fecha", "hora"];
        
        // Display file information
        const fileInfoDiv = document.getElementById('file-info');
        fileInfoDiv.innerHTML = `
            <p><strong>Nombre:</strong> sample_wind_data.csv (datos de prueba)</p>
            <p><strong>Tipo:</strong> text/csv</p>
            <p><strong>Datos cargados automáticamente para pruebas</strong></p>
        `;
        
        // Process the data and create the wind rose chart
        processDataAndCreateChart(sampleData);
        
        // Display data preview
        displayDataPreview(sampleData, fields);
    }
    
});

// Add some CSS for the runway info and custom tooltip
document.addEventListener('DOMContentLoaded', function() {
    const style = document.createElement('style');
    style.textContent = `
        #runway-info {
            margin-bottom: 20px;
            padding: 15px;
            background-color: #f0f8ff;
            border-radius: 5px;
            border-left: 5px solid #4682b4;
        }
        
        .runway-details {
            margin-top: 10px;
        }
        
        .runway-details p {
            margin: 5px 0;
        }
        
        #custom-tooltip {
            position: absolute;
            background-color: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 10px 15px;
            border-radius: 4px;
            font-size: 16px;
            font-weight: bold;
            pointer-events: none;
            z-index: 9999;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            border: 2px solid white;
        }
    `;
    document.head.appendChild(style);
});

/**
 * Create direction references in the left column
 * @param {Array} directions - The array of direction labels
 */
function createDirectionReferences(directions) {
    const directionLegend = document.getElementById('direction-legend');
    if (!directionLegend) {
        console.error('Direction legend element not found');
        return;
    }
    
    // Clear any existing content
    directionLegend.innerHTML = '';
    
    // Create a reference item for each direction
    directions.forEach(dir => {
        const dirItem = document.createElement('div');
        dirItem.className = 'direction-item';
        
        const colorBox = document.createElement('div');
        colorBox.className = 'direction-color';
        colorBox.style.backgroundColor = directionColors[dir];
        
        const dirText = document.createElement('span');
        dirText.textContent = dir;
        
        dirItem.appendChild(colorBox);
        dirItem.appendChild(dirText);
        directionLegend.appendChild(dirItem);
    });
}
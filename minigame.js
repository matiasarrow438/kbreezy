const canvas = document.getElementById('decoratorCanvas');
const ctx = canvas.getContext('2d');
const saveButton = document.getElementById('saveButton');
const undoButton = document.getElementById('undoButton');
const clearButton = document.getElementById('clearButton');
const submitButton = document.getElementById('submitButton');
const designNameInput = document.getElementById('designName');

// Set canvas size
canvas.width = 800;
canvas.height = 500;

// State variables
let currentColor = '#9370db';
let currentPattern = null; // Only one pattern at a time
let currentEffect = null;  // Only one effect at a time
let undoStack = [];
let stickers = [];
let isDragging = false;
let selectedSticker = null;
let dragStartX = 0;
let dragStartY = 0;
let isAddingText = false;
let isOverTrash = false;
let animationFrameId = null;

// Add trash zone coordinates
const trashZone = {
    x: canvas.width - 80,
    y: 20,
    width: 60,
    height: 60
};

// Load assets
const ethLogo = new Image();
ethLogo.src = 'data:image/svg+xml;base64,' + btoa(`
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
    <path d="M50 10L20 50L50 65L80 50L50 10Z" fill="#9370db"/>
    <path d="M50 70L20 55L50 90L80 55L50 70Z" fill="#9370db"/>
</svg>
`);

// Pattern definitions
const patterns = {
    dots: {
        name: 'Polka Dots',
        apply: () => {
            ctx.fillStyle = '#ffffff';
            for(let i = 0; i < 36; i++) {
                const angle = (i * Math.PI * 2) / 36;
                const radius = i % 2 === 0 ? 90 : 130;
                const x = canvas.width/2 + Math.cos(angle) * radius;
                const y = canvas.height/2 + Math.sin(angle) * radius;
                ctx.beginPath();
                ctx.arc(x, y, 6, 0, Math.PI * 2);
                ctx.fill();
            }
            // Add smaller dots in between
            for(let i = 0; i < 24; i++) {
                const angle = (i * Math.PI * 2) / 24;
                const radius = 110;
                const x = canvas.width/2 + Math.cos(angle) * radius;
                const y = canvas.height/2 + Math.sin(angle) * radius;
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    },
    stripes: {
        name: 'Stripes',
        apply: () => {
            ctx.save();
            
            // Create clipping path in egg shape
            ctx.beginPath();
            ctx.ellipse(canvas.width/2, canvas.height/2, 150, 200, 0, 0, Math.PI * 2);
            ctx.clip();
            
            // Draw clean horizontal stripes
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            
            // Calculate the egg's dimensions
            const eggHeight = 400; // Back to original height
            const numStripes = 12; // Increased for more lines
            const spacing = eggHeight / (numStripes - 0.5); // Adjust spacing to fit lines better
            
            // Draw stripes from top to bottom, starting higher up
            for(let i = 0; i < numStripes; i++) {
                ctx.beginPath();
                
                // Calculate y position with even spacing, centered in egg but shifted up more
                const y = (canvas.height/2 - eggHeight/2 + 60) + spacing * i;
                
                // Draw straight line (the clip path will handle the egg shape)
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }
            
            ctx.restore();
        }
    },
    zigzag: {
        name: 'Zigzag',
        apply: () => {
            ctx.save();
            
            // Create clipping path in egg shape
            ctx.beginPath();
            ctx.ellipse(canvas.width/2, canvas.height/2, 150, 200, 0, 0, Math.PI * 2);
            ctx.clip();
            
            // Draw clean zigzag pattern
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            
            // Calculate dimensions for zigzag
            const eggHeight = 400;
            const numZigzags = 6; // Number of complete zigzags
            const spacing = eggHeight / numZigzags;
            const zigzagWidth = 300; // Width of the zigzag pattern
            
            ctx.beginPath();
            // Start from the top
            let startX = canvas.width/2 - zigzagWidth/2;
            let startY = canvas.height/2 - eggHeight/2 + 60; // Offset to match stripes pattern
            
            ctx.moveTo(startX, startY);
            
            // Draw zigzag pattern
            for(let i = 0; i <= numZigzags; i++) {
                // Draw right point
                ctx.lineTo(startX + zigzagWidth, startY + (i * spacing));
                // Draw left point (if not the last one)
                if(i < numZigzags) {
                    ctx.lineTo(startX, startY + ((i + 1) * spacing));
                }
            }
            
            ctx.stroke();
            ctx.restore();
        }
    },
    hearts: {
        name: 'Hearts',
        apply: () => {
            ctx.save();
            
            // Create clipping path in egg shape
            ctx.beginPath();
            ctx.ellipse(canvas.width/2, canvas.height/2, 150, 200, 0, 0, Math.PI * 2);
            ctx.clip();
            
            // Draw main hearts in a circular pattern
            const numHearts = 8;
            const radius = 120;
            
            // Draw larger hearts around the edge
            for(let i = 0; i < numHearts; i++) {
                const angle = (i * Math.PI * 2) / numHearts;
                const x = canvas.width/2 + Math.cos(angle) * radius;
                const y = canvas.height/2 + Math.sin(angle) * radius;
                drawHeart(x, y, 40);
            }
            
            // Draw medium hearts in between
            const numInnerHearts = 6;
            const innerRadius = 70;
            for(let i = 0; i < numInnerHearts; i++) {
                const angle = ((i * Math.PI * 2) / numInnerHearts) + (Math.PI / numInnerHearts);
                const x = canvas.width/2 + Math.cos(angle) * innerRadius;
                const y = canvas.height/2 + Math.sin(angle) * innerRadius;
                drawHeart(x, y, 30);
            }
            
            // Draw small hearts in the center
            const numCenterHearts = 4;
            const centerRadius = 30;
            for(let i = 0; i < numCenterHearts; i++) {
                const angle = ((i * Math.PI * 2) / numCenterHearts) + (Math.PI / numCenterHearts);
                const x = canvas.width/2 + Math.cos(angle) * centerRadius;
                const y = canvas.height/2 + Math.sin(angle) * centerRadius;
                drawHeart(x, y, 20);
            }
            
            // Draw a heart in the very center
            drawHeart(canvas.width/2, canvas.height/2, 25);
            
            ctx.restore();
        }
    },
    stars: {
        name: 'Stars',
        apply: () => {
            for(let i = 0; i < 16; i++) {
                const angle = (i * Math.PI * 2) / 16;
                const radius = i % 2 === 0 ? 90 : 130;
                const x = canvas.width/2 + Math.cos(angle) * radius;
                const y = canvas.height/2 + Math.sin(angle) * radius;
                drawStar(x, y, 5, 12, 6);
            }
            // Add smaller stars in between
            for(let i = 0; i < 12; i++) {
                const angle = (i * Math.PI * 2) / 12;
                const radius = 110;
                const x = canvas.width/2 + Math.cos(angle) * radius;
                const y = canvas.height/2 + Math.sin(angle) * radius;
                drawStar(x, y, 4, 8, 4);
            }
        }
    },
    swirls: {
        name: 'Swirls',
        apply: () => {
            ctx.save();
            
            // Create clipping path in egg shape
            ctx.beginPath();
            ctx.ellipse(canvas.width/2, canvas.height/2, 150, 200, 0, 0, Math.PI * 2);
            ctx.clip();
            
            // Draw larger swirls in a circular pattern
            const numSwirls = 6;
            const radius = 120;
            
            // Draw outer swirls
            for(let i = 0; i < numSwirls; i++) {
                const angle = (i * Math.PI * 2) / numSwirls;
                const x = canvas.width/2 + Math.cos(angle) * radius;
                const y = canvas.height/2 + Math.sin(angle) * radius;
                drawSwirl(x, y, 35);
            }
            
            // Draw middle swirls
            const numMiddleSwirls = 4;
            const middleRadius = 60;
            for(let i = 0; i < numMiddleSwirls; i++) {
                const angle = ((i * Math.PI * 2) / numMiddleSwirls) + (Math.PI / numMiddleSwirls);
                const x = canvas.width/2 + Math.cos(angle) * middleRadius;
                const y = canvas.height/2 + Math.sin(angle) * middleRadius;
                drawSwirl(x, y, 25);
            }
            
            // Draw center swirl
            drawSwirl(canvas.width/2, canvas.height/2, 30);
            
            ctx.restore();
        }
    },
    diamonds: {
        name: 'Diamonds',
        apply: () => {
            ctx.save();
            
            // Create clipping path in egg shape
            ctx.beginPath();
            ctx.ellipse(canvas.width/2, canvas.height/2, 150, 200, 0, 0, Math.PI * 2);
            ctx.clip();
            
            // Draw outer ring of larger diamonds
            const numDiamonds = 8;
            const radius = 130;
            for(let i = 0; i < numDiamonds; i++) {
                const angle = (i * Math.PI * 2) / numDiamonds;
                const x = canvas.width/2 + Math.cos(angle) * radius;
                const y = canvas.height/2 + Math.sin(angle) * radius;
                drawDiamond(x, y, 20);
            }
            
            // Draw middle ring of medium diamonds
            const numMiddleDiamonds = 6;
            const middleRadius = 80;
            for(let i = 0; i < numMiddleDiamonds; i++) {
                const angle = ((i * Math.PI * 2) / numMiddleDiamonds) + (Math.PI / numMiddleDiamonds);
                const x = canvas.width/2 + Math.cos(angle) * middleRadius;
                const y = canvas.height/2 + Math.sin(angle) * middleRadius;
                drawDiamond(x, y, 15);
            }
            
            // Draw inner ring of small diamonds
            const numInnerDiamonds = 4;
            const innerRadius = 40;
            for(let i = 0; i < numInnerDiamonds; i++) {
                const angle = ((i * Math.PI * 2) / numInnerDiamonds) + (Math.PI / numInnerDiamonds);
                const x = canvas.width/2 + Math.cos(angle) * innerRadius;
                const y = canvas.height/2 + Math.sin(angle) * innerRadius;
                drawDiamond(x, y, 12);
            }
            
            // Draw center diamond
            drawDiamond(canvas.width/2, canvas.height/2, 18);
            
            ctx.restore();
        }
    },
    confetti: {
        name: 'Confetti',
        apply: () => {
            for(let i = 0; i < 80; i++) {
                const x = canvas.width/2 + (Math.random() - 0.5) * 250;
                const y = canvas.height/2 + (Math.random() - 0.5) * 300;
                const size = Math.random() * 6 + 3;
                const angle = Math.random() * Math.PI * 2;
                
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-size/2, -size/4, size, size/2);
                ctx.restore();
            }
        }
    }
};

// Effect definitions
const effects = {
    glitter: {
        name: 'Glitter',
        apply: () => {
            // Create clipping path in egg shape
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(canvas.width/2, canvas.height/2, 150, 200, 0, 0, Math.PI * 2);
            ctx.clip();

            // Draw larger sparkles
            for(let i = 0; i < 30; i++) {
                const x = canvas.width/2 + (Math.random() - 0.5) * 300;
                const y = canvas.height/2 + (Math.random() - 0.5) * 400;
                const size = Math.random() * 4 + 2;
                
                // Draw a four-point star for each sparkle
                ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.7 + 0.3})`;
                ctx.beginPath();
                for(let j = 0; j < 4; j++) {
                    const angle = (j * Math.PI / 2);
                    const innerRadius = size / 2;
                    const outerRadius = size * 2;
                    
                    // Draw point
                    ctx.lineTo(
                        x + Math.cos(angle) * outerRadius,
                        y + Math.sin(angle) * outerRadius
                    );
                    // Draw inner corner
                    ctx.lineTo(
                        x + Math.cos(angle + Math.PI/4) * innerRadius,
                        y + Math.sin(angle + Math.PI/4) * innerRadius
                    );
                }
                ctx.closePath();
                ctx.fill();
            }

            // Add smaller sparkle dots
            for(let i = 0; i < 40; i++) {
                const x = canvas.width/2 + (Math.random() - 0.5) * 300;
                const y = canvas.height/2 + (Math.random() - 0.5) * 400;
                const size = Math.random() * 2 + 1;
                
                ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.5})`;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    },
    rainbow: {
        name: 'Rainbow',
        apply: () => {
            ctx.save();
            // Create clipping path in egg shape
            ctx.beginPath();
            ctx.ellipse(canvas.width/2, canvas.height/2, 150, 200, 0, 0, Math.PI * 2);
            ctx.clip();

            // Create a more vibrant rainbow gradient
            const gradient = ctx.createLinearGradient(
                canvas.width/2 - 150,
                canvas.height/2 - 200,
                canvas.width/2 + 150,
                canvas.height/2 + 200
            );
            gradient.addColorStop(0, '#ff1a1a');    // Bright red
            gradient.addColorStop(0.17, '#ff8c1a');  // Bright orange
            gradient.addColorStop(0.33, '#ffff1a');  // Bright yellow
            gradient.addColorStop(0.5, '#1aff1a');   // Bright green
            gradient.addColorStop(0.67, '#1a1aff');  // Bright blue
            gradient.addColorStop(0.83, '#8c1aff');  // Bright purple
            gradient.addColorStop(1, '#ff1a8c');     // Bright pink

            // Draw main egg with rainbow gradient
            ctx.fillStyle = gradient;
            ctx.fill();

            // Add a subtle shine effect
            const shineGradient = ctx.createLinearGradient(
                canvas.width/2 - 150,
                canvas.height/2 - 200,
                canvas.width/2 + 150,
                canvas.height/2 + 200
            );
            shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
            shineGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
            shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0.2)');
            ctx.fillStyle = shineGradient;
            ctx.fill();

            ctx.restore();
        }
    },
    sparkle: {
        name: 'Sparkle',
        apply: () => {
            ctx.save();
            // Create clipping path in egg shape
            ctx.beginPath();
            ctx.ellipse(canvas.width/2, canvas.height/2, 150, 200, 0, 0, Math.PI * 2);
            ctx.clip();

            // Draw base sparkles
            for(let i = 0; i < 20; i++) {
                const angle = (i * Math.PI * 2) / 20;
                const radius = i % 2 === 0 ? 80 : 120;
                const x = canvas.width/2 + Math.cos(angle) * radius;
                const y = canvas.height/2 + Math.sin(angle) * radius;
                
                // Draw larger sparkle
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                drawStar(x, y, 8, 12, 6);
                
                // Draw smaller sparkle inside
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                drawStar(x, y, 6, 8, 4);
            }

            // Add random small sparkles
            for(let i = 0; i < 30; i++) {
                const x = canvas.width/2 + (Math.random() - 0.5) * 300;
                const y = canvas.height/2 + (Math.random() - 0.5) * 400;
                const opacity = Math.random() * 0.5 + 0.3;
                ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
                drawStar(x, y, 4, 6, 4);
            }

            ctx.restore();
        }
    },
    metallic: {
        name: 'Metallic',
        apply: () => {
            ctx.save();
            // Create clipping path in egg shape
            ctx.beginPath();
            ctx.ellipse(canvas.width/2, canvas.height/2, 150, 200, 0, 0, Math.PI * 2);
            ctx.clip();

            // Create base metallic gradient
            const gradient = ctx.createLinearGradient(
                canvas.width/2 - 150,
                canvas.height/2 - 200,
                canvas.width/2 + 150,
                canvas.height/2 + 200
            );
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.2, currentColor);
            gradient.addColorStop(0.5, '#ffffff');
            gradient.addColorStop(0.8, currentColor);
            gradient.addColorStop(1, '#ffffff');
            ctx.fillStyle = gradient;
            ctx.fill();

            // Add metallic shine effect
            const shineGradient = ctx.createRadialGradient(
                canvas.width/2 - 50, canvas.height/2 - 50, 0,
                canvas.width/2 - 50, canvas.height/2 - 50, 300
            );
            shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
            shineGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
            shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
            ctx.fillStyle = shineGradient;
            ctx.fill();

            // Add highlight lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            for(let i = 0; i < 5; i++) {
                const offset = i * 30 - 60;
                ctx.beginPath();
                ctx.moveTo(canvas.width/2 - 150 + offset, canvas.height/2 - 200);
                ctx.lineTo(canvas.width/2 + 150 + offset, canvas.height/2 + 200);
                ctx.stroke();
            }

            ctx.restore();
        }
    }
};

// Add activeEffects array to track multiple effects
let activeEffects = [];

// Add constants for sharing
const TICKER = '$ETHSTER';
const CONTRACT_ADDRESS = '0x000000000000000000000000000000000000'; // Update with actual contract address

// Add notification function at the top of the file after the initial constants
function showNotification(message) {
    // Remove existing notification if any
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    // Add styles inline with a more colorful, themed appearance
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.backgroundColor = '#9370db'; // Match the egg's default color
    notification.style.color = 'white';
    notification.style.padding = '12px 24px';
    notification.style.borderRadius = '15px';
    notification.style.boxShadow = '0 4px 15px rgba(147, 112, 219, 0.3)';
    notification.style.border = '2px solid rgba(255, 255, 255, 0.2)';
    notification.style.zIndex = '1000';
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    notification.style.transition = 'all 0.3s ease';
    notification.style.fontSize = '16px';
    notification.style.fontWeight = '500';
    notification.style.backdropFilter = 'blur(5px)';
    notification.style.webkitBackdropFilter = 'blur(5px)';
    
    // Add to document
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 10);
    
    // Remove after 3 seconds with fade out
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Initialize canvas
function initCanvas() {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawEgg();
    saveState();
}

// Draw the base egg shape
function drawEgg() {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(canvas.width/2, canvas.height/2, 150, 200, 0, 0, Math.PI * 2);
    ctx.fillStyle = currentColor;
    ctx.fill();
    ctx.strokeStyle = '#9370db';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
}

// Function to draw trash zone
function drawTrashZone(isHovered = false) {
    ctx.save();
    
    // Draw trash zone background
    ctx.fillStyle = isHovered ? 'rgba(255, 99, 71, 0.15)' : 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = isHovered ? '#ff6347' : '#ddd';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    
    // Draw rounded rectangle
    ctx.beginPath();
    ctx.roundRect(trashZone.x, trashZone.y, trashZone.width, trashZone.height, 8);
    ctx.fill();
    ctx.stroke();
    
    // Draw trash icon
    ctx.setLineDash([]);
    ctx.strokeStyle = isHovered ? '#ff6347' : '#666';
    ctx.lineWidth = 2;
    
    // Draw trash can
    const iconX = trashZone.x + trashZone.width/2;
    const iconY = trashZone.y + trashZone.height/2;
    
    // Lid
    ctx.beginPath();
    ctx.moveTo(iconX - 10, iconY - 8);
    ctx.lineTo(iconX + 10, iconY - 8);
    ctx.stroke();
    
    // Handle
    ctx.beginPath();
    ctx.moveTo(iconX - 4, iconY - 8);
    ctx.lineTo(iconX - 4, iconY - 12);
    ctx.lineTo(iconX + 4, iconY - 12);
    ctx.lineTo(iconX + 4, iconY - 8);
    ctx.stroke();
    
    // Can
    ctx.beginPath();
    ctx.moveTo(iconX - 8, iconY - 8);
    ctx.lineTo(iconX - 6, iconY + 8);
    ctx.lineTo(iconX + 6, iconY + 8);
    ctx.lineTo(iconX + 8, iconY - 8);
    ctx.stroke();
    
    // Vertical lines in can
    ctx.beginPath();
    ctx.moveTo(iconX - 3, iconY - 6);
    ctx.lineTo(iconX - 2, iconY + 6);
    ctx.moveTo(iconX + 3, iconY - 6);
    ctx.lineTo(iconX + 2, iconY + 6);
    ctx.stroke();
    
    ctx.restore();
}

// Function to check if a point is over the trash zone
function isOverTrashZone(x, y) {
    return x >= trashZone.x && x <= trashZone.x + trashZone.width &&
           y >= trashZone.y && y <= trashZone.y + trashZone.height;
}

// Update redrawCanvas function to handle multiple effects
function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the base egg with rainbow or metallic if active
    if (activeEffects.includes('rainbow')) {
        effects.rainbow.apply();
    } else if (activeEffects.includes('metallic')) {
        effects.metallic.apply();
    } else {
        drawEgg();
    }
    
    // Apply current pattern
    if (currentPattern) {
        ctx.save();
        patterns[currentPattern].apply();
        ctx.restore();
    }
    
    // Apply other effects except rainbow/metallic
    activeEffects.forEach(effect => {
        if (effect !== 'rainbow' && effect !== 'metallic') {
            ctx.save();
            effects[effect].apply();
            ctx.restore();
        }
    });
    
    // Draw stickers and text
    stickers.forEach(sticker => {
        ctx.save();
        if (sticker.type === 'emoji') {
            ctx.font = '30px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(sticker.emoji, sticker.x, sticker.y);
        } else if (sticker.type === 'text') {
            ctx.font = `${sticker.fontSize}px ${sticker.fontFamily}`;
            ctx.fillStyle = sticker.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(sticker.text, sticker.x, sticker.y);
        }
        ctx.restore();
    });
    
    // Draw trash zone
    drawTrashZone(isOverTrash);
}

// Save canvas state
function saveState() {
    undoStack.push({
        imageData: canvas.toDataURL(),
        stickers: JSON.parse(JSON.stringify(stickers))
    });
}

// Undo last action
function undo() {
    if (undoStack.length > 1) {
        undoStack.pop(); // Remove current state
        const lastState = undoStack[undoStack.length - 1];
        stickers = JSON.parse(JSON.stringify(lastState.stickers));
        const img = new Image();
        img.src = lastState.imageData;
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
    }
}

// Clear canvas and start over
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stickers = [];
    undoStack = [];
    initCanvas();
}

// Check if a point is inside a sticker
function isStickerClicked(x, y, sticker) {
    const size = 30; // Size of sticker hitbox
    return x >= sticker.x - size/2 && 
           x <= sticker.x + size/2 && 
           y >= sticker.y - size/2 && 
           y <= sticker.y + size/2;
}

// Mouse down event to start dragging
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if clicked on a sticker
    for (let i = stickers.length - 1; i >= 0; i--) {
        const sticker = stickers[i];
        if (isClickOnSticker(x, y, sticker)) {
            isDragging = true;
            selectedSticker = sticker;
            // Store the initial offset between click and sticker position
            dragStartX = x - sticker.x;
            dragStartY = y - sticker.y;
            break;
        }
    }
});

// Update mousemove event
canvas.addEventListener('mousemove', (e) => {
    if (isDragging && selectedSticker) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Scale coordinates to match canvas coordinate space
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const canvasX = x * scaleX;
        const canvasY = y * scaleY;
        
        // Update sticker position with drag offset
        selectedSticker.x = canvasX - dragStartX;
        selectedSticker.y = canvasY - dragStartY;
        
        // Check if over trash zone
        const wasOverTrash = isOverTrash;
        isOverTrash = isOverTrashZone(selectedSticker.x, selectedSticker.y);
        
        // Always redraw during dragging
        redrawCanvas();
    }
});

// Update mouseup event
canvas.addEventListener('mouseup', (e) => {
    if (isDragging && selectedSticker) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Scale coordinates to match canvas coordinate space
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const canvasX = x * scaleX;
        const canvasY = y * scaleY;
        
        // Final position with drag offset
        selectedSticker.x = canvasX - dragStartX;
        selectedSticker.y = canvasY - dragStartY;
        
        if (isOverTrashZone(selectedSticker.x, selectedSticker.y)) {
            // Remove the sticker
            const index = stickers.indexOf(selectedSticker);
            if (index > -1) {
                stickers.splice(index, 1);
                saveState();
            }
        } else {
            // Save state if sticker wasn't deleted
            saveState();
        }
        
        isOverTrash = false;
        redrawCanvas();
    }
    isDragging = false;
    selectedSticker = null;
});

// Touch events for mobile support
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    // Check if touched a sticker
    for (let i = stickers.length - 1; i >= 0; i--) {
        const sticker = stickers[i];
        if (isClickOnSticker(x, y, sticker)) {
            isDragging = true;
            selectedSticker = sticker;
            // Store the initial offset between touch and sticker position
            dragStartX = x - sticker.x;
            dragStartY = y - sticker.y;
            break;
        }
    }
});

// Update touchmove event
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (isDragging && selectedSticker) {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        // Scale coordinates to match canvas coordinate space
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const canvasX = x * scaleX;
        const canvasY = y * scaleY;
        
        // Update sticker position with drag offset
        selectedSticker.x = canvasX - dragStartX;
        selectedSticker.y = canvasY - dragStartY;
        
        // Check if over trash zone
        const wasOverTrash = isOverTrash;
        isOverTrash = isOverTrashZone(selectedSticker.x, selectedSticker.y);
        
        // Always redraw during dragging
        redrawCanvas();
    }
});

// Update touchend event
canvas.addEventListener('touchend', (e) => {
    if (isDragging && selectedSticker) {
        const rect = canvas.getBoundingClientRect();
        const touch = e.changedTouches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        // Scale coordinates to match canvas coordinate space
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const canvasX = x * scaleX;
        const canvasY = y * scaleY;
        
        // Final position with drag offset
        selectedSticker.x = canvasX - dragStartX;
        selectedSticker.y = canvasY - dragStartY;
        
        if (isOverTrashZone(selectedSticker.x, selectedSticker.y)) {
            // Remove the sticker
            const index = stickers.indexOf(selectedSticker);
            if (index > -1) {
                stickers.splice(index, 1);
                saveState();
            }
        } else {
            // Save state if sticker wasn't deleted
            saveState();
        }
        
        isOverTrash = false;
        redrawCanvas();
    }
    isDragging = false;
    selectedSticker = null;
});

// Helper function to check if a point is on a sticker
function isClickOnSticker(x, y, sticker) {
    const size = sticker.type === 'text' ? 40 : 30; // Larger hit area for text
    return Math.abs(x - sticker.x) <= size/2 && 
           Math.abs(y - sticker.y) <= size/2;
}

document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        currentColor = btn.dataset.color;
        redrawCanvas();
        saveState();
    });
});

// Update pattern handling
document.querySelectorAll('.pattern-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const pattern = btn.dataset.pattern;
        document.querySelectorAll('.pattern-btn').forEach(b => b.classList.remove('active'));
        
        if (currentPattern === pattern) {
            currentPattern = null;
        } else {
            currentPattern = pattern;
            btn.classList.add('active');
        }
        redrawCanvas();
        saveState();
    });
});

// Update effect handling
document.querySelectorAll('.effect-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const effect = btn.dataset.effect;
        
        if (effect === 'rainbow' || effect === 'metallic') {
            // These effects are exclusive - they replace other effects
            document.querySelectorAll('.effect-btn').forEach(b => b.classList.remove('active'));
            activeEffects = [effect];
            btn.classList.add('active');
        } else {
            // Toggle the effect
            const index = activeEffects.indexOf(effect);
            if (index > -1) {
                activeEffects.splice(index, 1);
                btn.classList.remove('active');
            } else {
                // Remove rainbow/metallic if present
                if (activeEffects.includes('rainbow')) {
                    activeEffects = activeEffects.filter(e => e !== 'rainbow');
                    document.querySelector('[data-effect="rainbow"]').classList.remove('active');
                }
                if (activeEffects.includes('metallic')) {
                    activeEffects = activeEffects.filter(e => e !== 'metallic');
                    document.querySelector('[data-effect="metallic"]').classList.remove('active');
                }
                activeEffects.push(effect);
                btn.classList.add('active');
            }
        }
        
        redrawCanvas();
        saveState();
    });
});

document.querySelectorAll('.sticker-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const sticker = {
            type: 'emoji',
            emoji: btn.textContent,
            x: canvas.width/2,
            y: canvas.height/2
        };
        stickers.push(sticker);
        redrawCanvas();
        saveState();
    });
});

undoButton.addEventListener('click', undo);
clearButton.addEventListener('click', clearCanvas);

// Update drawCanvasWithoutTrash function to handle multiple effects
function drawCanvasWithoutTrash() {
    // Draw the base egg with rainbow or metallic if active
    if (activeEffects.includes('rainbow')) {
        effects.rainbow.apply();
    } else if (activeEffects.includes('metallic')) {
        effects.metallic.apply();
    } else {
        drawEgg();
    }
    
    // Apply current pattern
    if (currentPattern) {
        ctx.save();
        patterns[currentPattern].apply();
        ctx.restore();
    }
    
    // Apply other active effects
    activeEffects.forEach(effect => {
        if (effect !== 'rainbow' && effect !== 'metallic') {
            ctx.save();
            effects[effect].apply();
            ctx.restore();
        }
    });
    
    // Draw stickers and text
    stickers.forEach(sticker => {
        ctx.save();
        if (sticker.type === 'emoji') {
            ctx.font = '30px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(sticker.emoji, sticker.x, sticker.y);
        } else if (sticker.type === 'text') {
            ctx.font = `${sticker.fontSize}px ${sticker.fontFamily}`;
            ctx.fillStyle = sticker.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(sticker.text, sticker.x, sticker.y);
        }
        ctx.restore();
    });
}

// Update submit button functionality
document.getElementById('submitButton').addEventListener('click', () => {
    const designName = document.getElementById('designName').value.trim();
    
    if (!designName) {
        showNotification('Please name your design to submit');
        return;
    }
    
    // Prepare tweet text
    const tweetText = `Check out my Easter Egg design! 🎨\n\n$ETHSTER\nContract: ${CONTRACT_ADDRESS}\n\n#ETHster #Giveaway $ETHSTER`;
    
    // Create the tweet text
    const text = `Check out my ${designName} Easter Egg design! 🎨\n\n${tweetText}`;
    
    // Open in a new tab
    const tweetUrl = `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
    window.open(tweetUrl, '_blank');
});

// Update save button functionality
document.getElementById('saveButton').addEventListener('click', () => {
    const designName = document.getElementById('designName').value.trim();
    
    if (!designName) {
        showNotification('Please name your design to save');
        return;
    }

    // Create a temporary canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    // First, draw everything normally
    redrawCanvas();

    // Copy the current canvas to the temporary canvas
    tempCtx.drawImage(canvas, 0, 0);

    // Create the final canvas for saving
    const saveCanvas = document.createElement('canvas');
    saveCanvas.width = canvas.width;
    saveCanvas.height = canvas.height;
    const saveCtx = saveCanvas.getContext('2d');

    // Create a clipping region in the shape of the egg
    saveCtx.beginPath();
    saveCtx.ellipse(saveCanvas.width/2, saveCanvas.height/2, 150, 200, 0, 0, Math.PI * 2);
    saveCtx.clip();

    // Draw the content from the temporary canvas
    saveCtx.drawImage(tempCanvas, 0, 0);

    // Create download link
    const link = document.createElement('a');
    link.download = `${designName}_ETHster.png`;
    link.href = saveCanvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Redraw the canvas to restore the trash zone
    redrawCanvas();
});

// Add text to canvas
function addText(text, fontSize = 24, fontFamily = 'Arial', color = '#000000') {
    const textSticker = {
        type: 'text',
        text: text,
        fontSize: fontSize,
        fontFamily: fontFamily,
        color: color,
        x: canvas.width/2,
        y: canvas.height/2
    };
    stickers.push(textSticker);
    redrawCanvas();
    saveState();
}

// Text modal elements
const textModal = document.getElementById('textModal');
const textInput = document.getElementById('textInput');
const fontSizeRange = document.getElementById('fontSizeRange');
const fontSizeDisplay = document.getElementById('fontSizeDisplay');
const textPreview = document.getElementById('textPreview');
const addTextToCanvas = document.getElementById('addTextToCanvas');
const cancelTextBtn = document.getElementById('cancelTextBtn');
const closeModal = document.querySelector('.close-modal');

let selectedTextColor = '#000000';

// Show modal
document.getElementById('addTextBtn').addEventListener('click', () => {
    textModal.classList.add('show');
    textInput.focus();
});

// Hide modal
function hideModal() {
    textModal.classList.remove('show');
    textInput.value = '';
    fontSizeRange.value = '24';
    fontSizeDisplay.textContent = '24px';
    textPreview.style.fontSize = '24px';
    textPreview.textContent = 'Sample Text';
    document.querySelectorAll('.text-color-btn').forEach(btn => {
        if (btn.dataset.color === '#000000') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    selectedTextColor = '#000000';
}

closeModal.addEventListener('click', hideModal);
cancelTextBtn.addEventListener('click', hideModal);
textModal.addEventListener('click', (e) => {
    if (e.target === textModal) hideModal();
});

// Update preview as user types
textInput.addEventListener('input', () => {
    textPreview.textContent = textInput.value || 'Sample Text';
});

// Update font size preview
fontSizeRange.addEventListener('input', () => {
    const size = fontSizeRange.value;
    fontSizeDisplay.textContent = `${size}px`;
    textPreview.style.fontSize = `${size}px`;
});

// Handle color selection
document.querySelectorAll('.text-color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.text-color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedTextColor = btn.dataset.color;
        textPreview.style.color = selectedTextColor;
    });
});

// Add text to canvas when confirmed
addTextToCanvas.addEventListener('click', () => {
    const text = textInput.value.trim();
    if (text) {
        addText(text, parseInt(fontSizeRange.value), 'Arial', selectedTextColor);
        hideModal();
    }
});

// Remove old text button handler
const oldTextBtnHandler = document.getElementById('addTextBtn').onclick;
if (oldTextBtnHandler) {
    document.getElementById('addTextBtn').removeEventListener('click', oldTextBtnHandler);
}

// Initialize
initCanvas();

// Helper drawing functions
function drawHeart(x, y, size) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    
    // Move to the top middle of the heart
    ctx.moveTo(x, y - size/4);
    
    // Left curve (creates the left lobe of the heart)
    ctx.bezierCurveTo(
        x - size/2, y - size/2,     // Control point 1: up and left
        x - size/2, y,              // Control point 2: middle left
        x, y + size/2               // Bottom point
    );
    
    // Right curve (creates the right lobe of the heart)
    ctx.bezierCurveTo(
        x + size/2, y,              // Control point 1: middle right
        x + size/2, y - size/2,     // Control point 2: up and right
        x, y - size/4               // Back to start
    );
    
    ctx.fill();
    ctx.restore();
}

function drawStar(cx, cy, spikes, outerRadius, innerRadius) {
    ctx.save();
    ctx.beginPath();
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawSwirl(x, y, size) {
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    // Draw a more elegant spiral
    for(let i = 0; i <= 720; i++) {
        const angle = (i * Math.PI / 180);
        const radius = (i / 720) * size;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        if(i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
}

function drawDiamond(x, y, size) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    
    // Draw main diamond shape
    ctx.beginPath();
    // Top point
    ctx.moveTo(x, y - size);
    // Right point
    ctx.lineTo(x + size * 0.7, y);
    // Bottom point
    ctx.lineTo(x, y + size);
    // Left point
    ctx.lineTo(x - size * 0.7, y);
    ctx.closePath();
    ctx.fill();
    
    // Add facets for more diamond-like appearance
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1;
    
    // Draw center lines
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x, y + size);
    ctx.moveTo(x - size * 0.7, y);
    ctx.lineTo(x + size * 0.7, y);
    ctx.stroke();
    
    // Draw diagonal facets
    ctx.beginPath();
    ctx.moveTo(x - size * 0.35, y - size * 0.5);
    ctx.lineTo(x + size * 0.35, y - size * 0.5);
    ctx.moveTo(x - size * 0.35, y + size * 0.5);
    ctx.lineTo(x + size * 0.35, y + size * 0.5);
    ctx.stroke();
    
    ctx.restore();
}

// Handle intro overlay
document.getElementById('enterButton').addEventListener('click', () => {
    const overlay = document.getElementById('introOverlay');
    overlay.style.opacity = '0';
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 300);
}); 
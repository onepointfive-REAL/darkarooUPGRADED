const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

function getDominantColor(imagePath) {
    const imageBuffer = fs.readFileSync(imagePath);
    return new Promise((resolve, reject) => {
        loadImage(imageBuffer).then(img => {
            const canvas = createCanvas(img.width, img.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            let r = 0, g = 0, b = 0, count = 0;
            
            for (let i = 0; i < data.length; i += 16) {
                r += data[i];
                g += data[i + 1];
                b += data[i + 2];
                count++;
            }
            
            r = Math.round(r / count);
            g = Math.round(g / count);
            b = Math.round(b / count);
            
            resolve({ r, g, b });
        }).catch(reject);
    });
}

function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    
    return { 
        h: Math.round(h * 360), 
        s: Math.round(s * 100), 
        l: Math.round(l * 100)
    };
}

function getAccentColor({ r, g, b }) {
    const { h } = rgbToHsl(r, g, b);
    return `hsl(${h}, 40%, 95%)`;
}

async function transformData(inputFile, outputFile, iconsDir = 'icons') {
    // Read and parse input JSON
    const rawData = fs.readFileSync(inputFile, 'utf8');
    const data = JSON.parse(rawData);
    
    // Transform the data
    const transformedData = [];
    
    for (const item of data) {
        // Skip if status code isn't 200
        if (item.statusCode !== 200) {
            console.log(`Skipping ${item.url}: invalid status code ${item.statusCode}`);
            continue;
        }
        
        // Skip if any enhanced fields are "REDACTED"
        const { title, description, slogan } = item.enhanced;
        if (title === "REDACTED" || 
            description === "REDACTED" || 
            slogan === "REDACTED") {
            console.log(`Skipping ${item.url}: contains REDACTED content`);
            continue;
        }
        
        const transformed = {
            url: item.url,
            title: item.enhanced.title,
            description: item.enhanced.description,
            slogan: item.enhanced.slogan
        };
        
        // Process icon and color if icon exists
        if (item.iconPath) {
            const iconID = item.iconPath.split('\\').pop().split('.')[0];
            const iconPath = path.join(iconsDir, `${iconID}.png`);
            
            if (fs.existsSync(iconPath)) {
                transformed.iconID = iconID;
                try {
                    const dominantColor = await getDominantColor(iconPath);
                    transformed.accentColor = getAccentColor(dominantColor);
                    console.log(`Processed colors for ${item.url}`);
                } catch (error) {
                    console.error(`Error processing colors for ${item.url}:`, error);
                }
            } else {
                console.log(`Warning: Icon file not found for ${item.url}: ${iconPath}`);
            }
        }
        
        transformedData.push(transformed);
    }
    
    // Write transformed data to output file
    fs.writeFileSync(
        outputFile,
        JSON.stringify(transformedData, null, 2),
        'utf8'
    );
    
    console.log(`Processed ${transformedData.length} valid entries`);
    return transformedData;
}

// Usage
async function run() {
    try {
        await transformData('dirty_data.json', 'output.json', 'icons');
    } catch (error) {
        console.error('Error processing file:', error.message);
    }
}

run();
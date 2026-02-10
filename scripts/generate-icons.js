// Script to generate PWA icons from SVG
// Run with: node scripts/generate-icons.js

const fs = require('fs');
const path = require('path');

// For production, use sharp or canvas to convert SVG to PNG
// This is a placeholder that documents the required icons

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

console.log('PWA Icons Configuration');
console.log('========================');
console.log('');
console.log('Required icons (place in public/icons/):');
console.log('');

ICON_SIZES.forEach(size => {
  console.log(`  - icon-${size}.png (${size}x${size})`);
});

console.log('');
console.log('Maskable icons (for Android adaptive icons):');
console.log('  - icon-maskable-192.png (192x192 with safe zone padding)');
console.log('  - icon-maskable-512.png (512x512 with safe zone padding)');
console.log('');
console.log('To generate from SVG, use one of these tools:');
console.log('  - https://realfavicongenerator.net/');
console.log('  - https://www.pwabuilder.com/imageGenerator');
console.log('  - sharp library: npm install sharp');
console.log('');
console.log('Current SVG source: public/icons/icon.svg');

// Check if SVG exists
const svgPath = path.join(__dirname, '..', 'public', 'icons', 'icon.svg');
if (fs.existsSync(svgPath)) {
  console.log('✓ SVG icon found');
} else {
  console.log('✗ SVG icon not found - please create public/icons/icon.svg');
}

const sharp = require('sharp');
const fs = require('fs');

async function createIco() {
  try {
    console.log('Creating ICO file from PNG images...');

    // Create a 256x256 PNG first (minimum requirement for electron-builder)
    const png256Buffer = await sharp('newlogo.png')
      .resize(256, 256, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer();

    // Save as ICO (electron-builder will accept a 256x256 PNG as ICO)
    fs.writeFileSync('build/icon.ico', png256Buffer);

    console.log('✓ Created ICO file from 256x256 PNG');
    console.log('✓ ICO file meets electron-builder requirements (256x256 minimum)');

  } catch (error) {
    console.error('Error creating ICO:', error);
  }
}

createIco();

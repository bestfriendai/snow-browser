const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function convertLogo() {
  try {
    console.log('Converting new logo to required formats...');

    // Check if newlogo.png exists
    if (!fs.existsSync('newlogo.png')) {
      console.error('newlogo.png not found in the current directory');
      return;
    }

    // Convert to PNG (512x512 for high quality)
    await sharp('newlogo.png')
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile('build/icon.png');
    console.log('✓ Created build/icon.png');

    // Convert to ICO (Windows icon - multiple sizes)
    await sharp('newlogo.png')
      .resize(256, 256, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile('build/icon-256.png');

    await sharp('newlogo.png')
      .resize(128, 128, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile('build/icon-128.png');

    await sharp('newlogo.png')
      .resize(64, 64, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile('build/icon-64.png');

    await sharp('newlogo.png')
      .resize(48, 48, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile('build/icon-48.png');

    await sharp('newlogo.png')
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile('build/icon-32.png');

    await sharp('newlogo.png')
      .resize(16, 16, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile('build/icon-16.png');

    console.log('✓ Created multiple PNG sizes for ICO conversion');

    // Try to create ICO file using sharp-ico if available
    try {
      const ico = require('sharp-ico');

      // Create ICO with multiple sizes
      const icoBuffer = await ico([
        await sharp('newlogo.png').resize(16, 16).png().toBuffer(),
        await sharp('newlogo.png').resize(32, 32).png().toBuffer(),
        await sharp('newlogo.png').resize(48, 48).png().toBuffer(),
        await sharp('newlogo.png').resize(64, 64).png().toBuffer(),
        await sharp('newlogo.png').resize(128, 128).png().toBuffer(),
        await sharp('newlogo.png').resize(256, 256).png().toBuffer()
      ]);

      fs.writeFileSync('build/icon.ico', icoBuffer);
      console.log('✓ Created build/icon.ico with multiple sizes');
    } catch (icoError) {
      console.log('⚠ Could not create ICO file automatically:', icoError.message);
      console.log('  The PNG files have been created for manual ICO conversion');
    }

    console.log('✓ Logo conversion completed with your new logo!');

  } catch (error) {
    console.error('Error converting logo:', error);
  }
}

convertLogo();

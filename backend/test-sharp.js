const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Test 1: Create a simple test image and check Sharp processing
async function testSharpProcessing() {
  console.log('=== Testing Sharp Image Processing ===\n');

  try {
    // Create original image (simple red square)
    const originalPath = path.join(__dirname, 'test-original.jpg');
    const processedPath = path.join(__dirname, 'test-processed.jpg');

    // Create a simple 100x100 red image
    await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 }
      }
    })
      .toFile(originalPath);

    console.log('✓ Created original test image (100x100 red square)');
    const originalStats = fs.statSync(originalPath);
    console.log(`  Original size: ${originalStats.size} bytes`);

    // Now process it with sharp (like our middleware does)
    await sharp(originalPath)
      .rotate() // Auto-rotate based on EXIF
      .jpeg({ quality: 90, progressive: true })
      .toFile(processedPath);

    console.log('✓ Processed image with sharp');
    const processedStats = fs.statSync(processedPath);
    console.log(`  Processed size: ${processedStats.size} bytes`);

    // Check metadata
    const metadata = await sharp(processedPath).metadata();
    console.log('\n✓ Image metadata:');
    console.log(`  Width: ${metadata.width}`);
    console.log(`  Height: ${metadata.height}`);
    console.log(`  Format: ${metadata.format}`);
    console.log(`  Space: ${metadata.space}`);
    console.log(`  Density: ${metadata.density}`);
    console.log(`  Has Alpha: ${metadata.hasAlpha}`);

    console.log('\n✓ Sharp processing test PASSED\n');
  } catch (error) {
    console.error('✗ Sharp processing test FAILED');
    console.error(error);
  }
}

// Test 2: Check if the uploaded file from our earlier test still exists
async function checkUploadedFile() {
  console.log('=== Checking Previously Uploaded File ===\n');

  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) {
    console.log('✗ Uploads directory does not exist');
    return;
  }

  const files = fs.readdirSync(uploadDir);
  console.log(`✓ Found ${files.length} file(s) in uploads folder`);

  for (const file of files) {
    const filePath = path.join(uploadDir, file);
    try {
      const stats = fs.statSync(filePath);
      console.log(`\n  File: ${file}`);
      console.log(`  Size: ${stats.size} bytes`);

      // Try to get metadata
      const metadata = await sharp(filePath).metadata();
      console.log(`  Format: ${metadata.format}`);
      console.log(`  Dimensions: ${metadata.width}x${metadata.height}`);
      console.log(`  ✓ File is valid image`);
    } catch (error) {
      console.log(`  ✗ Error reading file: ${error.message}`);
    }
  }
}

(async () => {
  await testSharpProcessing();
  await checkUploadedFile();
})();

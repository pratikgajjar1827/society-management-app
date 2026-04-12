import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const assetsDir = path.join(root, 'assets');

const jobs = [
  {
    input: 'icon-luxury-full.svg',
    output: 'icon.png',
    size: 1024,
  },
  {
    input: 'icon-luxury-full.svg',
    output: 'favicon.png',
    size: 256,
  },
  {
    input: 'icon-luxury-full.svg',
    output: '../dist/store/play-store-icon.png',
    size: 512,
  },
  {
    input: 'icon-luxury-background.svg',
    output: 'android-icon-background.png',
    size: 1024,
  },
  {
    input: 'icon-luxury-foreground.svg',
    output: 'android-icon-foreground.png',
    size: 1024,
  },
  {
    input: 'icon-luxury-monochrome.svg',
    output: 'android-icon-monochrome.png',
    size: 1024,
  },
  {
    input: 'play-feature-graphic.svg',
    output: '../dist/store/play-feature-graphic.png',
    width: 1024,
    height: 500,
  },
];

await fs.mkdir(path.join(root, 'dist', 'store'), { recursive: true });

for (const job of jobs) {
  const inputPath = path.join(assetsDir, job.input);
  const outputPath = path.join(assetsDir, job.output);
  const svg = await fs.readFile(inputPath);

  let pipeline = sharp(svg, { density: 300 });

  if (job.size) {
    pipeline = pipeline.resize(job.size, job.size);
  } else {
    pipeline = pipeline.resize(job.width, job.height);
  }

  await pipeline
    .png()
    .toFile(outputPath);

  console.log(`Generated ${path.relative(root, outputPath)}`);
}

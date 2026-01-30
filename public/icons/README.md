# Icon Placeholders

This directory contains placeholder icon files for the MDify extension.

## Required Sizes

You need to create PNG icons with the following dimensions:
- icon16.png - 16x16 pixels
- icon32.png - 32x32 pixels
- icon48.png - 48x48 pixels
- icon128.png - 128x128 pixels

## Icon Design

The icon should represent:
- **M** (for MDify) in a gradient style
- Primary color: #667eea to #764ba2 (purple gradient)
- Background: Transparent or white/white with rounded corners

## Quick Generation

You can generate these icons using:
1. Figma/Sketch/Adobe XD
2. Online tools like favicon.io or canva.com
3. Using ImageMagick: `convert input.png -resize 16x16 icon16.png`

## Temporary Solution

For development, you can use any 128x128 PNG image and:
1. Copy it to all icon sizes
2. The extension will work with placeholder icons

# ArtistAssistApp

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-087ea4?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Ant_Design-1677FF?style=for-the-badge&logo=antdesign&logoColor=white" alt="Ant Design" />
  <img src="https://img.shields.io/badge/npm-F2F4F9?style=for-the-badge&logo=npm&logoColor=CC3534" alt="npm" />
</p>

<p align="center">
  <img src="https://github.com/eugene-khyst/artistassistapp/assets/1311126/de2c1ee3-fba2-4d94-b25a-dea7180fdb2a" width="150" alt="ArtistAssistApp logo" />
</p>

- [Overview](#1)
- [Getting Started](#2)
- [Screenshots](#3)
- [Implementation details](#4)

## <a id="1"></a>Overview

**ArtistAssistApp** is a Progressive Web App (PWA) for artists to accurately mix any color from a
photo, analyze tonal values, turn a photo into an outline, draw with the grid method, paint with a
limited palette, simplify a photo, compare photos pairwise, and more.

Try it now at [ArtistAssistApp.com](https://artistassistapp.com)

## <a id="2"></a>Getting Started

- Go to [ArtistAssistApp.com](https://artistassistapp.com/).
- [Watch the video tutorials](https://artistassistapp.com/tutorials/).
- Do you have a question?
  [Ask the community](https://github.com/eugene-khyst/artistassistapp/discussions).
- Do you see a bug or want to suggest a new feature?
  [Open an issue](https://github.com/eugene-khyst/artistassistapp/issues).
- Want to contact us? [Find our contacts](https://artistassistapp.com/contact/).

## <a id="3"></a>Screenshots

### Accurately mix any color from your reference photo using the paints you have

### Add your favorite color mixtures to the palette

### Do a tonal value study

### Reduce the detail on your reference photo

### Turn any photo into an outline and print it

### Draw a grid over your reference photo

### Play around with limited color palettes

### Mix specific colors from specific brands in any proportion

### Use pairwise comparison to rank your photos

### Install ArtistAssistApp on your device

## <a id="4"></a>Implementation details

ArtistAssistApp does not use artificial intelligence (AI), but rather mathematics.

The web app doesn't depend on any math or color library and includes the implementation of the
following:

- conversion between color models (e.g. sRGB to OKLCH),
- sRGB to spectral reflectance curve,
- subtractive color mixing using weighted geometric mean of reflectance curves,
- matrix operations,
- matrix inversion using LU decomposition,
- solving a system of linear algebraic equations using forward and backward substitution,
- the average color of the circular area of the image
- color distance (deltaEOK),
- vector operations,
- median blur filter using sliding window and histogram,
- erosion morphological filter,
- median cut for color quantization,
- RGB to grayscale conversion based on perceived lightness,
- ranking images using pairwise comparison and Elo rating system,
- and more.

The web app uses Web Workers for parallel processing and Service Workers for offline access.

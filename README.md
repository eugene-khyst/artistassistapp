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

![ArtistAssistApp: Color picker](https://github.com/user-attachments/assets/fb786022-5bed-4b82-9d36-2fd1b5ca0255)

![ArtistAssistApp: Color picker](https://github.com/user-attachments/assets/266f8196-0bf9-4c79-af68-8ab48f979c50)

![ArtistAssistApp: Color picker](https://github.com/user-attachments/assets/826df61a-3ebb-459d-93c2-214d5c343dfe)

![ArtistAssistApp: Color set](https://github.com/user-attachments/assets/4ed33616-138c-4f32-b3f5-0b4080574d8c)

### Add your favorite color mixtures to the palette

![ArtistAssistApp: Palette](https://github.com/user-attachments/assets/29ddc696-b077-4446-969f-d08ed88f037a)

![ArtistAssistApp: Color swatch](https://github.com/user-attachments/assets/384e4929-5001-4b47-baac-46ae827fefdc)

### Do a tonal value study

![ArtistAssistApp: Tonal values](https://github.com/user-attachments/assets/78eedac1-a7f0-4104-a642-170a1c0e83c6)

### Reduce the detail on your reference photo

![ArtistAssistApp: Simplified (None)](https://github.com/user-attachments/assets/4440bfa6-3b2f-451e-931e-f9f4306f9a18)

![ArtistAssistApp: Simplified (Large)](https://github.com/user-attachments/assets/47e91712-f305-43a2-b120-cc2132e3884a)

### Turn any photo into an outline and print it

![ArtistAssistApp: Outline](https://github.com/user-attachments/assets/8c66b6a1-b801-45f3-9f4c-0d32ddabe018)

### Draw a grid over your reference photo

![ArtistAssistApp: Grid (Square grid)](https://github.com/user-attachments/assets/68e7a139-e5ab-4ba2-9a35-6ba06ff1d1b3)

![ArtistAssistApp: 4x4 grid](https://github.com/user-attachments/assets/7e565f7c-74e4-4f14-82b3-84a40caa2583)

![ArtistAssistApp: 3x3 grid](https://github.com/user-attachments/assets/ccc285d5-348d-49d7-92a6-52c3ebe44419)

### Play around with limited color palettes

![ArtistAssistApp: Limited palette](https://github.com/user-attachments/assets/abf3273f-6f79-495f-8eb6-8935d884373e)

![ArtistAssistApp: Limited palette](https://github.com/user-attachments/assets/2e911e06-b8cd-4e60-8a14-90fa1ace089d)

### Mix specific colors from specific brands in any proportion

![ArtistAssistApp: Color mixing](https://github.com/user-attachments/assets/690d8f3c-5a57-4998-a1ca-243e2089ba0f)

![ArtistAssistApp: Color mixing](https://github.com/user-attachments/assets/698f0e64-744d-468f-8de5-6230cdd56403)

![ArtistAssistApp: Color mixing](https://github.com/user-attachments/assets/3ffc3d79-2c86-4a84-95a2-9ba09c6d7f89)

![ArtistAssistApp: Spectral reflectance curve](https://github.com/user-attachments/assets/af80e04f-41f1-4a4f-aa61-ef074c6ce5f5)

### Use pairwise comparison to rank your photos

![ArtistAssistApp: Compare photos pairwise](https://github.com/user-attachments/assets/ed4474b5-aaaa-44fa-b4cc-5249eea94596)

![ArtistAssistApp: Compare photos pairwise](https://github.com/user-attachments/assets/3aba15b0-e89c-4860-95c6-487bf3952dcc)

![ArtistAssistApp: Compare photos pairwise (Rating)](https://github.com/user-attachments/assets/6c908726-919e-465f-850c-5982fce8eaa3)

### Share your color set with others or between your devices

![ArtistAssistApp: Share color set](https://github.com/user-attachments/assets/f760d0f6-eae4-4534-b963-be6b5e5d928f)

### Install ArtistAssistApp on your device

![ArtistAssistApp: Install](https://github.com/user-attachments/assets/e66cc797-6904-45e1-bd04-7be508229246)

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

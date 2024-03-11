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

**ArtistAssistApp** is the best ever FREE painting assistant tool that allows artists to see the reference photo more clearly and mix colors more accurately.

ArtistAssistApp provides various tools for artists for accurate color mixing from a photo based on real paints, tonal value study, grid method for drawing, simplified sketching, etc.

Try it now at [ArtistAssistApp.com](https://artistassistapp.com)

https://github.com/eugene-khyst/artistassistapp/assets/1311126/603f0a81-ffdc-4a7b-b132-741df036e692

## <a id="2"></a>Getting Started
* Go to [ArtistAssistApp.com](https://artistassistapp.com/).
* [Watch the video tutorials](https://artistassistapp.com/tutorials/).
* Do you have a question? [Ask the community](https://github.com/eugene-khyst/artistassistapp/discussions).
* Do you see a bug or want to suggest a new feature? [Open an issue](https://github.com/eugene-khyst/artistassistapp/issues).
* Want to contact us? [Find our contacts](https://artistassistapp.com/contact/).

## <a id="3"></a>Screenshots

### Accurately mixing a color from a reference photo with real paints
![ArtistAssistApp: accurately mixing a color from a reference photo with real paints](https://github.com/eugene-khyst/artistassistapp/assets/1311126/5feaf4c1-f583-4217-9262-566e46f8916b)

### Adding your favorite color mixtures to the palette
![ArtistAssistApp: the palette](https://github.com/eugene-khyst/artistassistapp/assets/1311126/7220638b-335b-4929-ae79-191a41b1ad3f)
![ArtistAssistApp: color swatch mode](https://github.com/eugene-khyst/artistassistapp/assets/1311126/ce753078-f9f3-4428-b4f8-32e30d601e45)

### Tonal value study
![ArtistAssistApp: tonal value study](https://github.com/eugene-khyst/artistassistapp/assets/1311126/840356af-9d82-4644-bf91-dbd496ea3dde)

### Drawing a grid over a reference photo
![ArtistAssistApp: drawing with a grid method (square grid)](https://github.com/eugene-khyst/artistassistapp/assets/1311126/df7e1bcd-99e4-4b71-8cfb-4a3ba4d89654)
![ArtistAssistApp: drawing with a grid method (3x3 grid)](https://github.com/eugene-khyst/artistassistapp/assets/1311126/86db88d1-b4d6-4b87-a3f6-a51da4b351ff)
![ArtistAssistApp: drawing with a grid method (4x4 grid)](https://github.com/eugene-khyst/artistassistapp/assets/1311126/adcdb979-da8d-49fc-a9ac-198e45b26990)

### Smoothing out a reference photo
![ArtistAssistApp: smoothing out a reference photo](https://github.com/eugene-khyst/artistassistapp/assets/1311126/f48a52cc-5cca-4d8f-a3b5-26bc6c2eaaec)
![ArtistAssistApp: smoothing out a reference photo](https://github.com/eugene-khyst/artistassistapp/assets/1311126/38a42cfb-f01e-4a3e-93e2-ff0daae8c6fe)

### Previewing a photo painted using a limited palette
![ArtistAssistApp: previewing a reference photo in different primary colors](https://github.com/eugene-khyst/artistassistapp/assets/1311126/5e42e6e5-a1e9-4492-9dc4-27a358ee93d1)
![ArtistAssistApp: previewing a reference photo in different primary colors](https://github.com/eugene-khyst/artistassistapp/assets/1311126/02b9a99b-4a50-4f9f-9d51-a8100758b3ea)

### Mixing specific colors of specific brands in any proportions
![ArtistAssistApp: mixing specific colors of specific brands in any proportions](https://github.com/eugene-khyst/artistassistapp/assets/1311126/9f986b5d-c791-4e25-804e-3c4e831c4deb)
![ArtistAssistApp: mixing specific colors of specific brands in any proportions](https://github.com/eugene-khyst/artistassistapp/assets/1311126/06403c20-d0b5-4261-9c1f-95eab381124b)
![ArtistAssistApp: mixing specific colors of specific brands in any proportions](https://github.com/eugene-khyst/artistassistapp/assets/1311126/44d9a9d1-51a2-494a-befd-c34ea51997da)
![ArtistAssistApp: spectral reflectance curve](https://github.com/eugene-khyst/artistassistapp/assets/1311126/95b70f71-59aa-4604-8b27-a9d34e24d7f6)

## <a id="4"></a>Implementation details

This project does not use artificial intelligence (AI), but rather mathematics.

The core logic of the project doesn't depend on any math or color library and includes the implementation of the following:

- converting between color models (e.g. sRGB to CIELAB),
- sRGB to spectral reflectance curve,
- subtractive color mixing using weighted geometric mean of reflectance curves,
- matrix operations,
- matrix inversion using LU decomposition,
- solving a system of linear algebraic equations using forward and backward substitution,
- the average color of the circular area of the image
- color difference using CIEDE2000,
- vector operations,
- fast median blur using sliding window and histogram,
- median cut for color quantization,
- RGB to grayscale conversion based on luminance,
- and more.

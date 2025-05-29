# <a id="0"></a>ArtistAssistApp

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-087ea4?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Ant_Design-1677FF?style=for-the-badge&logo=antdesign&logoColor=white" alt="Ant Design" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/npm-F2F4F9?style=for-the-badge&logo=npm&logoColor=CC3534" alt="npm" />
</p>

<p align="center">
  <img src="https://github.com/eugene-khyst/artistassistapp/assets/1311126/de2c1ee3-fba2-4d94-b25a-dea7180fdb2a" width="150" alt="ArtistAssistApp logo" />
</p>

- [Overview](#1)
- [Getting Started](#2)
- [Implementation details](#3)
- [Screenshots](#4)

<!-- Table of contents is made with https://github.com/eugene-khyst/md-toc-cli -->

## <a id="1"></a>Overview

**ArtistAssistApp**, also known as **Artist Assist App**, is a Progressive Web App (PWA) that helps artists to mix colors from photos, analyze tonal values, outline photos, draw with grids, paint with limited palettes, and more.

ArtistAssistApp offers the following features:

- Match any color from your photo or learn how to accurately mix it
- Mix any colors of any brands in any proportions
- Save & access your favorite color mixes instantly
- Convert photos to clean outlines with ease
- Draw a grid over your reference photo for accurate drawing
- Analyze tonal values to improve contrast
- Simplify photos by smoothing details
- Experiment with limited color palettes
- Get inspired by applying artistic styles to your photos
- Correct white balance & colors in your artwork photos
- Easily remove backgrounds from artwork photos
- Rank your photos using a pairwise comparison
- Sync your color sets across devices
- Install the app on your device for offline access

Try it now at [ArtistAssistApp.com](https://artistassistapp.com)

## <a id="2"></a>Getting Started

- Go to [ArtistAssistApp.com](https://artistassistapp.com/).
- [Watch the video tutorials](https://artistassistapp.com/en/tutorials/).
- Join on [Patreon](https://www.patreon.com/ArtistAssistApp)
- Want to contact us? [Find our contacts](https://artistassistapp.com/contact/).

## <a id="3"></a>Implementation details

ArtistAssistApp doesn't depend on any math or color library and includes the implementation of the
following:

- sRGB to Oklab (WebGL),
- sRGB to spectral reflectance,
- subtractive color mixing using empirical model based on the Kubelka-Munk theory,
- matrix operations,
- matrix inversion using LU decomposition,
- solving a system of linear algebraic equations using forward and backward substitution,
- the average color of the circular area of the image
- calculation of color similarity by comparing spectral reflections (weighted geometric mean of angular similarity (cosine) and Euclidean distance)
- vector operations,
- WebGL multi-pass rendering,
- two-pass one-dimensional Gaussian blur (WebGL),
- Sobel operator for edge detection (WebGL),
- threshold filter based on perceived lightness (WebGL),
- Kuwahara blur filter (WebGL),
- median cut for color quantization,
- adjusting white balance with white patch algorithm (WebGL),
- adjusting saturation (WebGL),
- adjusting color levels (WebGL),
- adjusting color temperature (WebGL),
- invert colors filter with gamma correction (WebGL),
- ranking images using pairwise comparison and Elo rating system,
- and more.

ArtistAssistApp uses Web Workers for parallel processing and Service Workers for offline access.

ArtistAssistApp uses an empirical model based on the Kubelka-Munk theory to simulate real color mixing, focusing on spectral reflectances instead of RGB or other color models. It calculates color similarity by comparing spectral reflectance curves and presents the similarity as a percentage.

For mediums that support physical mixing, such as watercolor, oil paint, acrylic or gouache, ArtistAssistApp will suggest the matching color mixture for any target color. For pastels and pencils, the app will suggest the closest matching color from your set. Watercolor, acrylic, oil paint, colored pencils and watercolor pencils also support optical mixing.

## <a id="4"></a>Screenshots

![ArtistAssistApp Color picker](https://github.com/user-attachments/assets/06690b52-1dd8-4ac2-8b88-e4815ece7b1b)

![ArtistAssistApp Color picker](https://github.com/user-attachments/assets/3d9370b7-87a9-469c-ac31-8a80e5e10d22)

![ArtistAssistApp Color mixing](https://github.com/user-attachments/assets/321df950-bf1a-4893-9bb8-cea252cfdce3)

![ArtistAssistApp Color mixing](https://github.com/user-attachments/assets/790d013a-e8d1-454c-929b-f6ba9c4ea59b)

![ArtistAssistApp Outline](https://github.com/user-attachments/assets/2608d505-379b-41dc-848b-2708c04dc764)

![ArtistAssistApp Grid](https://github.com/user-attachments/assets/a4fcd136-bcfd-4522-ac66-a4729f6a890c)

![ArtistAssistApp Tonal values](https://github.com/user-attachments/assets/e8493f20-2c1c-4017-a77d-45bfd8b1f341)

![ArtistAssistApp Background removal](https://github.com/user-attachments/assets/56cfe774-7251-4b46-b020-0b12a78f731f)

![ArtistAssistApp Spectral reflectance curve](https://github.com/user-attachments/assets/abd233bf-c04d-4e01-8f93-64e5d2be264b)

![ArtistAssistApp Spectral reflectance curve](https://github.com/user-attachments/assets/ce08c975-cbc3-4ced-aa70-680eb8a45db0)

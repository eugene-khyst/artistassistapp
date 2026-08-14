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
- Generate a color mixing chart from any subset of your colors to plan mixes without wasting paint
- Automatically build a palette from a photo with the best matching color mixtures
- Save & access your favorite color mixes instantly
- Share color sets through links and QR codes
- Convert your photos into clean outlines, then trace them your way: print at any size on your home printer, turn your tablet or laptop into a light box (no printer needed), or overlay directly onto canvas, walls, or any surface with AR.
- Add a grid over your reference photo for accurate, proportional drawing.
- Analyze tonal values to improve contrast, including a color map view
- Simplify photos by smoothing distracting details while keeping a selected focal point clearer
- Mix harmonious colors with limited palettes
- Get inspired by applying built-in or user-supplied artistic styles to your photos
- Adjust white balance and colors of photos of your paintings
- Adjust perspective and geometry of photos of your paintings, with automatic detection of the painting's corners
- Easily remove backgrounds from photos of your paintings
- Rank your photos using a pairwise comparison
- Sync color sets, reference photos, saved color mixtures, and custom color brands across devices using Google Drive, OneDrive, or Dropbox
- Back up and restore the same data locally with ZIP files
- Install the app on your device for offline access

Try it now at [ArtistAssistApp.com](https://artistassistapp.com)

## <a id="2"></a>Getting Started

- Go to [ArtistAssistApp.com](https://artistassistapp.com/).
- [Watch the video tutorials](https://artistassistapp.com/en/tutorials/).
- Join on [Patreon](https://www.patreon.com/ArtistAssistApp), then log in with Patreon or an email code.
- Want to contact us? [Find our contacts](https://artistassistapp.com/contact/).

## <a id="3"></a>Implementation details

ArtistAssistApp doesn't depend on any third-party math or color library and includes the
implementation of the following:

- sRGB to Oklab (WebGL)
- sRGB to spectral reflectance
- subtractive color mixing using empirical model based on the Kubelka-Munk theory
- warm and cool color classification from the way a pigment leans off its primary in Oklch
- sRGB colors of monochromatic light, from the CIE 1931 2° color matching functions
- sRGB colors of black-body radiators, from Planck's law, interpolated in mireds
- solving a bordered tridiagonal system using the Thomas algorithm and a 3×3 Schur complement
- the average color of the circular area of the image
- calculation of color similarity by comparing spectral reflections (weighted geometric mean of angular similarity (cosine) and Euclidean distance)
- sampling point detection via Chamfer 3-4 distance transform (finds the optimal point per color region)
- greedy merging of sampling points by Oklab chroma and ΔE to select minimal, perceptually distinct palette entries
- vector operations
- WebGL multi-pass rendering
- two-pass one-dimensional Gaussian blur (WebGL)
- Sobel operator for edge detection (WebGL)
- separable grayscale dilation (max morphology) for edge thickening (WebGL)
- threshold filter based on perceived lightness (WebGL)
- tonal color map (WebGL)
- Otsu's method for automatic threshold selection in Oklab lightness (CPU)
- Kuwahara blur filter (WebGL)
- multi-layer radial masking for focal-point-aware image simplification (WebGL)
- color match filter using Oklab Euclidean distance (WebGL)
- color quantization (over-quantize by recursive bucket splitting, then merge closest in Oklab)
- blue noise ordered dithering with a precomputed threshold texture
- image resampling via bilinear, bicubic and Lanczos interpolation (WebGL)
- bilinear interpolation (CPU)
- adjusting white balance using the percentile and reference methods (WebGL)
- adjusting saturation (WebGL)
- adjusting color levels (WebGL)
- adjusting color temperature (WebGL)
- invert colors filter with gamma correction (WebGL)
- homography, perspective transform from quadrilateral to rectangle (WebGL)
- automatic detection of painting corners via a neural network that regresses a 4-channel corner heatmap
- corner localization from heatmaps: Otsu thresholding, Moore-Neighbor 8-connectivity contour tracing, and polygon area and centroid via Green's theorem (shoelace formula) on the largest blob per channel
- ranking images using pairwise comparison and Elo rating system
- and more

Reflectance reconstruction uses an independent implementation of the LHTSS formulation described
by Scott Allen Burns in [Generating Reflectance Curves from sRGB
Triplets](https://arxiv.org/abs/1710.05732). The reflectance-to-linear-sRGB matrix and luminance
weights are generated from the CIE 1931 2° observer, D65 illuminant, and sRGB primaries. The solver
uses a tridiagonal factorization and a 3×3 Schur complement. No code or constants from Burns's
implementation are used.

The colors of the visible spectrum and of black-body radiators are derived from the same CIE data.
Monochromatic colors come from the CIE 1931 2° color matching functions, black-body colors from
Planck's law weighted by them, and both are converted to sRGB through the same matrix and gamut
mapping. They are generated tables rather than curve fits, and use no third-party code or constants.

ArtistAssistApp uses an empirical model based on the Kubelka-Munk theory to simulate real color mixing, focusing on spectral reflectances instead of RGB or other color models. It calculates color similarity by comparing spectral reflectance curves and presents the similarity as a percentage.

For mediums that support physical mixing, such as watercolor, oil paint, acrylic or gouache, ArtistAssistApp will suggest the matching color mixture for any target color. For pastels and pencils, the app will suggest the closest matching color from your set. Watercolor, acrylic, oil paint, colored pencils and watercolor pencils also support optical mixing.

Warm and cool follow the painter's rule: a pigment is warm or cool by the way it leans off its own
primary, so a blue leaning red is warm while a red leaning blue is cool.

ArtistAssistApp uses Web Workers for parallel processing and Service Workers for offline access.

## <a id="4"></a>Screenshots

![ArtistAssistApp Color picker](https://github.com/user-attachments/assets/56b697a0-b41c-4781-b4e7-82508cc02c4b)

![ArtistAssistApp Color picker](https://github.com/user-attachments/assets/d9c3abe5-cdbb-458e-82bc-ccdadb21dd65)

![ArtistAssistApp Color mixing](https://github.com/user-attachments/assets/321df950-bf1a-4893-9bb8-cea252cfdce3)

![ArtistAssistApp Color mixing](https://github.com/user-attachments/assets/790d013a-e8d1-454c-929b-f6ba9c4ea59b)

![ArtistAssistApp Outline](https://github.com/user-attachments/assets/b2a8d6ef-e0bb-4b63-bd10-06814b661edc)

![ArtistAssistApp Grid](https://github.com/user-attachments/assets/a4fcd136-bcfd-4522-ac66-a4729f6a890c)

![ArtistAssistApp Tonal values](https://github.com/user-attachments/assets/e8493f20-2c1c-4017-a77d-45bfd8b1f341)

![ArtistAssistApp Background removal](https://github.com/user-attachments/assets/56cfe774-7251-4b46-b020-0b12a78f731f)

![ArtistAssistApp Spectral reflectance curve](https://github.com/user-attachments/assets/abd233bf-c04d-4e01-8f93-64e5d2be264b)

![ArtistAssistApp Spectral reflectance curve](https://github.com/user-attachments/assets/ce08c975-cbc3-4ced-aa70-680eb8a45db0)

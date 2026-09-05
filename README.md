# <a id="0"></a>ArtistAssistApp

<p align="center">
  <img src="https://raw.githubusercontent.com/eugene-khyst/artistassistapp/main/public/assets/favicon/pwa-512x512.png" width="150" alt="ArtistAssistApp logo" />
</p>

- [Overview](#1)
- [Getting Started](#2)
- [Implementation details](#3)
- [Screenshots](#4)
- [License](#5)

<!-- Table of contents is made with https://github.com/eugene-khyst/md-toc-cli -->

## <a id="1"></a>Overview

**ArtistAssistApp**, also known as **Artist Assist App**, is a Progressive Web App (PWA) that helps artists to mix colors from photos, analyze tonal values, outline photos, draw with grids, paint with limited palettes, edit reference photos, prepare photos of finished paintings for publishing, and more.

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
- Simplify a photo into a painting reference with fewer small details, so the main shapes, proportions and color areas are easier to see; the whole image is simplified, gently near the focal point you choose and more strongly away from it
- Mix harmonious colors with limited palettes
- Get inspired by applying built-in or user-supplied artistic styles to your photos
- Straighten a photo of your painting and correct its perspective, with automatic detection of the painting's corners, so it is ready to publish
- Adjust white balance, levels, saturation, and color temperature to make a photo of a painting match the original
- Crop a photo, or expand the canvas beyond the original frame and let the app fill the new area
- Easily remove backgrounds from photos of your paintings
- Remove unwanted objects from a reference photo
- Upscale a photo to a higher resolution
- Colorize black-and-white photos
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

ArtistAssistApp does not depend on any third-party math or color library. Conversions between sRGB, linear RGB, CIE XYZ, CIE Lab and Oklab/Oklch, the reflectance-to-sRGB matrix and the luminance weights are all generated from the CIE 1931 2° observer, the D65 illuminant and the sRGB primaries, so the GPU and the TypeScript paths cannot disagree. Color mixing is subtractive and spectral: sRGB is reconstructed into a reflectance curve, mixed with an empirical model based on the Kubelka-Munk theory, and candidate mixtures are ranked by perceptual similarity and shown as a match percentage. Warm and cool follow the painter's rule - a pigment is warm or cool by the way it leans off its own primary in Oklch, so a blue leaning red is warm while a red leaning blue is cool. The colors of the visible spectrum and of black-body radiators come from the same CIE data, as generated tables rather than curve fits.

Reflectance reconstruction uses an independent implementation of the LHTSS formulation described by Scott Allen Burns in [Generating Reflectance Curves from sRGB Triplets](https://arxiv.org/abs/1710.05732), solved as a bordered tridiagonal system with the Thomas algorithm and a 3×3 Schur complement. No code or constants from Burns's implementation are used.

For mediums that support physical mixing, such as watercolor, oil paint, acrylic or gouache, ArtistAssistApp suggests a matching color mixture for any target color. For pastels and pencils it suggests the closest matching color from your set. Watercolor, acrylic, oil paint, colored pencils and watercolor pencils also support optical mixing.

Image processing is a multi-pass WebGL pipeline: Lanczos and bilinear resampling, Gaussian blur, Kuwahara and radial-mask simplification, Sobel edge detection with dilation and a perceived-lightness threshold, tonal color maps, perceptual color matching, white balance, levels, saturation, temperature, and homography for perspective correction. Otsu thresholding, color quantization with blue-noise ordered dithering, distance-transform sampling-point detection for automatic palettes and Elo ranking from pairwise comparisons run on the CPU.

Neural models for background removal, line drawing, corner detection, style transfer, inpainting, colorization and super-resolution run locally with ONNX Runtime Web on WebAssembly, downloaded on demand and cached; images are never uploaded to a server. Each model is a separate work under its own license; see [THIRD-PARTY-NOTICES.txt](public/THIRD-PARTY-NOTICES.txt).

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

## <a id="5"></a>License

ArtistAssistApp is licensed under the GNU Affero General Public License v3.0. See
[LICENSE](LICENSE).

The machine-learning models the app downloads and runs are separate works, each under its own
license. See [THIRD-PARTY-NOTICES.txt](public/THIRD-PARTY-NOTICES.txt), also served at
[artistassistapp.com/THIRD-PARTY-NOTICES.txt](https://artistassistapp.com/THIRD-PARTY-NOTICES.txt).

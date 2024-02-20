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

**ArtistAssistApp** is the best ever FREE painting assistant tool that allows artists to see the reference photo more clearly and mix colors more accurately.

ArtistAssistApp provides various tools for artists for accurate color mixing from a photo based on real paints, tonal value study, grid method for drawing, simplified sketching, etc.

Try it now at [ArtistAssistApp.com](https://artistassistapp.com)

https://github.com/eugene-khyst/artistassistapp/assets/1311126/21bd5ea5-c815-4ac5-a4e5-849fdc139cd5

## Getting Started
* Go to [ArtistAssistApp.com](https://artistassistapp.com/).
* [Watch the video tutorials](https://artistassistapp.com/tutorials/).
* Do you have a question? [Ask the community](https://github.com/eugene-khyst/artistassistapp/discussions).
* Do you see a bug or want to suggest a new feature? [Open an issue](https://github.com/eugene-khyst/artistassistapp/issues).
* Want to contact us? [Find our contacts](https://artistassistapp.com/contact/).

## Screenshots

### Accurately mixing a color from a reference photo with real paints
![ArtistAssistApp: accurately mixing a color from a reference photo with real paints](https://github.com/eugene-khyst/artistassistapp/assets/1311126/ba416c21-8963-44b9-b1df-453574705d4d)

### Tonal value study
![ArtistAssistApp: tonal value study](https://github.com/eugene-khyst/artistassistapp/assets/1311126/24f9046c-bd35-4cb1-a9ec-e105baea2c61)

### Drawing a grid over a reference photo
![ArtistAssistApp: drawing with a grid method (square grid)](https://github.com/eugene-khyst/artistassistapp/assets/1311126/7136703b-f0bf-4045-b965-c2de71a751be)
![ArtistAssistApp: drawing with a grid method (3x3 grid)](https://github.com/eugene-khyst/artistassistapp/assets/1311126/06bd07c4-d275-4963-8a9e-6b25b643dec2)

### Smoothing out a reference photo
![ArtistAssistApp: smoothing out a reference photo](https://github.com/eugene-khyst/artistassistapp/assets/1311126/d996a522-00b1-4893-a4c0-984c9f633692)
![ArtistAssistApp: smoothing out a reference photo](https://github.com/eugene-khyst/artistassistapp/assets/1311126/28a7d6d3-139e-400a-98a7-4f7847a6f02b)

### Previewing a photo painted using a limited palette
![ArtistAssistApp: previewing a reference photo in different primary colors](https://github.com/eugene-khyst/artistassistapp/assets/1311126/c9ee4264-ed51-4236-a6e1-34493f240800)
![ArtistAssistApp: previewing a reference photo in different primary colors](https://github.com/eugene-khyst/artistassistapp/assets/1311126/5cc91900-c7c5-477a-a208-d54a82e01cb3)

### Mixing specific colors of specific brands in any proportions

![ArtistAssistApp: mixing specific colors of specific brands in any proportions](https://github.com/eugene-khyst/artistassistapp/assets/1311126/f6fda910-9b04-481f-be70-d5e7afd69cc4)
![ArtistAssistApp: mixing specific colors of specific brands in any proportions](https://github.com/eugene-khyst/artistassistapp/assets/1311126/96a55f9e-83f7-4ed8-95e8-faf3596ac166)
![ArtistAssistApp: mixing specific colors of specific brands in any proportions](https://github.com/eugene-khyst/artistassistapp/assets/1311126/a7387549-3df3-491e-bd59-73884d81be4a)
![ArtistAssistApp: spectral reflectance curve](https://github.com/eugene-khyst/artistassistapp/assets/1311126/08f694f0-7751-41c9-8922-868d28f394df)
![ArtistAssistApp: spectral reflectance curve](https://github.com/eugene-khyst/artistassistapp/assets/1311126/2f78e671-56c0-48af-a2c9-f99d47803fb9)

## Implementation details

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

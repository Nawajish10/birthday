const fs = require('fs');
const path = require('path');

const manifestPath = path.resolve(__dirname, '../src/data/google-photos-manifest.json');
const outputPath = path.resolve(__dirname, '../src/lib/google-photos-data.ts');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const specialPhoto = {
  id: "gphoto_special_birthday_popup",
  contentHash: "special_birthday_popup_vnaqyefkumm2goqx7",
  mediaKind: "image",
  url: "https://lh3.googleusercontent.com/pw/AP1GczMLasTHYPPFuDPfLPRSnH5tQ6mhgV3XNu-V5SBjy_maHYwLX5_Ej716nIoS7pipr9aPZrJObZTzo-QGHxKckSqpY6EtdiRb_qnVCyjw_1dU1tYIk3iF=w1200-h1200-no",
  originalUrl: "https://lh3.googleusercontent.com/pw/AP1GczMLasTHYPPFuDPfLPRSnH5tQ6mhgV3XNu-V5SBjy_maHYwLX5_Ej716nIoS7pipr9aPZrJObZTzo-QGHxKckSqpY6EtdiRb_qnVCyjw_1dU1tYIk3iF=s0",
  fullDisplayUrl: "https://lh3.googleusercontent.com/pw/AP1GczMLasTHYPPFuDPfLPRSnH5tQ6mhgV3XNu-V5SBjy_maHYwLX5_Ej716nIoS7pipr9aPZrJObZTzo-QGHxKckSqpY6EtdiRb_qnVCyjw_1dU1tYIk3iF=w1600-h1600-no",
  thumbnailUrl: "https://lh3.googleusercontent.com/pw/AP1GczMLasTHYPPFuDPfLPRSnH5tQ6mhgV3XNu-V5SBjy_maHYwLX5_Ej716nIoS7pipr9aPZrJObZTzo-QGHxKckSqpY6EtdiRb_qnVCyjw_1dU1tYIk3iF=w400-h400-c",
  storagePath: "google-photos/special-birthday-meerah.jpg",
  effectiveCaptureDate: "2025-11-23T00:00:00.000Z",
  hasKnownCaptureDate: true,
  uploadTimestamp: "2026-10-30T00:00:00.000Z",
  width: 1200,
  height: 1600,
  caption: "Birthday Girl Meerah ✿",
  altText: "Meerah birthday celebration portrait",
  status: "ready",
  metadata: {
    provider: "google_cdn",
    albumUrl: "https://photos.app.goo.gl/VNaQyEfKumM2goqx7",
    rawUrl: "https://lh3.googleusercontent.com/pw/AP1GczMLasTHYPPFuDPfLPRSnH5tQ6mhgV3XNu-V5SBjy_maHYwLX5_Ej716nIoS7pipr9aPZrJObZTzo-QGHxKckSqpY6EtdiRb_qnVCyjw_1dU1tYIk3iF",
    albumIndex: 0,
    isSpecialBirthdayPhoto: true
  }
};

const allPhotos = [specialPhoto, ...manifest.photos];

const code = `import type { PhotoAsset } from "../types/media-contracts.ts";

export const SPECIAL_POPUP_PHOTO: PhotoAsset = ${JSON.stringify(specialPhoto, null, 2)};

export const GOOGLE_PHOTOS_DATA: PhotoAsset[] = ${JSON.stringify(allPhotos, null, 2)};

export const FIRST_GOOGLE_PHOTO: PhotoAsset = SPECIAL_POPUP_PHOTO;
`;

fs.writeFileSync(outputPath, code, 'utf8');
console.log(`Generated ${outputPath} with ${allPhotos.length} photos`);

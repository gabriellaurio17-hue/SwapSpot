import { supabase } from './supabaseClient';

const LISTING_PHOTO_BUCKET = 'listing-photos';
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const MAX_GCASH_QR_SIZE = 1024 * 1024;
const MAX_IMAGE_WIDTH = 1280;
const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('The selected photo could not be read.'));
    };
    image.src = objectUrl;
  });
}

async function resizeImage(file) {
  const image = await loadImage(file);
  if (!image.naturalWidth || !image.naturalHeight) {
    throw new Error('The selected photo has invalid image dimensions.');
  }
  const width = Math.min(image.naturalWidth, MAX_IMAGE_WIDTH);
  const height = Math.round(image.naturalHeight * (width / image.naturalWidth));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image resizing is not supported by this browser.');

  context.drawImage(image, 0, 0, width, height);
  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, file.type, 0.9);
  });

  if (!blob) throw new Error('The selected photo could not be resized.');
  if (blob.type !== file.type) {
    throw new Error(`This browser cannot process ${file.type} photos.`);
  }
  if (blob.size > MAX_FILE_SIZE) {
    throw new Error('The resized photo exceeds 2 MB. Choose a smaller photo.');
  }

  return blob;
}

export async function uploadListingPhoto(file, userId) {
  if (!file) throw new Error('Choose a photo for your listing.');
  if (!Object.prototype.hasOwnProperty.call(ALLOWED_IMAGE_TYPES, file.type)) {
    throw new Error('Photo must be a JPEG, PNG, or WebP image.');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Photo must be 2 MB or smaller.');
  }
  if (!userId) throw new Error('You must be signed in to upload a listing photo.');

  const uuid = window.crypto?.randomUUID?.();
  if (!uuid) throw new Error('Secure photo uploads are not supported by this browser.');

  const extension = ALLOWED_IMAGE_TYPES[file.type];
  const path = `${userId}/${uuid}.${extension}`;
  const image = await resizeImage(file);
  const { error } = await supabase
    .storage
    .from(LISTING_PHOTO_BUCKET)
    .upload(path, image, { contentType: file.type, upsert: false });

  if (error) throw error;
  return path;
}

export function getListingPhotoUrl(path) {
  if (!path) return null;

  const { data } = supabase.storage.from(LISTING_PHOTO_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error('Could not create a public URL for the listing photo.');
  return data.publicUrl;
}

export async function uploadGcashQr(file, userId) {
  if (!file) throw new Error('Choose a GCash QR image.');
  if (!['image/png', 'image/jpeg'].includes(file.type)) {
    throw new Error('GCash QR must be a PNG or JPEG image.');
  }
  if (file.size > MAX_GCASH_QR_SIZE) {
    throw new Error('GCash QR image must be 1 MB or smaller.');
  }
  if (!userId) throw new Error('You must be signed in to upload a GCash QR.');

  const path = `${userId}/qr.png`;
  const { error } = await supabase
    .storage
    .from('gcash-qr')
    .upload(path, file, { contentType: file.type, upsert: true });

  if (error) throw error;
  return path;
}

export async function getGcashQrUrl(path) {
  if (!path) throw new Error('A GCash QR path is required.');

  const { data, error } = await supabase
    .storage
    .from('gcash-qr')
    .createSignedUrl(path, 60);

  if (error) throw error;
  if (!data?.signedUrl) throw new Error('Could not create a temporary GCash QR link.');
  return data.signedUrl;
}

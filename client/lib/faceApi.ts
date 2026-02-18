/**
 * Face API - تحميل نماذج التعرف على الوجه
 */

const MODEL_URL = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights";

let modelsLoaded = false;

export async function loadFaceModels() {
  if (modelsLoaded) return;
  const faceapi = await import("face-api.js");
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
  await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
  modelsLoaded = true;
}

const DETECTOR_OPTS = { inputSize: 224, scoreThreshold: 0.3 };

export async function detectFaceDescriptor(videoOrImage: HTMLVideoElement | HTMLImageElement) {
  const faceapi = await import("face-api.js");
  await loadFaceModels();
  const detection = await faceapi
    .detectSingleFace(videoOrImage, new faceapi.TinyFaceDetectorOptions(DETECTOR_OPTS))
    .withFaceLandmarks()
    .withFaceDescriptor();
  return detection?.descriptor ?? null;
}

export function euclideanDistance(a: number[] | Float32Array, b: number[]): number {
  const arrA = Array.isArray(a) ? a : Array.from(a);
  if (arrA.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < arrA.length; i++) {
    const d = arrA[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/** حد أقصى للمسافة = نفس الشخص. 0.65-0.7 أكثر تساهلاً للظروف المختلفة */
const DEFAULT_THRESHOLD = 0.7;

export function findBestMatch(
  descriptor: number[] | Float32Array,
  users: { id: string; faceDescriptor?: number[] }[],
  threshold = DEFAULT_THRESHOLD
) {
  let best: { id: string; distance: number } | null = null;
  for (const u of users) {
    if (!u.faceDescriptor || u.faceDescriptor.length !== 128) continue;
    const dist = euclideanDistance(descriptor, u.faceDescriptor);
    if (dist < threshold && (!best || dist < best.distance)) {
      best = { id: u.id, distance: dist };
    }
  }
  return best;
}

// Utilitario compartilhado pelas duas estacoes (stand e recompensa).
// Usa face-api.js (roda no navegador via TensorFlow.js) para detectar o rosto
// e gerar um "descritor" de 128 numeros que representa aquele rosto.
// So o descritor (nao a foto) e enviado ao backend.

const MODEL_URL = 'models';

async function loadModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
  await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
}

async function startWebcam(videoEl) {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  videoEl.srcObject = stream;
  await videoEl.play();
}

// Detecta o rosto no frame atual do video e retorna o descritor (array de 128 numeros)
// ou null se nenhum rosto foi encontrado com confianca suficiente.
async function captureDescriptor(videoEl) {
  const detection = await faceapi
    .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) return null;
  return Array.from(detection.descriptor);
}

async function sendToApi(endpoint, embedding) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embedding }),
  });
  return res.json();
}

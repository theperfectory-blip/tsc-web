/**
 * Cloudinary Configuration Template
 *
 * INSTRUCCIONES:
 * 1. Copia este archivo a cloudinary.js
 * 2. Llena los valores con tus credenciales de Cloudinary
 * 3. NO subas cloudinary.js a GitHub (está en .gitignore)
 *
 * ¿Dónde encontrar los valores?
 * → https://cloudinary.com/console → tu Cloud Name
 * → Settings → Upload → Upload Presets → crear "tsc_logos" (sin firmar)
 */

const CLOUDINARY_CONFIG = {
  cloudName: "your-cloud-name",
  uploadPreset: "tsc_logos"
};

/**
 * Verifica si Cloudinary está configurado
 */
function cloudReady() {
  return CLOUDINARY_CONFIG.cloudName && CLOUDINARY_CONFIG.cloudName !== "your-cloud-name";
}

/**
 * Sube imagen a Cloudinary y retorna URL segura
 * @param {File} file - Archivo a subir
 * @returns {Promise<string>} URL segura del archivo
 */
async function uploadImageToCloud(file) {
  if (!cloudReady()) {
    throw new Error("Configura Cloudinary (cloudName, uploadPreset)");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_CONFIG.uploadPreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
    {
      method: "POST",
      body: formData
    }
  );

  if (!response.ok) {
    throw new Error(`Upload error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.secure_url;
}

// Exporta para otros módulos
window.uploadImageToCloud = uploadImageToCloud;
window.cloudReady = cloudReady;

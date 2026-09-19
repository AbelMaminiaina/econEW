// Réduit une image choisie par l'utilisateur (côté navigateur) avant l'envoi au backend :
// côté maximum 800 px, JPEG. Le backend stocke les images des vendeurs en data URI ; on garde
// donc chaque image sous ~500 Ko en baissant la qualité si nécessaire.
const MAX_SIDE = 800;
const MAX_CHARS = 500_000;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Impossible de lire l'image « ${file.name} »`));
    };
    img.src = url;
  });
}

export async function fileToResizedDataUrl(file: File): Promise<string> {
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
    throw new Error('Formats acceptés : PNG, JPEG ou WebP');
  }

  const img = await loadImage(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Traitement d’image indisponible dans ce navigateur');
  // Fond blanc : les PNG transparents deviendraient noirs en JPEG
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(img, 0, 0, canvas.width, canvas.height);

  for (const quality of [0.85, 0.7, 0.55, 0.4]) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrl.length <= MAX_CHARS) return dataUrl;
  }
  throw new Error('Image trop lourde : choisissez une image plus petite');
}

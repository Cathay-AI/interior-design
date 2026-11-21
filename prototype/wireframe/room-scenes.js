// Generated architectural photo series. Each room and layout has one camera
// angle and five separate construction stages.
export const stages = ['毛胚', '地坪與牆面', '木作與櫃體', '家具與軟裝', '燈光'];
const rooms = ['living', 'dining', 'kitchen', 'guest-bath', 'main-bedroom', 'main-bath', 'study-bedroom', 'guest-bedroom'];
const looks = ['none', 'sepia(.22) saturate(1.2) contrast(1.12) brightness(.9)', 'saturate(.78) brightness(1.12)'];

const hqFinished = [
  './imagery/living-4.webp',
  './imagery/hq-dining.jpg',
  './imagery/hq-kitchen.jpg',
  './imagery/hq-bath.jpg',
  './imagery/hq-master.jpg',
  './imagery/main-bath-4.webp',
  './imagery/hq-study.jpg',
  './imagery/guest-bedroom-4.webp',
];

export function roomScene(room, stage = stages.length - 1, openKitchen = false) {
  if (room === 0 && stage === 0) return './imagery/hq-living-bare.jpg';
  if (stage === stages.length - 1 && !(room === 2 && openKitchen) && hqFinished[room]) return hqFinished[room];
  const name = room === 2 && openKitchen ? 'open-kitchen' : rooms[room];
  return './imagery/' + name + '-' + stage + '.webp';
}

export function finishFilter(style, stage = stages.length - 1) {
  return stage > 0 ? looks[style] : 'none';
}

// Export the same split shown in the on-screen comparison.
export async function saveComparison(before, after, split, filter) {
  await Promise.all([before.decode(), after.decode()]);
  const canvas = document.createElement('canvas');
  const frame = before.getBoundingClientRect();
  const aspect = frame.width / frame.height;
  const width = Math.max(before.naturalWidth, after.naturalWidth, Math.ceil(frame.width));
  const height = Math.max(before.naturalHeight, after.naturalHeight, Math.ceil(frame.height));
  canvas.width = Math.max(width, Math.ceil(height * aspect));
  canvas.height = Math.round(canvas.width / aspect);
  const context = canvas.getContext('2d');
  const drawCover = img => {
    const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
    const imageWidth = img.naturalWidth * scale;
    const imageHeight = img.naturalHeight * scale;
    context.drawImage(img, (canvas.width - imageWidth) / 2, (canvas.height - imageHeight) / 2, imageWidth, imageHeight);
  };
  drawCover(before);
  const x = canvas.width * split / 100;
  context.beginPath();
  context.rect(x, 0, canvas.width - x, canvas.height);
  context.clip();
  context.filter = filter;
  drawCover(after);
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = 'renovation-comparison.png';
  link.click();
}

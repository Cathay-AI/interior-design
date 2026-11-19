// Generated architectural photo series. Each room and layout has one camera
// angle and five separate construction stages.
export const stages = ['毛胚', '地坪與牆面', '木作與櫃體', '家具與軟裝', '燈光'];
const rooms = ['living', 'dining', 'kitchen', 'guest-bath', 'main-bedroom', 'main-bath', 'study-bedroom', 'guest-bedroom'];
const looks = ['none', 'sepia(.22) saturate(1.2) contrast(1.12) brightness(.9)', 'saturate(.78) brightness(1.12)'];

export function roomScene(room, stage = stages.length - 1, openKitchen = false) {
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
  canvas.width = before.naturalWidth;
  canvas.height = before.naturalHeight;
  const context = canvas.getContext('2d');
  context.drawImage(before, 0, 0);
  const x = canvas.width * split / 100;
  context.beginPath();
  context.rect(x, 0, canvas.width - x, canvas.height);
  context.clip();
  context.filter = filter;
  context.drawImage(after, 0, 0, canvas.width, canvas.height);
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = 'renovation-comparison.png';
  link.click();
}

// Draw all five stages from the same perspective. A room's fixtures and walls stay aligned in the comparison.
export const stages = ['毛胚', '地坪與牆面', '木作與櫃體', '家具與軟裝', '燈光'];
const palettes = [
  ['#ece4d8', '#c39d71', '#a98056', '#e2d6c2', '#a8482f'],
  ['#e6c6ae', '#a87958', '#775037', '#bb8c63', '#6c5543'],
  ['#f2eee5', '#d4b990', '#a4a388', '#e3e7e3', '#78867b'],
];
const furniture = {
  living: '<rect x="157" y="224" width="179" height="63" rx="15"/><path d="M150 258h190v39H150z"/><ellipse cx="320" cy="306" rx="64" ry="19" fill="#655048"/><path d="M420 248q28-12 52 6l-4 47h-52z" fill="var(--accent)"/>',
  dining: '<path d="M220 239h36v63h-36zm156 7h37v60h-37z"/><ellipse cx="318" cy="271" rx="86" ry="28" fill="var(--cabinet)"/><path d="M250 280v45m135-43v42" stroke-width="6"/><path d="M242 295h37v49h-37zm110 0h37v49h-37z"/>',
  kitchen: '<path d="M209 260l51-23h143l-26 28v54H209z" fill="var(--cabinet)"/><path d="M206 259l54-24h147l-27 27H206z"/><circle cx="352" cy="250" r="7" fill="#514946"/><path d="M420 242h28v64h-28zm-14 46h42v13h-42z"/>',
  bath: '<path d="M370 252h106v44q-46 25-106 7z"/><ellipse cx="423" cy="252" rx="54" ry="17" fill="#fffaf0"/><path d="M246 281q-28 29-57 8v-34h39v20z"/><path d="M454 247v-29q0-13-16-10" fill="none"/>',
  bedroom: '<path d="M187 229h162v48H187z" fill="var(--cabinet)"/><path d="M186 266h161l53 66H149z"/><path d="M206 257h49v27h-53zm64 0h50v27h-49z" fill="#f7f2e8"/><path d="M177 295h199l24 37H149z" fill="var(--accent)"/>',
};
const roles = ['living','dining','kitchen','bath','bedroom','bath','bedroom','bedroom'];
const wallWidths = [114, 150, 160, 92, 124, 108, 102, 136];
const windowStarts = [315,280,326,353,298,335,266,302];

export function roomScene(room, style, stage = stages.length - 1) {
  const [wall, floor, cabinet, fabric, accent] = palettes[style];
  const finished = stage > 0;
  const start = windowStarts[room];
  const end = start + wallWidths[room];
  const sideWall = finished ? '#d9d0c4' : '#c4c3bd';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" style="--cabinet:${cabinet};--accent:${accent}">
    <defs><linearGradient id="floor" x2=".22" y2="1"><stop stop-color="${finished ? floor : '#a7a29b'}"/><stop offset="1" stop-color="${finished ? '#dbc8ae' : '#c9c4ba'}"/></linearGradient>
    <linearGradient id="sky" x2="0" y2="1"><stop stop-color="#b9c9cd"/><stop offset="1" stop-color="#f4ead7"/></linearGradient>
    <radialGradient id="light"><stop stop-color="#fff2bd" stop-opacity=".72"/><stop offset="1" stop-color="#fff2bd" stop-opacity="0"/></radialGradient></defs>
    <rect width="600" height="450" fill="#ebe5db"/>
    <path d="M0 0H600L470 70H133z" fill="#ded6ca"/>
    <path d="M0 0l133 70v166L0 400z" fill="${sideWall}"/>
    <path d="M133 70h337v166H133z" fill="${finished ? wall : '#dedbd4'}"/>
    <path d="M600 0L470 70v166l130 164z" fill="${sideWall}"/>
    <path d="M133 236h337l130 164v50H0v-50z" fill="url(#floor)"/>
    ${finished ? '<path d="M102 276h400m-430 37h460m-500 47h540M8 400h584M175 236L85 450m147-214-36 214m91-214-3 214m67-214 46 214m-8-214 123 214" fill="none" stroke="#886d54" opacity=".38"/>' : '<path d="M144 258l-70 80m7 29 199-38m43 18 198 31" fill="none" stroke="#8d8982" opacity=".42"/>'}
    <path d="M${start} 94H${end}v122H${start}z" fill="url(#sky)" stroke="#675b50" stroke-width="4"/>
    <path d="M${(start + end) / 2} 94v122M${start} 165H${end}" stroke="#675b50" stroke-width="2"/>
    ${stage >= 2 ? `<path d="M151 117h${72 + room * 4}v122H151z" fill="${cabinet}"/><path d="M174 117v122m24-122v122m24-122v122" stroke="#594938" opacity=".4"/><rect x="147" y="213" width="108" height="22" rx="2" fill="${floor}"/>` : ''}
    ${stage >= 3 ? `<g transform="translate(${(room % 3) * 7},${(room % 2) * 6})" fill="${fabric}" stroke="#6f6256" stroke-width="2">${furniture[roles[room]]}</g>` : ''}
    ${stage === 4 ? '<ellipse cx="302" cy="226" rx="250" ry="212" fill="url(#light)"/><path d="M295 63v43" stroke="#676059"/><ellipse cx="295" cy="106" rx="24" ry="5" fill="#fff5d0"/><circle cx="235" cy="53" r="4" fill="#fff8e5"/><circle cx="357" cy="53" r="4" fill="#fff8e5"/>' : ''}
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

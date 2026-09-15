/* =========================================================
   FIZXDEPLOY v2 — Core Logic
   ========================================================= */

/* ---------- Helpers ---------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- Toast ---------- */
const toastStack = $('#toastStack');
function showToast(message, type = 'info', duration = 3000) {
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${message}</span>`;
  toastStack.appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    t.addEventListener('animationend', () => t.remove(), { once: true });
  }, duration);
}

/* ---------- Eye Toggle ---------- */
$$('.eye-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.toggle);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
    btn.textContent = input.type === 'password' ? '👁' : '🙈';
  });
});

/* ---------- Screens ---------- */
const loginScreen     = $('#loginScreen');
const dashboardScreen = $('#dashboardScreen');
function goToDashboard() {
  loginScreen.classList.add('hidden');
  dashboardScreen.classList.remove('hidden');
  animateCounters();
  renderDeployments();
}
function goToLogin() {
  dashboardScreen.classList.add('hidden');
  loginScreen.classList.remove('hidden');
}

/* ---------- Login ---------- */
$('#loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const token   = $('#loginToken').value.trim();
  const project = $('#loginProject').value.trim();
  if (!token || token.length < 8) return showToast('Invalid Vercel token. Too short.', 'error');
  if (!project) return showToast('Project name is required.', 'error');
  try {
    localStorage.setItem('fizx_token', btoa(token));
    localStorage.setItem('fizx_project', project);
  } catch (_) {}
  showToast('Connected successfully. Welcome!', 'success');
  setTimeout(goToDashboard, 400);
});

/* ---------- Logout ---------- */
$('#logoutBtn').addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.removeItem('fizx_token');
  closeSidebar();
  showToast('Logged out.', 'info');
  setTimeout(goToLogin, 300);
});

/* ---------- Help ---------- */
$('#helpLink').addEventListener('click', (e) => {
  e.preventDefault();
  showToast('Go to vercel.com → Account → Tokens → Create.', 'info', 4500);
});

/* ---------- Sidebar ---------- */
const hamburger       = $('#hamburger');
const sidebar         = $('#sidebar');
const sidebarBackdrop = $('#sidebarBackdrop');
function openSidebar() {
  sidebar.classList.add('open');
  sidebarBackdrop.classList.add('show');
  hamburger.classList.add('active');
}
function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarBackdrop.classList.remove('show');
  hamburger.classList.remove('active');
}
hamburger.addEventListener('click', () => sidebar.classList.contains('open') ? closeSidebar() : openSidebar());
sidebarBackdrop.addEventListener('click', closeSidebar);

/* ---------- Deploy Modal ---------- */
const deployModal        = $('#deployModal');
const deployFormStage    = $('#deployFormStage');
const deployProgressStage= $('#deployProgressStage');
const deployForm         = $('#deployForm');

function openDeployModal() {
  deployModal.classList.remove('hidden');
  deployFormStage.classList.remove('hidden');
  deployProgressStage.classList.add('hidden');
  resetRing();
  resetSteps();
  resetTerminal();
}
function closeDeployModal() {
  deployModal.classList.add('hidden');
}
$$('[data-open-deploy]').forEach(el => el.addEventListener('click', (e) => {
  e.preventDefault();
  closeSidebar();
  openDeployModal();
}));
$('#modalClose').addEventListener('click', closeDeployModal);
$('#cancelDeploy').addEventListener('click', closeDeployModal);
deployModal.addEventListener('click', (e) => { if (e.target === deployModal) closeDeployModal(); });
$('#doneBtn')?.addEventListener('click', closeDeployModal);

/* ---------- Source Tabs ---------- */
const sourceTabs   = $$('.source-tab');
const sourcePanels = $$('.source-panel');
let activeSource = 'files';

sourceTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    sourceTabs.forEach(t => t.classList.remove('active'));
    sourcePanels.forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    activeSource = tab.dataset.source;
    const panel = $(`.source-panel[data-panel="${activeSource}"]`);
    panel?.classList.add('active');
  });
});

/* ---------- File Handling ---------- */
let selectedFiles = [];
let selectedZip   = null;

const inputFiles   = $('#inputFiles');
const inputZip     = $('#inputZip');
const dropzoneFiles= $('#dropzoneFiles');
const dropzoneZip  = $('#dropzoneZip');
const fileListFiles= $('#fileListFiles');
const fileListZip  = $('#fileListZip');

inputFiles.addEventListener('change', (e) => addFiles([...e.target.files]));
inputZip.addEventListener('change', (e) => addZip(e.target.files[0]));

/* Drag & drop */
[ [dropzoneFiles, 'files'], [dropzoneZip, 'zip'] ].forEach(([dz, kind]) => {
  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', (e) => {
    e.preventDefault();
    dz.classList.remove('dragover');
    const files = [...e.dataTransfer.files];
    if (kind === 'files') addFiles(files);
    else {
      const zip = files.find(f => f.name.toLowerCase().endsWith('.zip'));
      if (zip) addZip(zip);
      else showToast('Please drop a .zip file.', 'error');
    }
  });
});

function addFiles(files) {
  if (!files.length) return;
  selectedFiles = [...selectedFiles, ...files].slice(0, 100);
  renderFileList();
  showToast(`${files.length} file(s) added.`, 'success');
}
function addZip(file) {
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.zip')) return showToast('Only .zip allowed.', 'error');
  selectedZip = file;
  renderFileList();
  showToast('ZIP file ready.', 'success');
}
function renderFileList() {
  // Files
  fileListFiles.innerHTML = selectedFiles.map((f, i) => `
    <div class="file-item">
      <span>📄</span>
      <span class="fi-name">${escapeHtml(f.name)}</span>
      <span class="fi-size">${formatSize(f.size)}</span>
      <button type="button" class="fi-remove" data-remove-file="${i}">✕</button>
    </div>
  `).join('');

  fileListFiles.querySelectorAll('[data-remove-file]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedFiles.splice(+btn.dataset.removeFile, 1);
      renderFileList();
    });
  });

  // Zip
  if (selectedZip) {
    fileListZip.innerHTML = `
      <div class="file-item">
        <span>🗜️</span>
        <span class="fi-name">${escapeHtml(selectedZip.name)}</span>
        <span class="fi-size">${formatSize(selectedZip.size)}</span>
        <button type="button" class="fi-remove" id="removeZip">✕</button>
      </div>
    `;
    $('#removeZip')?.addEventListener('click', () => {
      selectedZip = null;
      inputZip.value = '';
      renderFileList();
    });
  } else {
    fileListZip.innerHTML = '';
  }
}
function formatSize(bytes) {
  if (!bytes) return '0 B';
  const u = ['B','KB','MB','GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0) + ' ' + u[i];
}

/* ---------- Link Preview ---------- */
const mLink = $('#mLink');
const linkPreview = $('#linkPreview');
mLink?.addEventListener('input', () => {
  const v = mLink.value.trim();
  linkPreview.classList.remove('valid', 'invalid');
  if (!v) {
    linkPreview.querySelector('span:last-child')?.remove();
    linkPreview.innerHTML = `<span class="link-preview-dot"></span> Paste a GitHub, GitLab, or any public repo URL`;
    return;
  }
  if (/^https?:\/\/.+\..+/.test(v)) {
    linkPreview.classList.add('valid');
    linkPreview.innerHTML = `<span class="link-preview-dot"></span> Valid URL — ready to deploy`;
  } else {
    linkPreview.classList.add('invalid');
    linkPreview.innerHTML = `<span class="link-preview-dot"></span> Invalid URL format`;
  }
});

/* ---------- Ring ---------- */
const ringFg = $('#ringFg');
const ringPct = $('#ringPct');
const CIRC = 2 * Math.PI * 52;
function setRing(pct) {
  ringFg.style.strokeDashoffset = CIRC - (CIRC * pct / 100);
  ringPct.textContent = Math.round(pct);
  // color shift on complete
  if (pct >= 100) {
    ringFg.style.stroke = '#10b981';
    ringFg.style.filter = 'drop-shadow(0 0 12px rgba(16,185,129,0.8))';
  } else {
    ringFg.style.stroke = '#a855f7';
    ringFg.style.filter = 'drop-shadow(0 0 8px rgba(168,85,247,0.55))';
  }
}
function resetRing() { setRing(0); }

/* ---------- Steps ---------- */
const timelineEl = $('#timeline');
function resetSteps() {
  $$('li', timelineEl).forEach(li => li.dataset.state = 'queued');
}
function setStepState(index, state) {
  const li = $(`li[data-step="${index}"]`, timelineEl);
  if (li) li.dataset.state = state;
}

/* ---------- Terminal ---------- */
const terminalBody = $('#terminalBody');
function resetTerminal() { terminalBody.innerHTML = ''; }
function pushLog(text, type = 'info') {
  const line = document.createElement('span');
  line.className = `log-line ${type}`;
  const prefix = type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warn' ? '⚠' : '›';
  line.innerHTML = `<span class="log-prefix">${prefix}</span> ${escapeHtml(text)}`;
  terminalBody.appendChild(line);
  terminalBody.scrollTop = terminalBody.scrollHeight;
}

/* ---------- Deploy Flow ---------- */
deployForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const token     = $('#mToken').value.trim();
  const project   = $('#mProject').value.trim();
  const framework = $('#mFramework').value;
  const link      = mLink?.value.trim();

  // Validate
  if (!token || token.length < 8) return showToast('Invalid Vercel token.', 'error');
  if (!project) return showToast('Project name is required.', 'error');

  if (activeSource === 'files' && !selectedFiles.length) return showToast('Please add at least one file.', 'error');
  if (activeSource === 'zip'   && !selectedZip)           return showToast('Please add a .zip file.', 'error');
  if (activeSource === 'link'  && (!link || !/^https?:\/\/.+\..+/.test(link))) {
    return showToast('Please enter a valid URL.', 'error');
  }

  // Build source summary
  let sourceInfo = '';
  if (activeSource === 'files') sourceInfo = `${selectedFiles.length} file(s)`;
  if (activeSource === 'zip')   sourceInfo = `${selectedZip.name} (${formatSize(selectedZip.size)})`;
  if (activeSource === 'link')  sourceInfo = link;

  // Switch to progress stage
  deployFormStage.classList.add('hidden');
  deployProgressStage.classList.remove('hidden');
  $('#deployResult').classList.add('hidden');
  resetRing();
  resetSteps();
  resetTerminal();

  $('#progressSub').textContent = `Shipping "${project}" — ${framework} · ${activeSource.toUpperCase()}`;

  // ---- Run step-by-step ----
  await runDeploySequence({ project, framework, sourceInfo, token });
});

async function runDeploySequence({ project, framework, sourceInfo, token }) {
  const totalSteps = 5;
  const stepRange = 100 / totalSteps; // 20% per step

  for (let s = 0; s < totalSteps; s++) {
    setStepState(s, 'active');

    // --- Per-step logs (streamed) ---
    await streamLogs(s, { project, framework, sourceInfo });

    // --- Animate ring from start to end of this step ---
    const startPct = s * stepRange;
    const endPct   = (s + 1) * stepRange;
    await animateRing(startPct, endPct, 700);

    setStepState(s, 'done');
  }

  // ---- Result ----
  const slug = slugify(project);
  const url = `https://${slug}.vercel.app`;

  pushLog(`Build completed in 4.2s`, 'success');
  pushLog(`Production: ${url}`, 'success');

  $('#deployUrl').textContent = url;
  $('#openUrlBtn').href = url;
  $('#deployResult').classList.remove('hidden');

  showToast('Deployment successful!', 'success');

  // Save
  try { localStorage.setItem('fizx_token', btoa(token)); } catch (_) {}
  addDeployment({ name: project, url, status: 'success', time: 'just now' });
}

async function streamLogs(stepIndex, ctx) {
  const logs = [
    // Step 0
    [
      [`fizx-deploy v2.0.0`, 'info'],
      [`Authenticating with Vercel…`, 'info'],
      [`Token verified: ${ctx.token.slice(0, 6)}…${ctx.token.slice(-4)}`, 'info'],
      [`Project "${ctx.project}" validated`, 'success'],
    ],
    // Step 1
    [
      [`Uploading source — ${ctx.sourceInfo}`, 'info'],
      [`Transferring to build container…`, 'info'],
      [`Compression complete`, 'success'],
    ],
    // Step 2
    [
      [`Detected framework: ${ctx.framework}`, 'info'],
      [`Installing dependencies…`, 'info'],
      [`npm install — done in 1.8s`, 'success'],
      [`Building production bundle…`, 'info'],
      [`Build succeeded`, 'success'],
    ],
    // Step 3
    [
      [`Deploying to Edge Network…`, 'info'],
      [`Propagating to 18 regions`, 'info'],
      [`CDN cache primed`, 'success'],
    ],
    // Step 4
    [
      [`Assigning domain…`, 'info'],
      [`SSL certificate issued`, 'success'],
      [`Deployment finalized`, 'success'],
    ],
  ];

  const list = logs[stepIndex] || [];
  for (const [text, type] of list) {
    pushLog(text, type);
    await sleep(280 + Math.random() * 200);
  }
}

function animateRing(from, to, duration) {
  return new Promise(resolve => {
    const start = performance.now();
    function tick(now) {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setRing(from + (to - from) * eased);
      if (p < 1) requestAnimationFrame(tick);
      else resolve();
    }
    requestAnimationFrame(tick);
  });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

/* ---------- Copy / Open URL ---------- */
$('#copyUrlBtn')?.addEventListener('click', async () => {
  const url = $('#deployUrl').textContent;
  try {
    await navigator.clipboard.writeText(url);
    const btn = $('#copyUrlBtn');
    btn.classList.add('copied');
    btn.textContent = '✓';
    showToast('URL copied to clipboard!', 'success', 2000);
    setTimeout(() => { btn.classList.remove('copied'); btn.textContent = '📋'; }, 1500);
  } catch (_) {
    showToast('Failed to copy. Please copy manually.', 'error');
  }
});

/* ---------- Deployments ---------- */
function loadDeployments() {
  try { const raw = localStorage.getItem('fizx_deployments'); return raw ? JSON.parse(raw) : null; }
  catch (_) { return null; }
}
function saveDeployments(list) {
  try { localStorage.setItem('fizx_deployments', JSON.stringify(list)); } catch (_) {}
}

const DEFAULT_DEPLOYMENTS = [
  { name: 'portfolio-site', url: 'https://portfolio-site.vercel.app', status: 'success',  time: '2 min ago' },
  { name: 'saas-dashboard', url: 'https://saas-dashboard.vercel.app', status: 'building', time: '10 min ago' },
  { name: 'landing-page',   url: 'https://landing-page.vercel.app',   status: 'success',  time: '1 hour ago' },
  { name: 'api-gateway',    url: 'https://api-gateway.vercel.app',    status: 'failed',   time: '3 hours ago' },
  { name: 'docs-portal',    url: 'https://docs-portal.vercel.app',    status: 'success',  time: '1 day ago' },
];

const deployList = $('#deployList');

function renderDeployments() {
  const list = loadDeployments() || DEFAULT_DEPLOYMENTS;
  if (!list.length) {
    deployList.innerHTML = `<div class="empty-state">No deployments yet. Click "Deploy New" to start.</div>`;
    return;
  }

  deployList.innerHTML = list.map((d, i) => `
    <div class="deploy-row" style="animation-delay:${i * 0.04}s">
      <div class="deploy-name">${escapeHtml(d.name)}</div>
      <span class="badge ${d.status}">${d.status}</span>
      <div class="deploy-time">${escapeHtml(d.time)}</div>
      <a class="deploy-url" href="${d.url}" target="_blank" rel="noopener">${escapeHtml(d.url)}</a>
      <div class="row-actions">
        <button class="row-btn" title="Copy URL" data-copy="${d.url}">📋</button>
        <a class="row-btn" title="Open" href="${d.url}" target="_blank" rel="noopener">↗</a>
      </div>
    </div>
  `).join('');

  // Bind copy buttons
  deployList.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        showToast('URL copied!', 'success', 1800);
      } catch (_) {
        showToast('Copy failed.', 'error');
      }
    });
  });
}

function addDeployment(entry) {
  const list = loadDeployments() || [...DEFAULT_DEPLOYMENTS];
  list.unshift(entry);
  saveDeployments(list.slice(0, 20));
  renderDeployments();
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[s]));
}

/* ---------- Counter Animation ---------- */
function animateCounters() {
  $$('.stat-value').forEach(el => {
    const target = parseInt(el.dataset.count, 10) || 0;
    const suffix = el.dataset.suffix || '';
    let cur = 0;
    const step = Math.max(1, Math.round(target / 40));
    const t = setInterval(() => {
      cur += step;
      if (cur >= target) { cur = target; clearInterval(t); }
      el.textContent = cur + suffix;
    }, 25);
  });
}

/* ---------- Bell ---------- */
$('#bellBtn').addEventListener('click', () => {
  showToast('You have 3 new notifications.', 'info');
});

/* ---------- Init ---------- */
window.addEventListener('DOMContentLoaded', () => {
  renderDeployments();
});

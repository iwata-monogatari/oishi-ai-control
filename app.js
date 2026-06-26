const STATUS_REVIEW = '確認待ち';
const STATUS_BLOCKED = '困り中';
const STATUS_FREE = '空き';
const STATUS_DONE = '完了';
const LIMIT_HIT = '上限到達';
const LIMIT_WAIT = 'リセット待ち';

const els = {
  viewDateText: document.getElementById('viewDateText'),
  loadedAtText: document.getElementById('loadedAtText'),
  logDate: document.getElementById('logDate'),
  loadLogButton: document.getElementById('loadLogButton'),
  refreshButton: document.getElementById('refreshButton'),
  currentGrid: document.getElementById('currentGrid'),
  logTimeline: document.getElementById('logTimeline'),
  reviewList: document.getElementById('reviewList'),
  limitList: document.getElementById('limitList'),
  countReview: document.getElementById('countReview'),
  countBlocked: document.getElementById('countBlocked'),
  countFree: document.getElementById('countFree'),
  countLimitHit: document.getElementById('countLimitHit'),
  countDoneToday: document.getElementById('countDoneToday'),
};

function pad(n) {
  return String(n).padStart(2, '0');
}

function todayJstDate() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now).reduce((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function nowJstText() {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#039;',
    '"': '&quot;',
  }[char]));
}

function badgeClass(prefix, value) {
  const safeValue = String(value || '不明').replace(/\s/g, '');
  return `${prefix}-${safeValue}`;
}

function formatDateTime(value) {
  if (!value) return '-';
  return escapeHtml(value.replace('T', ' '));
}

function timeOnly(value) {
  if (!value) return '-';
  const text = String(value).replace('T', ' ');
  const match = text.match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : text;
}

function resetCountdown(resetAt) {
  if (!resetAt) return '';
  const normalized = String(resetAt).replace(' ', 'T');
  const target = new Date(normalized.includes('+') ? normalized : `${normalized}+09:00`);
  if (Number.isNaN(target.getTime())) return '';
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return 'リセット時刻を過ぎています';
  const minutes = Math.ceil(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours <= 0) return `あと約${rest}分`;
  return `あと約${hours}時間${rest ? `${rest}分` : ''}`;
}

async function fetchJson(path) {
  const response = await fetch(`${path}?v=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`${path} を読み込めませんでした。HTTP ${response.status}`);
  }
  return response.json();
}

function renderCurrent(current) {
  if (!Array.isArray(current) || current.length === 0) {
    els.currentGrid.innerHTML = '<div class="error">現在状況データが空です。</div>';
    return;
  }

  els.currentGrid.innerHTML = current.map((ai) => {
    const countdown = resetCountdown(ai.reset_at);
    const output = ai.output_url
      ? `<a href="${escapeHtml(ai.output_url)}" target="_blank" rel="noopener">成果物を開く</a>`
      : '-';
    return `
      <article class="ai-card">
        <div class="ai-head">
          <div>
            <div class="ai-name">${escapeHtml(ai.ai_name)}</div>
            <div class="tool-name">${escapeHtml(ai.tool || '')}</div>
          </div>
          <div class="badges">
            <span class="badge ${badgeClass('status', ai.work_status)}">${escapeHtml(ai.work_status || '不明')}</span>
            <span class="badge ${badgeClass('limit', ai.limit_status)}">${escapeHtml(ai.limit_status || '不明')}</span>
          </div>
        </div>
        <div>
          <div class="ai-task">${escapeHtml(ai.task_title || '新規作業なし')}</div>
          <div class="ai-detail">${escapeHtml(ai.detail || '')}</div>
        </div>
        <div class="ai-meta">
          <span>利用上限：<strong>${escapeHtml(ai.limit_detail || '-')}</strong></span>
          <span>リセット予定：<strong>${formatDateTime(ai.reset_at)}</strong>${countdown ? ` <span>(${escapeHtml(countdown)})</span>` : ''}</span>
          <span>次に使える予定：<strong>${formatDateTime(ai.next_available_at)}</strong></span>
          <span>困りごと：<strong>${escapeHtml(ai.blocker || 'なし')}</strong></span>
          <span>次の判断：<strong>${escapeHtml(ai.next_action || '-')}</strong></span>
          <span>成果物：<strong>${output}</strong></span>
          <span>更新：<strong>${formatDateTime(ai.updated_at)}</strong></span>
        </div>
      </article>
    `;
  }).join('');

  const review = current.filter((ai) => ai.work_status === STATUS_REVIEW);
  const limited = current.filter((ai) => [LIMIT_HIT, LIMIT_WAIT].includes(ai.limit_status));
  els.reviewList.className = review.length ? 'list-panel' : 'list-panel empty';
  els.reviewList.innerHTML = review.length
    ? review.map((ai) => `
      <div class="list-item">
        <strong>${escapeHtml(ai.ai_name)}：${escapeHtml(ai.task_title || '作業名なし')}</strong>
        <span>${escapeHtml(ai.next_action || '確認内容未記入')}</span>
      </div>
    `).join('')
    : '確認待ちはありません。';

  els.limitList.className = limited.length ? 'list-panel' : 'list-panel empty';
  els.limitList.innerHTML = limited.length
    ? limited.map((ai) => `
      <div class="list-item">
        <strong>${escapeHtml(ai.ai_name)}：${escapeHtml(ai.limit_status)}</strong>
        <span>リセット予定：${formatDateTime(ai.reset_at)} ${resetCountdown(ai.reset_at) ? `(${escapeHtml(resetCountdown(ai.reset_at))})` : ''}</span>
      </div>
    `).join('')
    : '上限到達中のAIはありません。';

  els.countReview.textContent = current.filter((ai) => ai.work_status === STATUS_REVIEW).length;
  els.countBlocked.textContent = current.filter((ai) => ai.work_status === STATUS_BLOCKED).length;
  els.countFree.textContent = current.filter((ai) => ai.work_status === STATUS_FREE).length;
  els.countLimitHit.textContent = current.filter((ai) => ai.limit_status === LIMIT_HIT || ai.limit_status === LIMIT_WAIT).length;
}

function renderLogs(logs) {
  const entries = Array.isArray(logs) ? logs : [];
  els.countDoneToday.textContent = entries.filter((entry) => entry.event_type === STATUS_DONE).length;

  if (!entries.length) {
    els.logTimeline.innerHTML = '<div class="error">この日の活動履歴はまだありません。logs/YYYY-MM-DD.json を追加してください。</div>';
    return;
  }

  const sorted = [...entries].sort((a, b) => String(b.datetime || '').localeCompare(String(a.datetime || '')));
  els.logTimeline.innerHTML = sorted.map((entry) => {
    const output = entry.output_url
      ? `｜成果物：<a href="${escapeHtml(entry.output_url)}" target="_blank" rel="noopener">開く</a>`
      : '';
    return `
      <article class="timeline-item">
        <div class="time">${escapeHtml(timeOnly(entry.datetime))}</div>
        <div>
          <div class="badges">
            <span class="badge ${badgeClass('status', entry.event_type)}">${escapeHtml(entry.event_type || '記録')}</span>
          </div>
          <div class="tool-name">${escapeHtml(entry.ai_name || '')}</div>
        </div>
        <div class="timeline-content">
          <div class="timeline-title">${escapeHtml(entry.task_title || '作業名なし')}</div>
          <div class="timeline-detail">${escapeHtml(entry.detail || '')}</div>
          <div class="timeline-meta">
            困りごと：${escapeHtml(entry.blocker || 'なし')}｜次の判断：${escapeHtml(entry.next_action || '-')}｜リセット：${formatDateTime(entry.reset_at)}${output}
          </div>
        </div>
      </article>
    `;
  }).join('');
}

async function loadDashboard(dateText = els.logDate.value || todayJstDate()) {
  els.viewDateText.textContent = dateText;
  els.loadedAtText.textContent = nowJstText();
  try {
    const [current, logs] = await Promise.all([
      fetchJson('data/current.json'),
      fetchJson(`logs/${dateText}.json`).catch(() => []),
    ]);
    renderCurrent(current);
    renderLogs(logs);
  } catch (error) {
    els.currentGrid.innerHTML = `<div class="error">${escapeHtml(error.message)}</div>`;
    els.logTimeline.innerHTML = '';
  }
}

function init() {
  const today = todayJstDate();
  els.logDate.value = today;
  els.loadLogButton.addEventListener('click', () => loadDashboard(els.logDate.value));
  els.refreshButton.addEventListener('click', () => loadDashboard(els.logDate.value));
  loadDashboard(today);
}

init();

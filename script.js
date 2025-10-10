// Enhanced JS for Живой Архив demo site - v2
async function loadData(){
  try {
    const res = await fetch('data.json');
    const data = await res.json();
    return data;
  } catch(e){
    console.error('Failed to load data.json', e);
    return [];
  }
}

function createCard(item){
  const div = document.createElement('div');
  div.className = 'card';
  // quote overlay for featured
  const quote = item.description.length > 80 ? item.description.slice(0,80) + '…' : item.description;
  div.innerHTML = `
    <a href="record.html?id=${encodeURIComponent(item.id)}"><img src="${item.photo}" alt="${item.name}"></a>
    <h4><a href="record.html?id=${encodeURIComponent(item.id)}">${item.name}</a></h4>
    <p class="meta">${item.role} • ${item.date}</p>
    <p>${quote}</p>
  `;
  return div;
}

function renderFeatured(data){
  const list = document.getElementById('featured-list');
  if(!list) return;
  list.innerHTML = '';
  const featured = data.slice(0,3);
  featured.forEach(it => list.appendChild(createCard(it)));
}

function renderList(data){
  const list = document.getElementById('list');
  if(!list) return;
  list.innerHTML = '';
  data.forEach(it => list.appendChild(createCard(it)));
}

function populateYears(data){
  const sel = document.getElementById('filter-year');
  if(!sel) return;
  const years = Array.from(new Set(data.map(d=>d.year).filter(Boolean))).sort();
  years.forEach(y=>{
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y;
    sel.appendChild(opt);
  });
}

function getQueryParam(name){
  const params = new URLSearchParams(location.search);
  return params.get(name);
}

function timeToSeconds(t){
  // t format "HH:MM" or "MM:SS" or "HH:MM:SS"
  const parts = t.split(':').map(x=>parseInt(x,10));
  if(parts.length===2) return parts[0]*60 + parts[1];
  if(parts.length===3) return parts[0]*3600 + parts[1]*60 + parts[2];
  return 0;
}

function renderTranscript(rec, audioEl, container){
  if(!rec.transcript || !Array.isArray(rec.transcript)) return;
  const tr = document.createElement('div');
  tr.className = 'transcript';
  rec.transcript.forEach((line, idx) => {
    const tsec = timeToSeconds(line.t);
    const div = document.createElement('div');
    div.className = 'line';
    div.dataset.time = tsec;
    div.innerHTML = `<strong>[${line.t}]</strong> ${line.s}`;
    div.addEventListener('click', ()=> {
      if(audioEl) audioEl.currentTime = tsec;
      audioEl.play();
    });
    tr.appendChild(div);
  });
  container.appendChild(tr);

  // sync highlight on timeupdate
  if(audioEl){
    audioEl.addEventListener('timeupdate', ()=>{
      const t = audioEl.currentTime;
      const lines = tr.querySelectorAll('.line');
      let active = null;
      for(let i=0;i<lines.length;i++){
        const lt = parseFloat(lines[i].dataset.time);
        const nt = (i+1<lines.length) ? parseFloat(lines[i+1].dataset.time) : Infinity;
        if(t>=lt && t<nt){ active = lines[i]; break; }
      }
      lines.forEach(l=>l.classList.remove('active'));
      if(active) active.classList.add('active');
    });
  }
}

// ЗАМЕНИТЕ СУЩЕСТВУЮЩУЮ функцию renderRecord на ЭТУ:
function renderRecord(data){
  const id = getQueryParam('id');
  if(!id) return;
  const rec = data.find(d=>d.id===id);
  const container = document.getElementById('record');
  if(!rec || !container){
    if(container) container.innerHTML = '<p>Запись не найдена.</p>';
    return;
  }

  // preview image
  const galleryHtml = `<div class="gallery"><img src="${rec.photo}" alt="${rec.name}" class="gallery-thumb" style="cursor:pointer; border-radius:6px; max-width:360px;"></div>`;

  // download button: только для аудио и если разрешено
  const downloadBtn = (rec.allow_download && rec.media_type === 'audio' && rec.file) 
    ? `<a href="${rec.file}" download class="btn-download">Скачать аудио</a>` 
    : '';

  // media area: приоритет
  // 1) если задан rec.video_url -> показываем ссылку (в новой вкладке)
  // 2) иначе если media_type=="video" и есть локальный rec.video -> <video>
  // 3) иначе показываем аудио, если есть rec.file
  let mediaHtml = '';
  if(rec.video_url){
    // Показываем аккуратную кнопку-ссылку (без iframe)
    const safeUrl = rec.video_url.replace(/"/g,''); // минимальная санитизация
    mediaHtml = `<p style="margin:12px 0;"><a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="btn">🎥 Смотреть видео</a></p>`;
  } else if(rec.media_type === 'video' && rec.video){
    mediaHtml = `<video controls style="width:100%; max-height:520px; margin:12px 0;"><source src="${rec.video}" type="video/mp4">Ваш браузер не поддерживает видео.</video>`;
  } else if(rec.file){
    mediaHtml = `<audio id="audio-player" controls style="width:100%; margin:12px 0;"><source src="${rec.file}" type="audio/mpeg">Ваш браузер не поддерживает аудио.</audio>`;
  } else {
    mediaHtml = `<p class="note">Медиафайл не найден.</p>`;
  }

  container.innerHTML = `
    <div class="record card">
      <div style="display:flex; gap:16px; align-items:flex-start; flex-wrap:wrap;">
        <div style="flex:1; min-width:260px;">
          ${galleryHtml}
        </div>
        <div style="flex:2; min-width:300px;">
          <h2>${rec.name}</h2>
          <p class="meta">${rec.role} • ${rec.date} • ${rec.duration} ${downloadBtn}</p>
          ${mediaHtml}
          <p>${rec.description || ''}</p>
          <div class="meta">
            <strong>Интервьюер:</strong> ${rec.interviewer || ''} • <strong>Ключевые слова:</strong> ${rec.keywords ? rec.keywords.join(', ') : ''}
          </div>
        </div>
      </div>
    </div>
  `;

  // modal для фото
  const img = container.querySelector('.gallery-thumb');
  if(img){
    img.addEventListener('click', ()=> showModal(img.src));
  }

  // привязка транскрипта к аудио/видео (если есть локальный media элемент)
  const mediaEl = container.querySelector('audio, video');
  renderTranscript(rec, mediaEl, container);
}


  // Формируем HTML
  const galleryHtml = `
    <div class="gallery">
      <img src="${rec.photo}" alt="${rec.name}" class="gallery-thumb" style="cursor:pointer; border-radius:6px;">
    </div>
  `;

  // Кнопка скачивания (только для аудио)
  const downloadBtn = rec.allow_download && rec.media_type === "audio"
    ? `<a href="${rec.file}" download class="btn-download">Скачать аудио</a>`
    : "";

  // Блок для медиа
  let mediaBlock = "";
  if (rec.media_type === "embed" && rec.video_url) {
    // если видео встроенное (например, VK)
    mediaBlock = `
      <div class="video-wrapper" style="margin: 10px 0;">
        <iframe src="${rec.video_url}" width="640" height="360" frameborder="0" allowfullscreen></iframe>
      </div>
    `;
  } else if (rec.media_type === "video" && rec.video) {
    // если видео локальное
    mediaBlock = `
      <video controls style="width:100%; margin:10px 0;">
        <source src="${rec.video}" type="video/mp4">
        Ваш браузер не поддерживает видео.
      </video>
    `;
  } else if (rec.media_type === "audio" && rec.file) {
    // если аудио
    mediaBlock = `
      <audio id="audio-player" controls style="width:100%; margin:10px 0;">
        <source src="${rec.file}" type="audio/mpeg">
        Ваш браузер не поддерживает аудио.
      </audio>
    `;
  }

  container.innerHTML = `
    <div class="record card">
      <div style="display:flex; gap:16px; align-items:flex-start; flex-wrap:wrap;">
        <div style="flex:1; min-width:260px;">
          ${galleryHtml}
        </div>
        <div style="flex:2; min-width:300px;">
          <h2>${rec.name}</h2>
          <p class="meta">${rec.role} • ${rec.date} • ${rec.duration} ${downloadBtn}</p>
          ${mediaBlock}
          <p>${rec.description}</p>
          <div class="meta">
            <strong>Интервьюер:</strong> ${rec.interviewer} • 
            <strong>Ключевые слова:</strong> ${rec.keywords.join(', ')}
          </div>
        </div>
      </div>
    </div>
  `;

  // Открытие фото в модальном окне
  const img = container.querySelector('.gallery-thumb');
  if (img) {
    img.addEventListener('click', () => {
      showModal(img.src);
    });
  }

  // если аудио, активируем подсветку транскрипта
  const audioEl = document.getElementById('audio-player');
  renderTranscript(rec, audioEl, container);
}


function setupSearchFilter(data){
  const input = document.getElementById('search');
  const sel = document.getElementById('filter-year');
  const clear = document.getElementById('clear');
  if(!input) return;

  // autocomplete elements
  const acWrap = input.parentElement;
  acWrap.classList.add('autocomplete');
  const acList = document.createElement('div');
  acList.className = 'autocomplete-list';
  acList.style.display = 'none';
  acWrap.appendChild(acList);

  function showAutocomplete(items){
    acList.innerHTML = '';
    if(items.length===0){ acList.style.display='none'; return; }
    items.slice(0,8).forEach(it=>{
      const row = document.createElement('div');
      row.className = 'autocomplete-item';
      row.textContent = it.name + ' — ' + it.role + ' (' + it.year + ')';
      row.addEventListener('click', ()=> {
        window.location.href = 'record.html?id=' + encodeURIComponent(it.id);
      });
      acList.appendChild(row);
    });
    acList.style.display = 'block';
  }

  function apply(){
    const q = input.value.trim().toLowerCase();
    const year = sel ? sel.value : '';
    if(q && q.length>=2){
      // show autocomplete
      const matches = data.filter(d=> (d.name + ' ' + d.description + ' ' + d.keywords.join(' ')).toLowerCase().includes(q));
      showAutocomplete(matches);
    } else {
      acList.style.display='none';
    }

    const filtered = data.filter(d=>{
      let ok=true;
      if(q){
        ok = (d.name + ' ' + d.description + ' ' + d.keywords.join(' ')).toLowerCase().includes(q);
      }
      if(ok && year){
        ok = d.year===year;
      }
      return ok;
    });
    renderList(filtered);
  }
  input.addEventListener('input', apply);
  input.addEventListener('focus', apply);
  document.addEventListener('click', (e)=> {
    if(!acWrap.contains(e.target)) acList.style.display='none';
  });

  if(sel) sel.addEventListener('change', apply);
  if(clear) clear.addEventListener('click', ()=>{
    input.value=''; if(sel) sel.value=''; renderList(data);
  });
}

function showModal(src){
  let modal = document.getElementById('img-modal');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'img-modal';
    modal.className = 'modal';
    modal.innerHTML = '<div class="modal-content"><img src="" alt="preview"></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', ()=> modal.style.display='none');
  }
  modal.querySelector('img').src = src;
  modal.style.display = 'flex';
}



// NEWS: render published records, considering localStorage overrides
function getPublishedRecords(data){
  // local overrides stored as { publishedIds: {ID: true} } in localStorage
  const overrides = JSON.parse(localStorage.getItem('ja_published_overrides') || '{}');
  return data.filter(d=>{
    const localVal = overrides[d.id];
    if(localVal === true) return true;
    if(localVal === false) return false;
    return !!d.published;
  }).sort((a,b)=> (b.date || '').localeCompare(a.date || ''));
}

function renderNews(data){
  const list = document.getElementById('news-list');
  if(!list) return;
  list.innerHTML = '';
  const news = getPublishedRecords(data);
  news.forEach(item=>{
    const div = document.createElement('div');
    div.className = 'card';
    const snippet = item.description.length>120 ? item.description.slice(0,120)+'…' : item.description;
    div.innerHTML = `<h4><a href="record.html?id=${encodeURIComponent(item.id)}">${item.name}</a></h4><p class="meta">${item.date} • ${item.role}</p><p>${snippet}</p>`;
    list.appendChild(div);
  });
}

// Admin publish button handler (local demo)
function setupNewsAdmin(data){
  const btn = document.getElementById('publish-btn');
  const input = document.getElementById('pub-id');
  if(!btn || !input) return;
  btn.addEventListener('click', ()=>{
    const id = input.value.trim();
    if(!id){ alert('Введите ID записи'); return; }
    const rec = data.find(d=>d.id===id);
    if(!rec){ alert('Запись не найдена'); return; }
    const overrides = JSON.parse(localStorage.getItem('ja_published_overrides') || '{}');
    overrides[id] = true;
    localStorage.setItem('ja_published_overrides', JSON.stringify(overrides));
    alert('Запись отмечена как опубликованная (локально). Обновите страницу новостей.');
    renderNews(data);
  });
}

// Render news block on index
function renderNewsBlock(data){
  const block = document.getElementById('news-list');
  if(!block) return;
  const news = getPublishedRecords(data).slice(0,3);
  news.forEach(item=>{
    block.appendChild(createCard(item));
  });
}


document.addEventListener('DOMContentLoaded', async ()=>{
  const data = await loadData();
  renderFeatured(data);
  renderList(data);
  populateYears(data);
  setupSearchFilter(data);
  renderRecord(data);
  renderNews(data);
  setupNewsAdmin(data);
  renderNewsBlock(data);


  // simple demo: form submission local save
  const form = document.getElementById('contrib-form');
  if(form){
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const formData = new FormData(form);
      const obj = Object.fromEntries(formData.entries());
      localStorage.setItem('ja_contrib', JSON.stringify(obj));
      alert('Спасибо! Ваша заявка сохранена локально. Мы свяжемся с вами.');
      form.reset();
    })
  }
});

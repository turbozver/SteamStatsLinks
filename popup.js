const container = document.querySelector('.container');

function refreshSteamTabs() {
    chrome.tabs.query({ url: ["https://steamcommunity.com/id/*", "https://steamcommunity.com/profiles/*"] }, tabs => {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { type: 'toggle_changed' }, () => {
                if (chrome.runtime.lastError) {}
            });
        });
    });
}

function renderMainList() {
    chrome.storage.local.get(['order', 'links'], (result) => {
        const order = result.order || [];
        const links = result.links || [];
        const orderedLinks = order.length
            ? order.map(name => links.find(link => link.name === name)).filter(Boolean)
            : links;

        container.innerHTML = '';
        orderedLinks.forEach(link => {
            const row = document.createElement('div');
            row.className = 'row';
            row.setAttribute('draggable', 'true');
            row.dataset.id = link.name;
            row.innerHTML = `
                <label>${link.name}</label>
                <button class="edit-link-btn" type="button" title="Edit" aria-label="Edit">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4 20h4.25L19.4 8.85a2 2 0 0 0 0-2.83L17.98 4.6a2 2 0 0 0-2.83 0L4 15.75V20Zm2-3.42L16.56 6.02l1.42 1.42L7.42 18H6v-1.42Z" fill="currentColor"/>
                    </svg>
                </button>`;
            container.appendChild(row);
        });

        addDnDHandlers();
    });
}

renderMainList();

function addDnDHandlers() {
    container.querySelectorAll('.row').forEach(row => {
        row.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', [...row.parentNode.children].indexOf(row));
            row.classList.add('dragging');
        });

        row.addEventListener('dragend', (e) => {
            row.classList.remove('dragging');
        });

        row.addEventListener('dragover', (e) => {
            e.preventDefault();
            row.classList.add('dragover');
        });

        row.addEventListener('dragleave', (e) => {
            row.classList.remove('dragover');
        });

        row.addEventListener('drop', (e) => {
            e.preventDefault();
            row.classList.remove('dragover');

            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
            const toIndex = [...container.children].indexOf(row);

            if (fromIndex === toIndex) return;

            const rows = Array.from(container.children);
            const dragged = rows[fromIndex];

            if (fromIndex < toIndex) {
                container.insertBefore(dragged, row.nextSibling);
            } else {
                container.insertBefore(dragged, row);
            }

            saveOrder();
        });
    });
}

function saveOrder() {
    const order = Array.from(container.children).map(row => row.dataset.id);
    chrome.storage.local.set({ order });
    refreshSteamTabs();
}

const formContainer = document.querySelector('.form-container');
const btnAdd = document.getElementById('btnAdd');

btnAdd.addEventListener('click', () => {
    showAddNewChoice();
});

function showForm(link = null) {
    const steamId3Selected = link ? link.steamid : true;
    formContainer.innerHTML = `
        <form id="linkForm" style="position:relative;">
            <button id="backFormBtn" type="button" title="Back" aria-label="Back">
                <svg width="22" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M10 19l-7-7 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M3 12h13a6 6 0 1 1 0 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
            <label style="margin-top: 28px;">
                <span class="textSpan">Title:</span>
                <input name="name" value="${link ? link.name : ''}" class="textInput" required>
            </label>
            <label>
                <span class="nomargin textSpan">Link: 
                    <span class="info-icon" data-tooltip="Starts with https://\n\n{s} - SteamID\nAdds to end if not present">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="12" fill="#23263a"/>
                            <text x="12" y="17" text-anchor="middle" font-size="14" fill="#7ecbff" font-family="Arial" font-weight="bold">?</text>
                        </svg>
                    </span>
                </span>
                <input name="link" value="${link ? link.link : ''}" class="textInput" required>
            </label>
            <label style="display:flex; align-items:center; gap:8px; justify-content:center;">
                <span style="min-width:auto; text-align:left; margin-right:0;">Enabled:</span>
                <span class="enabled-switch" style="position:relative; display:inline-flex; align-items:center; flex:none; min-width:44px; max-width:44px; width:44px; height:22px; border-radius:999px; background:${!link || link.enabled ? '#8b5cf6' : '#444'}; cursor:pointer;">
                    <input type="checkbox" name="enabled" ${!link || link.enabled ? 'checked' : ''} style="position:absolute; inset:0; width:100%; height:100%; opacity:0; margin:0; cursor:pointer;">
                    <span class="enabled-thumb" style="position:absolute; top:2px; width:18px; height:18px; border-radius:50%; background:#eee; left:${!link || link.enabled ? 'calc(100% - 20px)' : '2px'}; transition:left .2s;"></span>
                </span>
            </label>
            <label style="display:flex; flex-direction:column; gap:8px; align-items:center; width:100%;">
                <span style="display:block; width:100%; text-align:center;">SteamID format:
                    <span class="info-icon" data-tooltip="STEAMID3\nSelect for the shorter account ID variant.\n\nSTEAMID64\nSelect for the full 17-digit ID starting with 7656119.">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="12" fill="#23263a"/>
                            <text x="12" y="17" text-anchor="middle" font-size="14" fill="#7ecbff" font-family="Arial" font-weight="bold">?</text>
                        </svg>
                    </span>
                </span>
                <div class="steamid-segment" style="display:flex; border:1px solid #444; border-radius:10px; overflow:hidden; background:#161822; width:auto; min-width:180px; max-width:220px;">
                    <label class="steamid-segment-option" style="flex:1; margin:0;">
                        <input type="radio" name="steamid" value="3" ${steamId3Selected ? 'checked' : ''} style="display:none;">
                        <div class="steamid-segment-value" style="padding:6px 8px; text-align:center; cursor:pointer;">SteamID3</div>
                    </label>
                    <label class="steamid-segment-option" style="flex:1; margin:0;">
                        <input type="radio" name="steamid" value="64" ${steamId3Selected ? '' : 'checked'} style="display:none;">
                        <div class="steamid-segment-value" style="padding:6px 8px; text-align:center; cursor:pointer;">SteamID64</div>
                    </label>
                </div>
            </label>
            <label>
                <span>BG Color:</span>
                <input type="color" name="bgcolor" value="${link ? link.bgcolor : '#000000'}">
            </label>
            <label>
                <span>Text Color:</span>
                <input type="color" name="textcolor" value="${link ? link.textcolor : '#ffffff'}">
            </label>
            <div style="display: flex; gap: 8px;">
                <button type="submit" style="flex:1; heigth:10px;">${link ? 'Save' : 'Create'}</button>
                ${link ? `<button type="button" id="deleteBtn">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M7 21q-.825 0-1.413-.588T5 19V7H4V5h5V4h6v1h5v2h-1v12q0 .825-.588 1.413T17 21H7Zm10-14H7v12h10V7ZM9 17h2V9H9v8Zm4 0h2V9h-2v8Z"/></svg>
                </button>` : ''}
            </div>
        </form>
    `;
    document.querySelector('.main').style.display = 'none';
    formContainer.style.display = 'block';

    document.getElementById('backFormBtn').onclick = () => {
        formContainer.style.display = 'none';
        document.querySelector('.main').style.display = 'block';
    };

    const steamSegmentOptions = document.querySelectorAll('.steamid-segment-option');
    const updateSteamSegment = () => {
        steamSegmentOptions.forEach(opt => {
            const input = opt.querySelector('input[type="radio"]');
            const valueDiv = opt.querySelector('.steamid-segment-value');
            if (input.checked) {
                valueDiv.style.background = '#8b5cf6';
                valueDiv.style.color = '#fff';
            } else {
                valueDiv.style.background = 'transparent';
                valueDiv.style.color = '#aaa';
            }
        });
    };

    steamSegmentOptions.forEach(option => {
        option.addEventListener('click', () => {
            const input = option.querySelector('input[type="radio"]');
            input.checked = true;
            updateSteamSegment();
        });
    });

    const enabledInput = document.querySelector('input[name="enabled"]');
    const enabledThumb = document.querySelector('.enabled-thumb');
    const enabledSwitch = document.querySelector('.enabled-switch');

    const updateEnabledThumb = () => {
        const checked = enabledInput.checked;
        enabledSwitch.style.background = checked ? '#8b5cf6' : '#444';
        enabledThumb.style.left = checked ? 'calc(100% - 22px)' : '2px';
    };

    enabledInput.addEventListener('change', updateEnabledThumb);
    updateEnabledThumb();

    updateSteamSegment();

    document.getElementById('linkForm').onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        data.enabled = !!e.target.enabled.checked;
        data.steamid = e.target.steamid.value === '3';

        chrome.storage.local.get(['links', 'order'], (result) => {
            let links = result.links || [];
            let order = result.order || [];
            
            if (links.some(l => l.name === data.name && (!link || l.name !== link.name))) {
                alert('Title already exists!');
                return;
            }

            if (link) {
                links = links.map(l => l.name === link.name ? {...l, ...data} : l);
                if (link.name !== data.name) {
                    order = order.map(n => n === link.name ? data.name : n);
                }
            } else {
                links.push(data);
                order.push(data.name);
            }
            chrome.storage.local.set({links, order}, () => location.reload());
            refreshSteamTabs();
        });
    };

    if (link) {
        document.getElementById('deleteBtn').onclick = () => {
            chrome.storage.local.get(['links', 'order'], (result) => {
                let links = (result.links || []).filter(l => l.name !== link.name);
                let order = (result.order || []).filter(n => n !== link.name);
                chrome.storage.local.set({links, order}, () => location.reload());
                refreshSteamTabs();
            });
        };
    }
}

document.addEventListener('click', function(e) {
    const editButton = e.target.closest('.edit-link-btn');
    if (editButton) {
        const name = editButton.parentElement.dataset.id;
        chrome.storage.local.get('links', (result) => {
            const link = (result.links || []).find(l => l.name === name);
            if (link) showForm(link);
        });
    }
});

function showAddNewChoice() {
    formContainer.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px; align-items:center; padding:18px; position:relative;">
            <button id="backChoiceBtn" style="
                position:absolute;
                top:-8px;
                left:-2px;
                background:none;
                border:none;
                padding:0;
                cursor:pointer;
                width:24px;
                height:26px;
                display:flex;
                align-items:center;
                justify-content:center;
            ">
                <svg width="22" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M10 19l-7-7 7-7" stroke="#7ecbff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M3 12h13a6 6 0 1 1 0 12" stroke="#7ecbff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
            <button id="presetBtn" class="styled-btn" style="margin-top:18px;">Choose preset</button>
            <button id="manualBtn" class="styled-btn">Create manually</button>
        </div>
    `;
    document.querySelector('.main').style.display = 'none';
    formContainer.style.display = 'block';

    document.getElementById('presetBtn').onclick = showPresetList;
    document.getElementById('manualBtn').onclick = () => showForm();
    document.getElementById('backChoiceBtn').onclick = () => {
        formContainer.style.display = 'none';
        document.querySelector('.main').style.display = 'block';
    };
}

const presets = [
    {
        category: "Deadlock",
        items: [
            {
                name: "tracklock",
                link: "https://tracklock.gg/players/",
                enabled: true,
                steamid: true,
                bgcolor: "#0d1013",
                textcolor: "#efdebf"
            },
            {
                name: "statlocker",
                link: "https://statlocker.gg/profile/",
                enabled: true,
                steamid: true,
                bgcolor: "#070707",
                textcolor: "#be9958"
            },
            {
                name: "Deadlock Tracker",
                link: "https://deadlocktracker.gg/player/",
                enabled: true,
                steamid: true,
                bgcolor: "#1c2933",
                textcolor: "#02d2ee"
            },
            {
                name: "Mobalytics",
                link: "https://mobalytics.gg/deadlock/player-profile/",
                enabled: true,
                steamid: false,
                bgcolor: "#151136",
                textcolor: "#ffffff"
            },
            {
                name: "LockBlaze",
                link: "https://www.lockblaze.com/analytics/",
                enabled: true,
                steamid: false,
                bgcolor: "#020202",
                textcolor: "#f89044"
            }
        ]
    },
    {
        category: "CS2",
        items: [
            {
                name: "Leetify",
                link: "https://leetify.com/app/profile/",
                enabled: true,
                steamid: false,
                bgcolor: "#201e25",
                textcolor: "#f84982"
            },
            {
                name: "csstats",
                link: "https://csstats.gg/player/",
                enabled: true,
                steamid: false,
                bgcolor: "#1d202f",
                textcolor: "#ffffff"
            },
            {
                name: "Faceit Analyser",
                link: "https://faceitanalyser.com/stats/{s}/cs2",
                enabled: true,
                steamid: false,
                bgcolor: "#000000",
                textcolor: "#ff7208"
            },
            {
                name: "csst.at",
                link: "https://csst.at/profile/",
                enabled: true,
                steamid: false,
                bgcolor: "#1d232a",
                textcolor: "#ffffff"
            },
            {
                name: "cswat.ch",
                link: "https://cswat.ch/stats/",
                enabled: true,
                steamid: false,
                bgcolor: "#fd2a36",
                textcolor: "#ffffff"
            }
        ]
    },
    {
        category: "Steam",
        items: [
            {
                name: "steamhistory",
                link: "https://steamhistory.net/id/",
                enabled: true,
                steamid: false,
                bgcolor: "#000000",
                textcolor: "#e1dfd7"
            },
            {
                name: "steamdb",
                link: "https://steamdb.info/calculator/",
                enabled: true,
                steamid: false,
                bgcolor: "#000000",
                textcolor: "#ffffff"
            }
        ]
    },
    {
        category: "Dota 2",
        items: [
            {
                name: "OpenDota",
                link: "https://www.opendota.com/players/",
                enabled: true,
                steamid: true,
                bgcolor: "#192a3d",
                textcolor: "#e0e6ea"
            },
            {
                name: "dotabuff",
                link: "https://www.dotabuff.com/players/",
                enabled: true,
                steamid: true,
                bgcolor: "#242f39",
                textcolor: "#ed3b1c"
            }
        ]
    }
];

function showPresetList() {
    chrome.storage.local.get(['links', 'order'], (result) => {
        const links = result.links || [];
        const usedNames = links.map(l => l.name);

        let expanded = {};
        presets.forEach((cat, i) => expanded[i] = true);

        function render() {
            formContainer.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:10px; padding:18px; position:relative;">
                    <button id="backPresetBtn" style="
                        position:absolute;
                        top:-8px;
                        left:-2px;
                        background:none;
                        border:none;
                        padding:0;
                        cursor:pointer;
                        width:24px;
                        height:26px;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                    ">
                        <svg width="22" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M10 19l-7-7 7-7" stroke="#7ecbff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M3 12h13a6 6 0 1 1 0 12" stroke="#7ecbff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <b style="margin-bottom:5px; margin-top:16px; font-size: 13pt;">Select a preset:</b>
                    ${presets.map((cat, i) => {
                        const available = cat.items.filter(preset => !usedNames.includes(preset.name));
                        return `
                            <div style="margin:10px 0 4px 0;">
                                <div style="display:flex;align-items:center;gap:8px;">
                                    <div class="preset-category-title" style="flex:1;border-bottom:1px solid #555555;font-weight:bold;padding-bottom:6px;margin-bottom:12px;">
                                        ${cat.category}
                                    </div>
                                    <button class="toggleCatBtn" data-index="${i}" style="
                                        background:none;
                                        border:none;
                                        cursor:pointer;
                                        font-size:18px;
                                        color:#7ecbff;
                                        padding:0 4px;
                                        line-height:1;
                                        margin-top:8px;
                                        transform: ${expanded[i] ? '' : 'rotate(-90deg)'};
                                    ">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="display:block;">
                                            <path d="M6 9l6 6 6-6" stroke="#7ecbff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                    </button>
                                </div>
                                <div class="catPresets" data-index="${i}" style="display:flex; flex-direction:column; align-items:center; ${expanded[i] ? '' : 'display:none;'}">
                                    ${available.length === 0
                                        ? `<div style="margin-top:6px; color:#aaa; text-align: center;">No available presets.</div>`
                                        : available.map((preset, j) => `
                                            <button class="presetBtn" data-cat="${i}" data-index="${j}" style="
                                                width:85%;
                                                margin-right: 8px;
                                                background:${preset.bgcolor};
                                                color:${preset.textcolor};
                                                border-radius:5px;
                                                border:none;
                                                padding:8px 0;
                                                font-weight:bold;
                                                cursor:pointer;
                                                margin-bottom:2px;
                                            ">${preset.name}</button>
                                        `).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            document.getElementById('backPresetBtn').onclick = showAddNewChoice;

            document.querySelectorAll('.toggleCatBtn').forEach(btn => {
                btn.onclick = () => {
                    const idx = btn.dataset.index;
                    expanded[idx] = !expanded[idx];
                    render();
                };
            });

            document.querySelectorAll('.presetBtn').forEach(btn => {
                btn.onclick = () => {
                    const catIdx = btn.dataset.cat;
                    const presetIdx = btn.dataset.index;
                    const preset = presets[catIdx].items.filter(preset => !usedNames.includes(preset.name))[presetIdx];
                    chrome.storage.local.get(['links', 'order'], (result) => {
                        let links = result.links || [];
                        let order = result.order || [];
                        links.push({...preset});
                        order.push(preset.name);
                        chrome.storage.local.set({links, order}, () => {
                            usedNames.push(preset.name);
                            render();
                            renderMainList();
                        });
                        refreshSteamTabs();
                    });
                };
            });
        }

        render();
    });
}

function showSettings() {
    formContainer.classList.add('settings-view');
    formContainer.innerHTML = `
        <div class="settings-shell">
            <header class="settings-header">
                <button id="backSettingsBtn" class="settings-back" type="button" title="Back" aria-label="Back">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <h2>Settings</h2>
                <span></span>
            </header>

            <div class="settings-stack">
                <section class="settings-block">
                    <div class="settings-block-title">
                        <strong>About</strong>
                    </div>

                    <div class="settings-links">
                        <a class="settings-link-card" href="https://github.com/turbozver/SteamStatsLinks" target="_blank" rel="noreferrer">
                            <span class="settings-link-icon github-icon" aria-hidden="true"></span>
                            <span><strong>GitHub</strong></span>
                        </a>

                        <a class="settings-link-card" href="mailto:turbozver24@gmail.com" target="_blank" rel="noreferrer">
                            <span class="settings-link-icon mail-icon" aria-hidden="true"></span>
                            <span>
                                <strong>Contact</strong>
                                <small>turbozver24@gmail.com</small>
                            </span>
                        </a>
                    </div>

                    <div class="settings-micro-grid">
                        <div class="settings-micro-card rate-card">
                            <span>Rate extension</span>
                            <div id="rateBlock"></div>
                        </div>
                        <div class="settings-micro-card made-card">
                            <span>Made w/ <b aria-label="love">&#10084;</b></span>
                            <strong>by turbozver</strong>
                        </div>
                    </div>
                </section>

                <section class="settings-block">
                    <div class="settings-block-title">
                        <strong>Data</strong>
                    </div>
                    <div class="settings-actions">
                        <button id="importBtn" type="button">Import</button>
                        <button id="exportBtn" type="button">Export</button>
                        <button id="deleteAllBtn" class="settings-danger" type="button">Delete All Links</button>
                        <input id="importFile" type="file" accept="application/json" hidden>
                    </div>
                </section>
            </div>
        </div>
    `;
    document.querySelector('.main').style.display = 'none';
    formContainer.style.display = 'block';

    document.getElementById('backSettingsBtn').onclick = () => {
        formContainer.style.display = 'none';
        formContainer.classList.remove('settings-view');
        document.querySelector('.main').style.display = 'block';
    };
    document.getElementById('importBtn').onclick = () => {
        document.getElementById('importFile').click();
    };
    document.getElementById('exportBtn').onclick = exportLinks;
    document.getElementById('importFile').onchange = importLinks;
    document.getElementById('deleteAllBtn').onclick = () => {
        if (confirm('Are you sure you want to delete all saved links?')) {
            chrome.storage.local.set({links: [], order: []}, () => {
                refreshSteamTabs();
                renderMainList();
                formContainer.style.display = 'none';
                formContainer.classList.remove('settings-view');
                document.querySelector('.main').style.display = 'block';
            });
        }
    };

    renderRateBlock();
}

function exportLinks() {
    chrome.storage.local.get(['links', 'order'], (data) => {
        const payload = {
            version: 1,
            links: Array.isArray(data.links) ? data.links : [],
            order: Array.isArray(data.order) ? data.order : []
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `steam-stats-links-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
}

function importLinks(event) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const parsed = JSON.parse(String(reader.result || '{}'));
            const source = parsed.storage && typeof parsed.storage === 'object' ? parsed.storage : parsed;
            if (!Array.isArray(source.links)) throw new Error('Links array is missing');
            const links = normalizeImportedLinks(source.links);
            if (!confirm(`Replace current data with ${links.length} imported link${links.length === 1 ? '' : 's'}?`)) return;

            const names = new Set(links.map(link => link.name));
            const order = [...new Set(Array.isArray(source.order) ? source.order.map(String) : [])]
                .filter(name => names.has(name));
            links.forEach(link => {
                if (!order.includes(link.name)) order.push(link.name);
            });

            chrome.storage.local.set({ links, order }, () => {
                refreshSteamTabs();
                renderMainList();
                alert('Import completed.');
            });
        } catch (error) {
            alert(`Unable to import data: ${error.message}`);
        } finally {
            input.value = '';
        }
    };
    reader.onerror = () => {
        input.value = '';
        alert('Unable to read the selected file.');
    };
    reader.readAsText(file);
}

function normalizeImportedLinks(value) {
    if (!Array.isArray(value)) return [];
    const names = new Set();
    return value.reduce((result, entry) => {
        if (!entry || typeof entry !== 'object') return result;
        const name = String(entry.name || '').trim();
        const link = String(entry.link || '').trim();
        if (!name || !link || names.has(name)) return result;
        names.add(name);
        result.push({
            ...entry,
            name,
            link,
            enabled: entry.enabled !== false,
            steamid: entry.steamid !== false,
            bgcolor: String(entry.bgcolor || '#17191f'),
            textcolor: String(entry.textcolor || '#f2f3f5')
        });
        return result;
    }, []);
}

function renderRateBlock() {
    const isFirefox = navigator.userAgent.includes('Firefox');
    let url = '';
    if (isFirefox) url = 'https://addons.mozilla.org/firefox/addon/steam-stats-links/';
    else url = 'https://chromewebstore.google.com/detail/steam-stats-links/ojmmcmoegpnmepjokkdemcgiklaldcld';

    document.getElementById('rateBlock').innerHTML = `
        <div class="rate-stars" role="group" aria-label="Rate this extension">
            ${[1,2,3,4,5].map(star => `
                <button class="rateStar" data-star="${star}" type="button" aria-label="Rate ${star} star${star === 1 ? '' : 's'}">&#9733;</button>
            `).join('')}
        </div>
    `;
    document.querySelectorAll('.rateStar').forEach(star => {
        star.onclick = () => {
            window.open(url, '_blank');
        };

        star.onmouseenter = e => {
            const val = parseInt(e.target.dataset.star);
            document.querySelectorAll('.rateStar').forEach(s => {
                s.style.opacity = parseInt(s.dataset.star) <= val ? "1" : "0.3";
            });
        };

        star.onmouseleave = () => {
            document.querySelectorAll('.rateStar').forEach(s => s.style.opacity = "1");
        };
    });
}

document.getElementById('settingsBtn').onclick = showSettings;

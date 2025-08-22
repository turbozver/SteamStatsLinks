const container = document.querySelector('.container');

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
            row.innerHTML = `<label>${link.name}</label><button>edit</button>`;
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

    chrome.tabs.query({ url: ["https://steamcommunity.com/id/*", "https://steamcommunity.com/profiles/*"] }, tabs => {
        chrome.tabs.sendMessage(tabs[0].id, {
            type: 'toggle_changed'
        });
    });
}

const formContainer = document.querySelector('.form-container');
const btnAdd = document.getElementById('btnAdd');

btnAdd.addEventListener('click', () => {
    showAddNewChoice();
});

function showForm(link = null) {
    formContainer.innerHTML = `
        <form id="linkForm" style="position:relative;">
            <button id="backFormBtn" type="button" style="
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
            <label>
                <span>Enabled:</span>
                <input type="checkbox" name="enabled" ${!link || link.enabled ? 'checked' : ''}>
            </label>
            <label>
                <span>SteamID3:
                    <span class="info-icon" data-tooltip="STEAMID64\n[unchecked]\nStarts with 7656119 and has 17 digits\n\nSTEAMID3\n[checked]\nShort version, less digits">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="12" fill="#23263a"/>
                            <text x="12" y="17" text-anchor="middle" font-size="14" fill="#7ecbff" font-family="Arial" font-weight="bold">?</text>
                        </svg>
                    </span>
                </span>
                <input type="checkbox" name="steamid" ${link && link.steamid ? 'checked' : ''}>
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

    document.getElementById('linkForm').onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        data.enabled = !!e.target.enabled.checked;
        data.steamid = !!e.target.steamid.checked;

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

            chrome.tabs.query({ url: ["https://steamcommunity.com/id/*", "https://steamcommunity.com/profiles/*"] }, tabs => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'toggle_changed'
                });
            });
        });
    };

    if (link) {
        document.getElementById('deleteBtn').onclick = () => {
            chrome.storage.local.get(['links', 'order'], (result) => {
                let links = (result.links || []).filter(l => l.name !== link.name);
                let order = (result.order || []).filter(n => n !== link.name);
                chrome.storage.local.set({links, order}, () => location.reload());

                chrome.tabs.query({ url: ["https://steamcommunity.com/id/*", "https://steamcommunity.com/profiles/*"] }, tabs => {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        type: 'toggle_changed'
                    });
                });
            });
        };
    }
}

document.addEventListener('click', function(e) {
    if (e.target.tagName === 'BUTTON' && e.target.textContent === 'edit') {
        const name = e.target.parentElement.dataset.id;
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
                                    <div style="flex:1;border-bottom:1px solid #555555;font-weight:bold;color:#7ecbff;padding-bottom:6px;margin-bottom:12px;">
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

                        chrome.tabs.query({ url: ["https://steamcommunity.com/id/*", "https://steamcommunity.com/profiles/*"] }, tabs => {
                            chrome.tabs.sendMessage(tabs[0].id, {
                                type: 'toggle_changed'
                            });
                        });
                    });
                };
            });
        }

        render();
    });
}

function showSettings() {
    formContainer.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:18px; align-items:center; padding:18px 18px 4px; position:relative;">
            <button id="backSettingsBtn" style="position:absolute; top:-8px; left:-2px; background:none; border:none; padding:0; cursor:pointer; width:24px; height:26px; display:flex; align-items:center; justify-content:center;">
                <svg width="22" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M10 19l-7-7 7-7" stroke="#7ecbff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M3 12h13a6 6 0 1 1 0 12" stroke="#7ecbff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
            <div style="display:flex; gap:18px;">
                <button id="githubBtn" title="GitHub" style="background:none; border:none; cursor:pointer;">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.51 2.87 8.34 6.84 9.7.5.09.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.36-3.37-1.36-.45-1.17-1.1-1.48-1.1-1.48-.9-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.08 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05a9.38 9.38 0 0 1 2.5-.34c.85 0 1.71.11 2.5.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.95-2.34 4.82-4.57 5.08.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.8 0 .26.18.57.69.48A10.01 10.01 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" fill="#7ecbff"/>
                    </svg>
                </button>
                <button id="emailBtn" title="Email" style="background:none; border:none; cursor:pointer;">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                        <rect x="2" y="6" width="20" height="12" rx="2" stroke="#7ecbff" stroke-width="2"/>
                        <path d="M22 6l-10 7L2 6" stroke="#7ecbff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
            <button id="deleteAllBtn" class="styled-btn" style="width:90%; background:#c62828; color:#fff;">Delete all links</button>
            <div style="margin-top:8px; color:#aaa; font-size:10pt;">Made w/ <span style="color:#f84982;">&#10084;</span> by turbozver</div>
            <div id="rateBlock" style="width: auto;"></div>
        </div>
    `;
    document.querySelector('.main').style.display = 'none';
    formContainer.style.display = 'block';

    document.getElementById('backSettingsBtn').onclick = () => {
        formContainer.style.display = 'none';
        document.querySelector('.main').style.display = 'block';
    };
    document.getElementById('githubBtn').onclick = () => {
        window.open('https://github.com/turbozver/SteamStatsLinks', '_blank');
    };
    document.getElementById('emailBtn').onclick = () => {
        window.open('mailto:turbozver24@gmail.com', '_blank');
    };
    document.getElementById('deleteAllBtn').onclick = () => {
        if (confirm('Are you sure you want to delete all saved links?')) {
            chrome.storage.local.set({links: [], order: []}, () => {
                renderMainList();
                formContainer.style.display = 'none';
                document.querySelector('.main').style.display = 'block';
            });
        }
    };

    renderRateBlock();
}

function renderRateBlock() {
    const isFirefox = navigator.userAgent.includes('Firefox');
    let url = '';
    if (isFirefox) url = 'https://addons.mozilla.org/ru/firefox/addon/steam-stats-links/';
    else url = 'https://chromewebstore.google.com/detail/steam-stats-links/ojmmcmoegpnmepjokkdemcgiklaldcld';

    document.getElementById('rateBlock').innerHTML = `
        <div style="display:flex; gap:4px; justify-content:center;">
            ${[1,2,3,4,5].map(star => `
                <span class="rateStar" data-star="${star}" style="font-size:22px; cursor:pointer; color:#ffd700;">&#9733;</span>
            `).join('')}
        </div>
        <div style="text-align:center; color:#aaa; font-size:10pt; margin-top:4px;">Rate this extension</div>
    `;
    document.querySelectorAll('.rateStar').forEach(star => {
        star.onclick = () => {
            window.open(url, '_blank');
        };

        star.onmouseover = e => {
            const val = parseInt(e.target.dataset.star);
            document.querySelectorAll('.rateStar').forEach(s => {
                s.style.opacity = parseInt(s.dataset.star) <= val ? "1" : "0.3";
            });
        };

        star.onmouseout = () => {
            document.querySelectorAll('.rateStar').forEach(s => s.style.opacity = "1");
        };
    });
}

document.getElementById('settingsBtn').onclick = showSettings;
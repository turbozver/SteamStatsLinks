const container = document.querySelector('.container');

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
            <label style="margin-top: 26px;">
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
    },
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
    },
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
];

function showPresetList() {
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
            <div style="margin-bottom:5px; margin-top:16px;">Select a preset:</div>
            ${presets.map((preset, i) => `
                <button class="presetBtn" data-index="${i}" style="
                    width:100%;
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
    `;
    document.getElementById('backPresetBtn').onclick = showAddNewChoice;
    document.querySelectorAll('.presetBtn').forEach(btn => {
        btn.onclick = () => {
            const preset = presets[btn.dataset.index];
            chrome.storage.local.get(['links', 'order'], (result) => {
                let links = result.links || [];
                let order = result.order || [];
                if (links.some(l => l.name === preset.name)) {
                    alert('Title already exists!');
                    return;
                }
                links.push({...preset});
                order.push(preset.name);
                chrome.storage.local.set({links, order}, () => location.reload());

                chrome.tabs.query({ url: ["https://steamcommunity.com/id/*", "https://steamcommunity.com/profiles/*"] }, tabs => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'toggle_changed'
                });
            });
            });
        };
    });
}
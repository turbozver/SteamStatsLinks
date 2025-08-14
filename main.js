async function getSteamID() {
    let profileURL = window.location.pathname;
    let match = profileURL.match(/\/profiles\/(\d+)/);
    return match ? match[1] : null;
}

async function getSteamIDFromXML() {
    let response = await fetch(window.location.href + '?xml=1');
    let text = await response.text();
    let match = text.match(/<steamID64>(\d+)<\/steamID64>/);
    return match ? match[1] : null;
}

async function steamID64ToAccountID(steamID64) {
    return BigInt(steamID64) - BigInt('76561197960265728');
}

function updateLastWidth() {
    const container = document.getElementById('steamStatsLinks');
    const allButtons = Array.from(container.querySelectorAll('.btnSteamStatsLinks'));
    buttons = allButtons.filter(btn => btn.style.display !== 'none')

    buttons.forEach(btn => btn.style.width = '40%');

    if (buttons.length % 2 === 1) {
        buttons[buttons.length - 1].style.width = 'calc(80% + 30px)';
    }
}

async function createButtons() {
    let steamID = await getSteamID();
    
    if (!steamID || isNaN(steamID)) {
        steamID = await getSteamIDFromXML();
    }

    if (!steamID) return;
    
    let accountID = await steamID64ToAccountID(steamID);
    let profileRightCol = document.querySelector('.profile_rightcol');
    if (!profileRightCol) return;

    let container = document.createElement('div');
    container.id = "steamStatsLinks"

    chrome.storage.local.get(['order', 'links'], (result) => {
        const order = result.order || [];
        const links = result.links || [];

        const orderedLinks = order.length
            ? order.map(name => links.find(link => link.name === name)).filter(Boolean)
            : links;

        orderedLinks.forEach(link => {
            const btn = document.createElement('a');
            btn.id = `btn${link.name}`;
            if (link.steamid)
                btn.href = link.link.includes("{s}") ? `${link.link.replaceAll("{s}", accountID.toString())}` : link.link.endsWith("/") ? `${link.link}${accountID}` : `${link.link}/${accountID}`;
            else
                btn.href = link.link.includes("{s}") ? `${link.link.replaceAll("{s}", steamID.toString())}` : link.link.endsWith("/") ? `${link.link}${steamID}` : `${link.link}/${steamID}`;
            btn.textContent = link.name;
            btn.style.display = link.enabled ? 'inline-block' : 'none';
            btn.style.background = link.bgcolor;
            btn.style.color = link.textcolor;
            btn.classList.add("btnSteamStatsLinks");
            container.appendChild(btn);
        });

        if (profileRightCol.children.length < 2)
            profileRightCol.appendChild(container)
        else
            profileRightCol.insertBefore(container, profileRightCol.children[1])

        updateLastWidth();
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'toggle_changed') {
        document.getElementById('steamStatsLinks').remove();
        createButtons();
    }
});

window.addEventListener("DOMContentLoaded", async () => {
    await createButtons();
});
// ==UserScript==
// @name         X Profile Forensics (v2.1 Context Aware)
// @namespace    http://tampermonkey.net/
// @version      2.1.0
// @description  Advanced forensics. Now understands that VPN usage for Iranian users is "Normal" behavior, not "High Risk".
// @author       A Pleasant Experience
// @match        https://x.com/*
// @match        https://twitter.com/*
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // --- 1. CSS STYLES ---
    const STYLES = `
        :root {
            --xf-bg: rgba(0, 0, 0, 0.85);
            --xf-border: rgba(255, 255, 255, 0.12);
            --xf-glass: blur(16px);
            --xf-blue: #1d9bf0;
            --xf-green: #00ba7c;
            --xf-red: #f91880;
            --xf-orange: #ffd400;
            --xf-text: #e7e9ea;
            --xf-text-dim: #71767b;
        }
        #xf-pill {
            display: inline-flex; align-items: center; background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--xf-border); border-radius: 999px; padding: 4px 12px;
            margin-right: 12px; margin-bottom: 4px; cursor: pointer; transition: all 0.2s ease;
            font-family: TwitterChirp, -apple-system, sans-serif; font-size: 13px; user-select: none;
        }
        #xf-pill:hover { background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.3); }
        .xf-dot {
            width: 8px; height: 8px; border-radius: 50%; margin-right: 8px;
            box-shadow: 0 0 8px currentColor; animation: xf-pulse 2s infinite;
        }
        @keyframes xf-pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
        #xf-card {
            position: fixed; z-index: 10000; width: 340px;
            background: var(--xf-bg); backdrop-filter: var(--xf-glass); -webkit-backdrop-filter: var(--xf-glass);
            border: 1px solid var(--xf-border); border-radius: 16px; padding: 16px;
            color: var(--xf-text); font-family: TwitterChirp, -apple-system, sans-serif;
            box-shadow: 0 20px 40px rgba(0,0,0,0.6); opacity: 0; transform: translateY(10px) scale(0.98);
            transition: opacity 0.2s, transform 0.2s; pointer-events: none;
        }
        #xf-card.visible { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
        .xf-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--xf-border); padding-bottom: 12px; margin-bottom: 12px; }
        .xf-title { font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: var(--xf-text-dim); }
        .xf-risk-badge { font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 6px; text-transform: uppercase; }
        .xf-risk-bar-bg { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; margin-bottom: 16px; overflow: hidden; }
        .xf-risk-bar-fill { height: 100%; width: 0%; transition: width 0.5s ease; }
        .xf-status-box { padding: 10px; border-radius: 8px; font-size: 13px; line-height: 1.4; margin-bottom: 16px; border-left: 3px solid transparent; background: rgba(255,255,255,0.03); }
        .xf-grid { display: grid; grid-template-columns: 1fr; gap: 8px; font-size: 13px; }
        .xf-row { display: flex; justify-content: space-between; }
        .xf-label { color: var(--xf-text-dim); }
        .xf-value { font-weight: 600; text-align: right; }
        .xf-mono { font-family: monospace; background: rgba(255,255,255,0.1); padding: 1px 4px; border-radius: 4px; }
        .xf-footer { margin-top: 16px; text-align: center; }
        .xf-btn { display: inline-block; width: 100%; padding: 8px 0; background: rgba(29, 155, 240, 0.15); color: var(--xf-blue); border-radius: 8px; font-weight: bold; font-size: 13px; text-decoration: none; transition: background 0.2s; }
        .xf-btn:hover { background: rgba(29, 155, 240, 0.25); }
        /* Mobile */
        #xf-mobile-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 99999; display: none; align-items: flex-end; justify-content: center; backdrop-filter: blur(4px); }
        #xf-mobile-sheet { width: 100%; max-width: 500px; background: #000; border-top: 1px solid var(--xf-border); border-radius: 20px 20px 0 0; padding: 24px; box-shadow: 0 -10px 40px rgba(0,0,0,0.5); animation: xf-slide-up 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); }
        @keyframes xf-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .xf-mobile-close { margin-top: 20px; padding: 12px; background: #eff3f4; color: #000; text-align: center; border-radius: 999px; font-weight: 700; font-size: 15px; }
    `;

    const styleEl = document.createElement("style");
    styleEl.innerHTML = STYLES;
    document.head.appendChild(styleEl);

    // --- CONFIG & STATE ---
    const CONFIG = {
        bearerToken: "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
        queryId: "XRqGa7EeokUU5kppkh13EA",
        features: {
            hidden_profile_subscriptions_enabled: true,
            subscriptions_verification_info_is_identity_verified_enabled: true,
            subscriptions_verification_info_verified_since_enabled: true,
            responsive_web_graphql_skip_user_profile_image_extensions_enabled: true,
            responsive_web_graphql_timeline_navigation_enabled: true,
            responsive_web_graphql_timeline_navigation_enabled_elsewhere: true,
            responsive_web_enhance_cards_enabled: true,
            verified_phone_label_enabled: true,
            creator_subscriptions_tweet_preview_api_enabled: true,
            highlights_tweets_tab_ui_enabled: true,
            longform_notetweets_consumption_enabled: true,
            tweetypie_unmention_optimization_enabled: true,
            vibe_api_enabled: true,
        }
    };

    const cache = {};
    let lastUrl = location.href;
    let tooltipEl = null; 
    let hideTimeout = null;
    let isInjecting = false;

    const IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    const SOURCE_REGEX = /^(.*?)\s+(App\s?Store|Google\s?Play|Play\s?Store|Android\s?App|iOS\s?App)$/i;

    const COUNTRY_MAP = {
        AF: "Afghanistan", AL: "Albania", DZ: "Algeria", AD: "Andorra", AO: "Angola", AR: "Argentina", AM: "Armenia", AU: "Australia", AT: "Austria", AZ: "Azerbaijan",
        BS: "Bahamas", BH: "Bahrain", BD: "Bangladesh", BB: "Barbados", BY: "Belarus", BE: "Belgium", BZ: "Belize", BJ: "Benin", BT: "Bhutan", BO: "Bolivia", BA: "Bosnia",
        BW: "Botswana", BR: "Brazil", BG: "Bulgaria", BF: "Burkina Faso", BI: "Burundi", KH: "Cambodia", CM: "Cameroon", CA: "Canada", CL: "Chile", CN: "China", CO: "Colombia",
        CR: "Costa Rica", HR: "Croatia", CU: "Cuba", CY: "Cyprus", CZ: "Czechia", DK: "Denmark", DO: "Dominican Republic", EC: "Ecuador", EG: "Egypt", SV: "El Salvador",
        EE: "Estonia", ET: "Ethiopia", FI: "Finland", FR: "France", GE: "Georgia", DE: "Germany", GH: "Ghana", GR: "Greece", GT: "Guatemala", HN: "Honduras", HU: "Hungary",
        IS: "Iceland", IN: "India", ID: "Indonesia", IR: "Iran", IQ: "Iraq", IE: "Ireland", IL: "Israel", IT: "Italy", JM: "Jamaica", JP: "Japan", JO: "Jordan", KZ: "Kazakhstan",
        KE: "Kenya", KW: "Kuwait", LV: "Latvia", LB: "Lebanon", LY: "Libya", LT: "Lithuania", LU: "Luxembourg", MG: "Madagascar", MY: "Malaysia", MV: "Maldives", MX: "Mexico",
        MC: "Monaco", MA: "Morocco", NP: "Nepal", NL: "Netherlands", NZ: "New Zealand", NG: "Nigeria", NO: "Norway", OM: "Oman", PK: "Pakistan", PA: "Panama", PY: "Paraguay",
        PE: "Peru", PH: "Philippines", PL: "Poland", PT: "Portugal", QA: "Qatar", RO: "Romania", RU: "Russia", SA: "Saudi Arabia", SN: "Senegal", RS: "Serbia", SG: "Singapore",
        SK: "Slovakia", SI: "Slovenia", ZA: "South Africa", KR: "South Korea", ES: "Spain", LK: "Sri Lanka", SE: "Sweden", CH: "Switzerland", TW: "Taiwan", TH: "Thailand",
        TN: "Tunisia", TR: "Turkey", UA: "Ukraine", AE: "United Arab Emirates", GB: "United Kingdom", US: "United States", UY: "Uruguay", VE: "Venezuela", VN: "Vietnam",
        YE: "Yemen", ZW: "Zimbabwe"
    };

    // --- UTILS ---
    function getCsrfToken() { return document.cookie.match(/(?:^|; )ct0=([^;]+)/)?.[1] || ""; }
    function getUsername() { return window.location.pathname.split('/')[1]; }
    function resolveCountry(val) { return (val && val.length === 2 && COUNTRY_MAP[val]) ? COUNTRY_MAP[val] : (val || "Unknown"); }
    function formatTime(ts) { 
        if (!ts) return "N/A";
        return new Date(isNaN(ts) ? ts : parseInt(ts)).toLocaleString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    }

    // --- UI: RENDER CARD ---
    function generateCardHTML(data) {
        // Defaults
        let riskColor = "var(--xf-green)";
        let riskLabel = "SAFE";
        let riskPercent = "5%";
        let statusTitle = "High Confidence";
        let statusDesc = "Connection matches organic traffic patterns.";
        let statusBorder = "var(--xf-green)";
        let statusBg = "rgba(0, 186, 124, 0.1)";

        // Logic Variables
        const isDeviceIran = (data.device || "").includes("Iran");
        const isShieldActive = (data.isAccurate === false);
        const isIranAnomaly = (data.country === "Iran" && data.isAccurate === true);

        if (isShieldActive) {
            if (isDeviceIran) {
                // CONTEXT AWARE: Iranian user + VPN = NORMAL (Low Risk)
                riskColor = "var(--xf-green)";
                riskLabel = "NORMAL";
                riskPercent = "10%";
                statusTitle = "Shield Active (Normal)";
                statusDesc = "User identified as Iranian using VPN/Proxy. This is standard behavior for this region.";
                statusBorder = "var(--xf-green)";
                statusBg = "rgba(0, 186, 124, 0.1)";
            } else {
                // Standard: VPN Detected = High Risk
                riskColor = "var(--xf-red)";
                riskLabel = "DETECTED";
                riskPercent = "90%";
                statusTitle = "Shield Active";
                statusDesc = "Traffic obfuscated via Proxy/VPN or flagged for relocation.";
                statusBorder = "var(--xf-red)";
                statusBg = "rgba(249, 24, 128, 0.1)";
            }
        } else if (isIranAnomaly) {
            // Iran + Direct = ANOMALY
            riskColor = "var(--xf-orange)";
            riskLabel = "ANOMALY";
            riskPercent = "65%";
            statusTitle = "Anomaly Detected";
            statusDesc = "Direct access blocked in Iran. Likely White SIM, Serverless, or Phone Override.";
            statusBorder = "var(--xf-orange)";
            statusBg = "rgba(255, 212, 0, 0.1)";
        }

        if (data.renamed > 0) {
            // Downgrade trust slightly if renamed
            if (riskLabel === "SAFE") {
                riskColor = "var(--xf-orange)";
                riskLabel = "CAUTION";
                riskPercent = "40%";
            }
            statusDesc += ` (User renamed ${data.renamed} times)`;
        }

        if (data.isIdVerified) {
            riskPercent = "0%";
            riskLabel = "VERIFIED ID";
            riskColor = "var(--xf-blue)";
        }

        return `
            <div class="xf-header">
                <span class="xf-title">Forensics v2.1</span>
                <span class="xf-risk-badge" style="background:${statusBorder}; color:#000;">${riskLabel}</span>
            </div>
            <div class="xf-risk-bar-bg">
                <div class="xf-risk-bar-fill" style="width:${riskPercent}; background:${riskColor}"></div>
            </div>
            <div class="xf-status-box" style="border-left-color:${statusBorder}; background:${statusBg}">
                <strong style="color:${statusBorder}">${statusTitle}</strong><br>
                <span style="opacity:0.9">${statusDesc}</span>
            </div>
            <div class="xf-grid">
                ${data.country !== "Unknown" ? `<div class="xf-row"><span class="xf-label">Location</span><span class="xf-value">📍 ${data.country}</span></div>` : ''}
                <div class="xf-row"><span class="xf-label">Device</span><span class="xf-value">${data.device}</span></div>
                <div class="xf-row"><span class="xf-label">Perm ID</span><span class="xf-value xf-mono">${data.id}</span></div>
                <div class="xf-row"><span class="xf-label">Created</span><span class="xf-value">${data.created}</span></div>
                ${data.renamed > 0 ? `<div class="xf-row"><span class="xf-label" style="color:var(--xf-orange)">Renamed</span><span class="xf-value" style="color:var(--xf-orange)">⚠️ ${data.renamed}x</span></div>` : ''}
                ${data.isIdVerified ? `<div class="xf-row"><span class="xf-label">Identity</span><span class="xf-value" style="color:var(--xf-green)">Gov ID Verified</span></div>` : ''}
            </div>
            <div class="xf-footer">
                <a href="${data.avatar}" target="_blank" class="xf-btn">View Original Avatar</a>
            </div>
        `;
    }

    // --- UI LOGIC ---
    function showDesktopTooltip(e, html) {
        if (hideTimeout) clearTimeout(hideTimeout);
        if (!tooltipEl) {
            tooltipEl = document.createElement("div");
            tooltipEl.id = "xf-card";
            tooltipEl.onmouseenter = () => clearTimeout(hideTimeout);
            tooltipEl.onmouseleave = hideDesktopTooltip;
            document.body.appendChild(tooltipEl);
        }
        tooltipEl.innerHTML = html;
        tooltipEl.className = "visible";
        const rect = tooltipEl.getBoundingClientRect();
        let top = e.clientY + 20;
        let left = e.clientX;
        if (left + rect.width > window.innerWidth) left = window.innerWidth - rect.width - 20;
        if (top + rect.height > window.innerHeight) top = e.clientY - rect.height - 10;
        tooltipEl.style.top = top + "px";
        tooltipEl.style.left = left + "px";
    }

    function hideDesktopTooltip() {
        hideTimeout = setTimeout(() => { if (tooltipEl) tooltipEl.className = ""; }, 200);
    }

    function showMobileModal(html) {
        let overlay = document.getElementById("xf-mobile-overlay");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "xf-mobile-overlay";
            overlay.innerHTML = `<div id="xf-mobile-sheet"></div>`;
            overlay.onclick = (e) => { if (e.target === overlay) overlay.style.display = "none"; };
            document.body.appendChild(overlay);
        }
        const sheet = document.getElementById("xf-mobile-sheet");
        sheet.innerHTML = html + `<div class="xf-mobile-close" onclick="document.getElementById('xf-mobile-overlay').style.display='none'">Close</div>`;
        overlay.style.display = "flex";
    }

    // --- DATA FETCH ---
    async function fetchData(username) {
        if (cache[username]) return cache[username];
        const url = `https://${location.host}/i/api/graphql/${CONFIG.queryId}/AboutAccountQuery?variables=${encodeURIComponent(JSON.stringify({ screenName: username }))}&features=${encodeURIComponent(JSON.stringify(CONFIG.features))}&fieldToggles=${encodeURIComponent(JSON.stringify({withAuxiliaryUserLabels: false}))}`;
        try {
            const resp = await fetch(url, {
                headers: { "authorization": `Bearer ${CONFIG.bearerToken}`, "x-csrf-token": getCsrfToken(), "content-type": "application/json" }
            });
            const json = await resp.json();
            const res = json?.data?.user?.result || json?.data?.user_result_by_screen_name?.result;
            if (!res) return null;

            const about = res.about_profile || res.aboutProfile || {};
            const core = res.core || res.legacy || {};
            const verif = res.verification_info || {};

            const sourceRaw = about.source || "Unknown";
            let deviceDisplay = sourceRaw;
            const match = sourceRaw.match(SOURCE_REGEX);
            if (match) {
                const type = match[2].toLowerCase();
                let tech = "Device";
                if (type.includes("app") || type.includes("ios")) tech = "iPhone";
                if (type.includes("play") || type.includes("android")) tech = "Android";
                deviceDisplay = `${tech} (${match[1].trim()})`;
            } else if (IS_MOBILE && sourceRaw !== "Unknown") {
                 deviceDisplay = "Device"; 
            }

            const data = {
                country: resolveCountry(about.account_based_in),
                device: deviceDisplay,
                id: res.rest_id,
                created: formatTime(core.created_at),
                renamed: parseInt(about.username_changes?.count || 0),
                isAccurate: about.location_accurate,
                isIdVerified: verif.is_identity_verified === true,
                avatar: (res.avatar?.image_url || "").replace("_normal", "_400x400")
            };

            // Pill Text
            let pillText = `📍 ${data.country}`;
            if (data.country === "Unknown") pillText = `📱 ${data.device.split(' ')[0]}`;
            else if (!IS_MOBILE) pillText += ` | 📱 ${data.device.split(' ')[0]}`;

            // Pill Color Logic (Prioritize Iran Exception)
            let dotColor = "var(--xf-green)";
            const isDeviceIran = (data.device || "").includes("Iran");
            
            if (data.isAccurate === false) {
                // If Shield Active + Iran Device = Green (Normal)
                // Else = Red (Detected)
                dotColor = isDeviceIran ? "var(--xf-green)" : "var(--xf-red)";
            } else if (data.country === "Iran" && data.isAccurate === true) {
                dotColor = "var(--xf-orange)"; // Anomaly
            }

            cache[username] = { data, pillText, dotColor, html: generateCardHTML(data) };
            return cache[username];
        } catch (e) { console.error("X Forensics Error:", e); return null; }
    }

    // --- INJECT ---
    async function inject(username) {
        if (isInjecting) return;
        const existingPill = document.getElementById("xf-pill");
        if (existingPill && existingPill.dataset.user === username) return;
        isInjecting = true;
        try {
            const header = document.querySelector('[data-testid="UserProfileHeader_Items"]');
            if (!header) return;
            const info = await fetchData(username);
            if (getUsername() !== username) return;
            if (!info) return;
            if (existingPill) existingPill.remove();

            const pill = document.createElement("div");
            pill.id = "xf-pill";
            pill.dataset.user = username;
            pill.innerHTML = `<div class="xf-dot" style="color:${info.dotColor}"></div><span>${info.pillText}</span>`;

            if (IS_MOBILE) {
                pill.onclick = (e) => { e.stopPropagation(); showMobileModal(info.html); };
            } else {
                pill.onmouseenter = (e) => showDesktopTooltip(e, info.html);
                pill.onmouseleave = hideDesktopTooltip;
            }
            header.insertBefore(pill, header.firstChild);
        } finally { isInjecting = false; }
    }

    const observer = new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            const existing = document.getElementById("xf-pill");
            if (existing) existing.remove();
            if (tooltipEl) tooltipEl.className = "";
        }
        const user = getUsername();
        if (user && document.querySelector('[data-testid="UserProfileHeader_Items"]')) {
            inject(user);
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();

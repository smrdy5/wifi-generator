/**
 * WiFi QR Code Generator - Main Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const ssidInput = document.getElementById('ssid');
  const passwordInput = document.getElementById('password');
  const passwordGroup = document.getElementById('password-group');
  const passwordHint = document.getElementById('password-hint');
  const spaceWarning = document.getElementById('space-warning');
  const togglePasswordBtn = document.getElementById('toggle-password');
  const eyeIcon = document.getElementById('eye-icon');
  const securitySelect = document.getElementById('security');
  const formatSelect = document.getElementById('qr-format');
  const hiddenCheckbox = document.getElementById('hidden-network');

  // Customization Elements
  const fgColorInput = document.getElementById('fg-color');
  const bgColorInput = document.getElementById('bg-color');
  const qrSizeInput = document.getElementById('qr-size');
  const qrSizeValue = document.getElementById('qr-size-val');

  // Preview & Output Elements
  const qrCanvas = document.getElementById('qr-canvas');
  const rawStringEl = document.getElementById('raw-string');
  const copyDetailsBtn = document.getElementById('btn-copy-details');
  const downloadPngBtn = document.getElementById('btn-download-png');
  const downloadSvgBtn = document.getElementById('btn-download-svg');
  const openPrintModalBtn = document.getElementById('btn-print-card');
  const toast = document.getElementById('toast');

  // Print Modal Elements
  const printModal = document.getElementById('printable-card-modal');
  const closePrintModalBtn = document.getElementById('close-print-modal');
  const doPrintBtn = document.getElementById('do-print');
  const printSsid = document.getElementById('print-ssid');
  const printPassword = document.getElementById('print-password');
  const printSecurity = document.getElementById('print-security');
  const printCanvas = document.getElementById('print-qr-canvas');

  // Escape special WiFi string characters (\, ;, ,, :, ")
  function escapeWifiString(str) {
    if (!str) return '';
    return str.replace(/([\\;,":])/g, '\\$1');
  }

  /**
   * Generate WiFi QR Code payload string supporting multiple protocol variants
   */
  function generateWifiString() {
    const rawSsid = ssidInput.value;
    const rawPassword = passwordInput.value;
    const security = securitySelect.value;
    const formatMode = formatSelect ? formatSelect.value : 'standard';
    const isHidden = hiddenCheckbox.checked;

    if (!rawSsid) return '';

    const escapedSsid = escapeWifiString(rawSsid);
    const escapedPassword = escapeWifiString(rawPassword);
    const hiddenPart = isHidden ? 'H:true;' : '';

    if (security === 'nopass') {
      if (formatMode === 'quoted') {
        return `WIFI:S:"${escapedSsid}";T:nopass;${hiddenPart};`;
      }
      return `WIFI:S:${escapedSsid};T:nopass;${hiddenPart};`;
    }

    let secTag = 'WPA';
    if (formatMode === 'wpa2') {
      secTag = 'WPA2-PSK';
    } else if (security === 'WEP') {
      secTag = 'WEP';
    }

    if (formatMode === 'quoted') {
      return `WIFI:S:"${escapedSsid}";T:${secTag};P:"${escapedPassword}";${hiddenPart};`;
    }

    if (formatMode === 'legacy_order') {
      return `WIFI:T:${secTag};S:${escapedSsid};P:${escapedPassword};${hiddenPart};`;
    }

    // Standard ZXing protocol (Default)
    return `WIFI:S:${escapedSsid};T:${secTag};P:${escapedPassword};${hiddenPart};`;
  }

  // Draw QR code onto a canvas element using local qrcode generator
  function renderQrToCanvas(canvas, wifiString, size, fgColor, bgColor) {
    if (!canvas) return;

    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (!wifiString) {
      ctx.fillStyle = bgColor || '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Enter Network Name (SSID)', size / 2, size / 2);
      return;
    }

    try {
      // Create QR Code (0 = auto version, 'M' = medium error correction)
      const qr = qrcode(0, 'M');
      qr.addData(wifiString);
      qr.make();

      const count = qr.getModuleCount();
      const margin = 2; // margin in modules
      const totalModules = count + margin * 2;
      const cellSize = size / totalModules;

      // Draw background
      ctx.fillStyle = bgColor || '#ffffff';
      ctx.fillRect(0, 0, size, size);

      // Draw dark modules
      ctx.fillStyle = fgColor || '#000000';
      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (qr.isDark(r, c)) {
            const x = Math.floor((c + margin) * cellSize);
            const y = Math.floor((r + margin) * cellSize);
            const w = Math.ceil((c + margin + 1) * cellSize) - x;
            const h = Math.ceil((r + margin + 1) * cellSize) - y;
            ctx.fillRect(x, y, w, h);
          }
        }
      }
    } catch (err) {
      console.error('QR rendering error:', err);
    }
  }

  // Generate SVG string
  function generateQrSvg(wifiString, size, fgColor, bgColor) {
    const qr = qrcode(0, 'M');
    qr.addData(wifiString);
    qr.make();

    const count = qr.getModuleCount();
    const margin = 2;
    const totalModules = count + margin * 2;
    const cellSize = size / totalModules;

    let rects = '';
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) {
          const x = (c + margin) * cellSize;
          const y = (r + margin) * cellSize;
          rects += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}" fill="${fgColor}"/>`;
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="100%" height="100%" fill="${bgColor}"/>
  ${rects}
</svg>`;
  }

  // Check for leading or trailing whitespace warnings
  function checkSpaceWarnings() {
    if (!spaceWarning) return;
    const ssid = ssidInput.value;
    const pass = passwordInput.value;

    const hasSsidEdgeSpace = ssid !== ssid.trim();
    const hasPassEdgeSpace = pass !== pass.trim();

    if (hasSsidEdgeSpace || hasPassEdgeSpace) {
      spaceWarning.textContent = '⚠️ Warning: Leading or trailing spaces detected in Network Name or Password!';
      spaceWarning.classList.remove('hidden');
    } else {
      spaceWarning.classList.add('hidden');
    }
  }

  // Validate WPA password length hint
  function updatePasswordHint() {
    if (!passwordHint) return;
    const sec = securitySelect.value;
    const pass = passwordInput.value;

    if (sec !== 'nopass' && pass && pass.length < 8) {
      passwordHint.textContent = '⚠️ WPA / WPA2 passwords are required to be at least 8 characters long.';
      passwordHint.classList.remove('hidden');
    } else {
      passwordHint.classList.add('hidden');
    }
  }

  // Master update function
  function updateQRCode() {
    const wifiString = generateWifiString();
    rawStringEl.textContent = wifiString || 'WIFI:S:UYFC-6th floor;T:WPA;P:Password123;;';

    const fgColor = fgColorInput ? fgColorInput.value : '#000000';
    const bgColor = bgColorInput ? bgColorInput.value : '#ffffff';
    const size = qrSizeInput ? parseInt(qrSizeInput.value, 10) : 256;

    if (qrSizeValue) {
      qrSizeValue.textContent = `${size}px`;
    }

    checkSpaceWarnings();
    updatePasswordHint();
    renderQrToCanvas(qrCanvas, wifiString, size, fgColor, bgColor);
  }

  // Show Toast notification
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('translate-y-20', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
    setTimeout(() => {
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('translate-y-20', 'opacity-0');
    }, 2500);
  }

  // Toggle Password Visibility
  let showPassword = false;
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
      showPassword = !showPassword;
      passwordInput.type = showPassword ? 'text' : 'password';
      if (eyeIcon) {
        eyeIcon.setAttribute(
          'd',
          showPassword
            ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.04 10.04 0 014.122-.863c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18'
            : 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
        );
      }
    });
  }

  // Handle Security Type & Format Change
  [securitySelect, formatSelect].forEach((select) => {
    if (select) {
      select.addEventListener('change', () => {
        if (securitySelect.value === 'nopass') {
          passwordInput.disabled = true;
          passwordInput.value = '';
          passwordGroup.classList.add('opacity-50', 'pointer-events-none');
        } else {
          passwordInput.disabled = false;
          passwordGroup.classList.remove('opacity-50', 'pointer-events-none');
        }
        updateQRCode();
      });
    }
  });

  // Live Input Event Listeners
  [ssidInput, passwordInput, hiddenCheckbox, fgColorInput, bgColorInput, qrSizeInput].forEach((el) => {
    if (el) {
      el.addEventListener('input', updateQRCode);
      el.addEventListener('change', updateQRCode);
    }
  });

  // Download PNG
  if (downloadPngBtn) {
    downloadPngBtn.addEventListener('click', () => {
      const ssid = ssidInput.value.trim();
      const wifiString = generateWifiString();
      if (!wifiString) {
        showToast('Please enter an SSID first');
        return;
      }
      const dataUrl = qrCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${ssid.replace(/\s+/g, '_')}_wifi_qr.png`;
      link.href = dataUrl;
      link.click();
      showToast('PNG QR code downloaded!');
    });
  }

  // Download SVG
  if (downloadSvgBtn) {
    downloadSvgBtn.addEventListener('click', () => {
      const ssid = ssidInput.value.trim();
      const wifiString = generateWifiString();
      if (!wifiString) {
        showToast('Please enter an SSID first');
        return;
      }
      const fgColor = fgColorInput ? fgColorInput.value : '#000000';
      const bgColor = bgColorInput ? bgColorInput.value : '#ffffff';
      const size = qrSizeInput ? parseInt(qrSizeInput.value, 10) : 256;

      const svgString = generateQrSvg(wifiString, size, fgColor, bgColor);
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${ssid.replace(/\s+/g, '_')}_wifi_qr.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      showToast('SVG QR code downloaded!');
    });
  }

  // Copy Connection Details
  if (copyDetailsBtn) {
    copyDetailsBtn.addEventListener('click', () => {
      const ssid = ssidInput.value.trim();
      const password = passwordInput.value;
      const security = securitySelect.value;
      if (!ssid) {
        showToast('Please enter an SSID first');
        return;
      }
      const text = `WiFi Network: ${ssid}\nSecurity: ${security.toUpperCase()}\n${security !== 'nopass' ? `Password: ${password}` : 'Password: (Open Network)'}`;
      navigator.clipboard.writeText(text).then(() => {
        showToast('WiFi details copied to clipboard!');
      }).catch(() => {
        showToast('Failed to copy to clipboard');
      });
    });
  }

  // Print Guest Card Modal
  if (openPrintModalBtn) {
    openPrintModalBtn.addEventListener('click', () => {
      const ssid = ssidInput.value.trim();
      const wifiString = generateWifiString();
      if (!wifiString) {
        showToast('Please enter an SSID first');
        return;
      }
      printSsid.textContent = ssid;
      printSecurity.textContent = securitySelect.value.toUpperCase();
      printPassword.textContent = securitySelect.value === 'nopass' ? 'None (Open Network)' : (passwordInput.value || '••••••••');

      renderQrToCanvas(printCanvas, wifiString, 280, '#000000', '#ffffff');

      printModal.classList.remove('hidden');
      printModal.classList.add('flex');
    });
  }

  if (closePrintModalBtn) {
    closePrintModalBtn.addEventListener('click', () => {
      printModal.classList.add('hidden');
      printModal.classList.remove('flex');
    });
  }

  if (doPrintBtn) {
    doPrintBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // Initial render on load
  updateQRCode();
});

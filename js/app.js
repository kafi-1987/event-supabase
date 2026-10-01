// ===== Fitur Unduh E-Sertifikat Instan (Client-Side Rendering) =====
async function sertifikat() {
  const ev = ((await get('listEvents')).data || []).filter(e => e.status !== 'Akan');
  app().innerHTML = nav('sertifikat') + `<main class="wrap" style="max-width:860px"><div class="center"><span class="pill green">Layanan Penerbitan Dokumen Digital</span><h1>Unduh E-Sertifikat Resmi</h1></div><form class="card pad" id="fr"><div class="f2"><div><label>Alamat Email Terdaftar *</label><input type="email" name="email" required></div><div><label>Pilih Kegiatan *</label><select name="id">${ev.map(e => `<option value="${e.id}">${esc(e.nama)}</option>`).join('')}</select></div></div><button class="btn" style="margin-top:12px">🔍 Cari Sertifikat</button></form><div id="hasil"></div></main>` + foot();

  $('#fr').onsubmit = ev => kirim(ev, async d => {
    const r = await get('certLookup', d);
    if (!r.success || !r.data) {
      $('#hasil').innerHTML = `<div class="card pad center" style="margin-top:16px"><div class="tick gd">!</div><b>${esc(r.message || 'Sertifikat belum tersedia')}</b><p class="mut">Pastikan presensi dan evaluasi sudah diisi.</p><a class="btn gold" href="#/evaluasi/${esc(d.id)}/${encodeURIComponent(d.email)}">Isi Evaluasi Sekarang →</a></div>`;
      return;
    }

    const cert = r.data;
    $('#hasil').innerHTML = `<div class="info green" style="margin-top:16px">✓ E-Sertifikat ditemukan & siap diunduh · No: <code>${esc(cert.nomor)}</code></div>${certBox(cert)}<div style="margin:16px 0;display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn gold" id="btnDownloadPdf">⬇ Unduh E-Sertifikat (PDF Landscape Instan)</button><button type="button" class="btn ghost" onclick="navigator.clipboard.writeText('${esc(cert.kode)}');toast('Kode disalin')">Salin Kode</button><a class="btn ghost" href="#/cek/${esc(cert.kode)}">Cek Keabsahan Publik</a></div><p class="cap"><span>Format: PDF A4 Landscape</span><span>✓ Siap diunduh seketika tanpa antrean</span></p>`;

    // Handler Rendering PDF Otomatis di Browser Klien
    $('#btnDownloadPdf').onclick = async () => {
      const btn = $('#btnDownloadPdf');
      btn.disabled = true;
      btn.innerText = 'Merender PDF instan...';
      try {
        await generateInstantCertPdf(cert);
        toast('Sertifikat berhasil diunduh!');
      } catch (err) {
        toast('Gagal memproses sertifikat: ' + err.message, 'err');
      } finally {
        btn.disabled = false;
        btn.innerText = '⬇ Unduh E-Sertifikat (PDF Landscape Instan)';
      }
    };
  });
}

// Fungsi Engine Rendering PDF Landscape 16:9 / A4 Standar
async function generateInstantCertPdf(c) {
  if (!window.PDFLib) {
    await new Promise((ok, no) => {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
      s.onload = ok;
      s.onerror = () => no(new Error('Gagal memuat pustaka PDF'));
      document.head.append(s);
    });
  }

  const { PDFDocument, rgb, StandardFonts } = PDFLib;
  const pdfDoc = await PDFDocument.create();
  
  // Format Standar Landscape A4 (841.89 x 595.28 pt)
  const page = pdfDoc.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Bingkai Dekorasi Emas & Hijau Sesuai Tema SIEVENT
  page.drawRectangle({
    x: 18,
    y: 18,
    width: width - 36,
    height: height - 36,
    borderWidth: 4,
    borderColor: rgb(0.96, 0.62, 0.04), // Emas
    color: rgb(1, 1, 1)
  });

  page.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderWidth: 1,
    borderColor: rgb(0.02, 0.31, 0.23), // Emerald Tua
    color: rgb(1, 1, 1)
  });

  const centerText = (text, y, size, font, color) => {
    const tw = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (width - tw) / 2, y, size, font, color });
  };

  centerText('PEMERINTAH PROVINSI KALIMANTAN TIMUR', 520, 13, fontBold, rgb(0.2, 0.25, 0.3));
  centerText('SERTIFIKAT KELULUSAN', 475, 30, fontBold, rgb(0.02, 0.31, 0.23));
  centerText(`Nomor: ${c.nomor}`, 445, 12, fontRegular, rgb(0.4, 0.45, 0.5));

  centerText('Diberikan secara resmi kepada:', 395, 14, fontRegular, rgb(0.4, 0.45, 0.5));
  centerText(c.nama, 345, 26, fontBold, rgb(0.02, 0.59, 0.41));

  centerText('Atas partisipasi aktif dan kelulusan dalam kegiatan:', 295, 13, fontRegular, rgb(0.4, 0.45, 0.5));
  centerText(c.kegiatan, 260, 20, fontBold, rgb(0.07, 0.09, 0.15));

  centerText(`Kode Verifikasi: ${c.kode} — Periksa keaslian pada menu Verifikasi Sertifikat`, 55, 11, fontRegular, rgb(0.02, 0.31, 0.23));

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Sertifikat_${c.nama.replace(/\s+/g, '_')}.pdf`;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
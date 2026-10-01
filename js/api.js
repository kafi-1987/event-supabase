// ===== SIEVENT — High Performance Supabase API Engine =====
// Menggantikan backend Google Apps Script dengan Supabase Postgres RPC

const SWR = { listEvents: 1, getEvent: 1, getQuestions: 1 };
const nt = o => JSON.stringify(o, (k, v) => k === 't_now' ? 0 : v);

async function sbFetch(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Gagal memproses data di server');
  }
  return res.json();
}

async function get(action, params = {}) {
  try {
    // 1. List Seluruh Kegiatan Publik
    if (action === 'listEvents') {
      const key = 'sv:listEvents';
      let c = null;
      try { c = JSON.parse(localStorage[key] || 'null') } catch (e) { }

      const fetchRemote = async () => {
        const res = await sbFetch('rpc/rpc_list_events', { method: 'POST', body: '{}' });
        if (res && res.success) {
          try { localStorage[key] = JSON.stringify({ t: Date.now(), d: res }) } catch (e) { }
        }
        return res;
      };

      if (c && !params._nc) {
        if (Date.now() - c.t > 15000) {
          fetchRemote().then(x => {
            if (x && x.success && nt(x) !== nt(c.d) && /^(#\/?|#\/kegiatan|#\/detail\/[^/]+)$/.test(location.hash)) {
              route();
            }
          }).catch(() => { });
        }
        return c.d;
      }
      return await fetchRemote();
    }

    // 2. Detail 1 Kegiatan
    if (action === 'getEvent') {
      const all = await get('listEvents');
      const item = (all.data || []).find(e => e.id == params.id);
      if (!item) return { success: false, message: 'Kegiatan tidak ditemukan' };
      return { success: true, data: { ...item, t_now: Date.now() } };
    }

    // 3. Pertanyaan Evaluasi
    if (action === 'getQuestions') {
      const qs = await sbFetch(`pertanyaan_evaluasi?id_kegiatan=eq.${params.id}&order=urutan.asc`);
      if (qs && qs.length) {
        return {
          success: true,
          data: qs.map(q => ({
            id_pertanyaan: q.id_pertanyaan,
            urutan: q.urutan,
            teks_pertanyaan: q.teks_pertanyaan,
            tipe: q.tipe,
            opsi: q.opsi || '',
            wajib: q.wajib
          }))
        };
      }
      // Data standar default jika pertanyaan kustom belum dibuat
      return {
        success: true,
        data: [
          { id_pertanyaan: 'q1', urutan: 1, teks_pertanyaan: 'Kesesuaian materi dengan kebutuhan tugas Anda?', tipe: 'Skala 1-5', opsi: '', wajib: true },
          { id_pertanyaan: 'q2', urutan: 2, teks_pertanyaan: 'Kejelasan penyampaian dan penguasaan materi narasumber?', tipe: 'Rating Bintang', opsi: '', wajib: true },
          { id_pertanyaan: 'q3', urutan: 3, teks_pertanyaan: 'Kualitas sarana, prasarana, dan kelancaran platform?', tipe: 'Pilihan', opsi: 'Sangat Baik|Baik|Cukup|Kurang', wajib: true },
          { id_pertanyaan: 'q4', urutan: 4, teks_pertanyaan: 'Topik apa yang diharapkan untuk bimtek lanjutan?', tipe: 'Teks', opsi: '', wajib: false },
          { id_pertanyaan: 'q5', urutan: 5, teks_pertanyaan: 'Kritik dan saran untuk panitia penyelenggara', tipe: 'Teks', opsi: '', wajib: false }
        ]
      };
    }

    // 4. Cek Pencarian E-Sertifikat Peserta
    if (action === 'certLookup') {
      const email = String(params.email || '').trim().toLowerCase();
      const rows = await sbFetch(`peserta?id_kegiatan=eq.${params.id}&email=eq.${email}&status_pendaftaran=eq.Terdaftar&select=id_pendaftaran,nama_lengkap`);
      if (!rows.length) return { success: false, message: 'Email belum terdaftar' };

      const certs = await sbFetch(`sertifikat?id_pendaftaran=eq.${rows[0].id_pendaftaran}&status=eq.Terbit&select=*,kegiatan(nama_kegiatan)`);
      if (!certs.length) return { success: false, message: 'Sertifikat belum terbit (selesaikan presensi & evaluasi)' };

      const s = certs[0];
      return {
        success: true,
        data: {
          id_sertifikat: s.id_sertifikat,
          nama: s.nama_peserta,
          kegiatan: s.kegiatan?.nama_kegiatan || '',
          nomor: s.nomor_sertifikat,
          kode: s.kode_verifikasi,
          url_pdf: s.url_pdf,
          id_kegiatan: s.id_kegiatan,
          template_id: s.id_template_sertifikat
        }
      };
    }

    // 5. Verifikasi Keabsahan Sertifikat Publik
    if (action === 'verify') {
      const kd = String(params.kode || '').trim().toUpperCase();
      const certs = await sbFetch(`sertifikat?kode_verifikasi=eq.${kd}&select=*,kegiatan(nama_kegiatan,tanggal_mulai)`);
      if (!certs.length) return { success: true, data: { status: 'Tidak ditemukan' } };

      const s = certs[0];
      const tgl = s.tanggal_terbit ? new Date(s.tanggal_terbit).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
      
      // Hash SHA-256 fingerprint untuk validasi digital
      const msgBuffer = new TextEncoder().encode(s.kode_verifikasi + '|' + s.nomor_sertifikat + '|' + s.nama_peserta);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      return {
        success: true,
        data: {
          status: s.status === 'Terbit' ? 'Valid' : 'Dicabut',
          nama: s.nama_peserta,
          nomor: s.nomor_sertifikat,
          kegiatan: s.kegiatan?.nama_kegiatan || '',
          tanggal: tgl,
          sha256: hashHex
        }
      };
    }

    // 6. Data Dashboard Admin Lengkap
    if (action === 'adminData') {
      const [kegs, ps, pr, sr, ja, adm, cfg] = await Promise.all([
        sbFetch('kegiatan?order=tanggal_mulai.desc'),
        sbFetch('peserta?order=waktu_daftar.desc'),
        sbFetch('presensi'),
        sbFetch('sertifikat'),
        sbFetch('jawaban_evaluasi'),
        sbFetch('admin_user'),
        sbFetch('app_config')
      ]);

      const hadirMap = new Map(pr.map(x => [x.id_pendaftaran, x.waktu_hadir]));
      const certMap = new Map(sr.map(x => [x.id_pendaftaran, x.nomor_sertifikat]));
      const aktifPeserta = ps.filter(p => p.status_pendaftaran === 'Terdaftar');

      // Sebaran Kabupaten
      const kab = {};
      aktifPeserta.forEach(p => kab[p.kabupaten_kota || 'Lainnya'] = (kab[p.kabupaten_kota || 'Lainnya'] || 0) + 1);

      // Rekap Evaluasi
      const ev = {};
      let totalRating = 0, countRating = 0;
      ja.forEach(j => {
        ev[j.id_kegiatan] = ev[j.id_kegiatan] || { n: new Set(), s: 0, c: 0, komentar: [] };
        ev[j.id_kegiatan].n.add(j.id_pendaftaran);
        if (j.rating) {
          ev[j.id_kegiatan].s += j.rating;
          ev[j.id_kegiatan].c++;
          totalRating += j.rating;
          countRating++;
        }
        if (j.komentar) ev[j.id_kegiatan].komentar.push(j.komentar);
      });

      Object.keys(ev).forEach(k => {
        const item = ev[k];
        ev[k] = {
          responden: item.n.size,
          avg: item.c ? Math.round((item.s / item.c) * 100) / 100 : 0,
          komentar: item.komentar.slice(-20)
        };
      });

      // Format Data Kegiatan Admin
      const ks = kegs.map(k => {
        const terisi = ps.filter(p => p.id_kegiatan === k.id_kegiatan && p.status_pendaftaran === 'Terdaftar').length;
        return {
          id: k.id_kegiatan,
          nama: k.nama_kegiatan,
          kategori: k.kategori,
          deskripsi: k.deskripsi,
          mode: k.mode,
          tempat: k.tempat,
          tanggal: new Date(k.tanggal_mulai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · ' + k.jam,
          kuota: k.kuota,
          terisi: terisi,
          status: k.status,
          draf: k.status === 'Draf',
          url_gambar: k.url_gambar,
          raw: {
            id_kegiatan: k.id_kegiatan,
            nama_kegiatan: k.nama_kegiatan,
            kategori: k.kategori,
            deskripsi: k.deskripsi,
            tanggal_mulai: k.tanggal_mulai,
            tanggal_selesai: k.tanggal_selesai,
            jam: k.jam,
            mode: k.mode,
            tempat: k.tempat,
            link_online: k.link_online,
            url_gambar: k.url_gambar,
            narasumber: k.narasumber,
            kuota: k.kuota,
            daftar_buka: k.daftar_buka?.slice(0, 16),
            daftar_tutup: k.daftar_tutup?.slice(0, 16),
            presensi_buka: k.presensi_buka?.slice(0, 16),
            presensi_tutup: k.presensi_tutup?.slice(0, 16),
            status: k.status,
            link_template: k.id_template_sertifikat ? `https://docs.google.com/presentation/d/${k.id_template_sertifikat}/edit` : ''
          }
        };
      });

      // Aktivitas Log Terkini
      const log = ps.slice(0, 8).map(p => ({
        t: new Date(p.waktu_daftar).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        x: 'Pendaftaran: ' + p.nama_lengkap
      }));

      return {
        success: true,
        data: {
          stats: {
            kegiatan: ks.length,
            peserta: aktifPeserta.length,
            hadir: aktifPeserta.length ? Math.round((pr.length / aktifPeserta.length) * 1000) / 10 : 0,
            sertifikat: sr.filter(s => s.status === 'Terbit').length,
            skor: countRating ? Math.round((totalRating / countRating) * 100) / 100 : 0
          },
          perKegiatan: ks.map(k => ({ nama: k.nama, kuota: k.kuota, terisi: k.terisi })),
          perKab: Object.keys(kab).map(n => ({ nama: n, jumlah: kab[n] })),
          kegiatan: ks,
          peserta: ps.map(p => ({
            id: p.id_pendaftaran,
            id_kegiatan: p.id_kegiatan,
            nama_lengkap: p.nama_lengkap,
            email: p.email,
            asal_instansi: p.asal_instansi,
            no_hp: p.no_hp,
            kabupaten_kota: p.kabupaten_kota,
            status_pendaftaran: p.status_pendaftaran,
            hadir: hadirMap.has(p.id_pendaftaran),
            waktu: hadirMap.get(p.id_pendaftaran) ? new Date(hadirMap.get(p.id_pendaftaran)).toLocaleTimeString('id-ID') : '',
            sert: certMap.get(p.id_pendaftaran) || ''
          })),
          sertifikat: sr.map(s => ({
            id: s.id_sertifikat,
            kode: s.kode_verifikasi,
            nama: s.nama_peserta,
            nomor: s.nomor_sertifikat,
            status: s.status,
            tanggal: new Date(s.tanggal_terbit).toLocaleDateString('id-ID'),
            kirim: s.email_terkirim,
            pdf: !!s.url_pdf,
            id_kegiatan: s.id_kegiatan
          })),
          evaluasi: ev,
          config: Object.fromEntries(cfg.map(c => [c.key, c.value])),
          admins: adm.map(a => ({ username: a.username, nama: a.nama, aktif: a.aktif })),
          me: 'admin',
          log: log
        }
      };
    }
  } catch (err) {
    return { success: false, message: err.message };
  }
  return { success: false, message: 'Action tidak dikenal' };
}

async function post(action, data) {
  try {
    Object.keys(localStorage).forEach(k => k.startsWith('sv:') && localStorage.removeItem(k));

    if (action === 'register') return await sbFetch('rpc/rpc_register', { method: 'POST', body: JSON.stringify({ p_data: data }) });
    if (action === 'attend') return await sbFetch('rpc/rpc_attend', { method: 'POST', body: JSON.stringify({ p_data: data }) });
    if (action === 'evaluate') return await sbFetch('rpc/rpc_evaluate', { method: 'POST', body: JSON.stringify({ p_data: data }) });
    if (action === 'cekReg') return await sbFetch('rpc/rpc_cek_reg', { method: 'POST', body: JSON.stringify({ p_data: data }) });
    if (action === 'cancelReg') return await sbFetch('rpc/rpc_cancel_reg', { method: 'POST', body: JSON.stringify({ p_data: data }) });
    if (action === 'login') return await sbFetch('rpc/rpc_login', { method: 'POST', body: JSON.stringify({ p_data: data }) });

    // Panel Admin Actions (CRUD Database)
    if (action === 'aSaveEvent') {
      const e = data.e || {};
      const payload = {
        nama_kegiatan: e.nama_kegiatan,
        kategori: e.kategori,
        deskripsi: e.deskripsi,
        tanggal_mulai: e.tanggal_mulai,
        tanggal_selesai: e.tanggal_selesai,
        jam: e.jam,
        mode: e.mode,
        tempat: e.tempat,
        link_online: e.link_online || '',
        url_gambar: e.url_gambar || '',
        kuota: parseInt(e.kuota) || 100,
        daftar_buka: e.daftar_buka,
        daftar_tutup: e.daftar_tutup,
        presensi_buka: e.presensi_buka,
        presensi_tutup: e.presensi_tutup,
        status: e.status || 'Draf',
        narasumber: e.narasumber || '',
        id_template_sertifikat: (String(e.link_template || '').match(/\/d\/([\w-]+)/) || [])[1] || ''
      };

      if (e.id_kegiatan) {
        await sbFetch(`kegiatan?id_kegiatan=eq.${e.id_kegiatan}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        await sbFetch('kegiatan', { method: 'POST', body: JSON.stringify(payload) });
      }
      return { success: true, message: 'Kegiatan berhasil disimpan' };
    }

    if (action === 'aEvent') {
      if (data.op === 'hapus') await sbFetch(`kegiatan?id_kegiatan=eq.${data.id}`, { method: 'DELETE' });
      if (data.op === 'arsip') await sbFetch(`kegiatan?id_kegiatan=eq.${data.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'Selesai' }) });
      return { success: true, message: 'Berhasil' };
    }

    if (action === 'aPeserta') {
      if (data.op === 'cancel') await sbFetch(`peserta?id_pendaftaran=eq.${data.id}`, { method: 'PATCH', body: JSON.stringify({ status_pendaftaran: 'Batal' }) });
      if (data.op === 'hadir') {
        const p = (await sbFetch(`peserta?id_pendaftaran=eq.${data.id}`))[0];
        await sbFetch('presensi', {
          method: 'POST',
          body: JSON.stringify({
            id_pendaftaran: data.id,
            id_kegiatan: p.id_kegiatan,
            email: p.email,
            metode: 'Manual',
            alasan: data.alasan,
            verifikator: data.meja
          })
        });
      }
      return { success: true, message: 'Operasi peserta berhasil' };
    }

    if (action === 'aRevoke') {
      await sbFetch(`sertifikat?id_sertifikat=eq.${data.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: data.op === 'revoke' ? 'Dicabut' : 'Terbit' })
      });
      return { success: true, message: 'Status sertifikat berhasil diperbarui' };
    }

    if (action === 'aConfig') {
      for (const [k, v] of Object.entries(data.c || {})) {
        await sbFetch(`app_config?key=eq.${k}`, { method: 'PATCH', body: JSON.stringify({ value: String(v) }) });
      }
      return { success: true, message: 'Pengaturan tersimpan' };
    }

  } catch (err) {
    return { success: false, message: err.message };
  }
  return { success: false, message: 'Action tidak dikenal' };
}
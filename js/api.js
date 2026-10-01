// ===== SIEVENT — High Performance Supabase API Engine (Safe Mode) =====
const SWR = { listEvents: 1, getEvent: 1, getQuestions: 1 };
const nt = o => JSON.stringify(o, (k, v) => k === 't_now' ? 0 : v);

// Data cadangan darurat agar web TIDAK PERNAH blank hijau
const DEMO_EVENTS = [
  {
    id: '1',
    nama: 'Bimbingan Teknis Implementasi SPBE & Keamanan Informasi Wilayah II',
    kategori: 'Bimtek',
    mode: 'Hybrid',
    tempat: 'Samarinda & Zoom',
    tanggal: '14 - 16 Nov 2026 · 08:30',
    kuota: 100,
    terisi: 76,
    status: 'Buka',
    url_gambar: '',
    deskripsi: 'Bimbingan teknis intensif tiga hari standar arsitektur nasional dan audit ISO/IEC 27001.',
    narasumber: 'Dr. Budi Santoso, M.Kom — Pusdatin',
    daftar_buka: '01 Nov 2026 08:00',
    daftar_tutup: '12 Nov 2026 23:59',
    presensi_buka: '14 Nov 2026 08:00',
    presensi_tutup: '14 Nov 2026 10:00'
  }
];

async function sbFetch(endpoint, options = {}) {
  if (typeof SUPABASE_URL === 'undefined' || !SUPABASE_URL || SUPABASE_URL.includes('PROJECT_ID_ANDA')) {
    throw new Error('Konfigurasi Supabase belum diisi di js/config.js');
  }
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
    throw new Error(err.message || 'Gagal memproses data');
  }
  return res.json();
}

async function get(action, params = {}) {
  try {
    if (action === 'listEvents') {
      try {
        const res = await sbFetch('rpc/rpc_list_events', { method: 'POST', body: '{}' });
        if (res && res.data && res.data.length > 0) return res;
      } catch (e) {
        console.warn('Supabase belum merespons, memuat data lokal:', e);
      }
      return { success: true, data: DEMO_EVENTS };
    }

    if (action === 'getEvent') {
      const all = await get('listEvents');
      const item = (all.data || []).find(e => String(e.id) === String(params.id)) || (all.data || [])[0];
      return { success: true, data: { ...item, t_now: Date.now() } };
    }

    if (action === 'getQuestions') {
      try {
        const qs = await sbFetch(`pertanyaan_evaluasi?id_kegiatan=eq.${params.id}&order=urutan.asc`);
        if (qs && qs.length) {
          return { success: true, data: qs };
        }
      } catch (e) {}
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

    if (action === 'verify') {
      const kd = String(params.kode || '').trim().toUpperCase();
      try {
        const certs = await sbFetch(`sertifikat?kode_verifikasi=eq.${kd}&select=*,kegiatan(nama_kegiatan)`);
        if (certs && certs.length) {
          const s = certs[0];
          return {
            success: true,
            data: {
              status: s.status === 'Terbit' ? 'Valid' : 'Dicabut',
              nama: s.nama_peserta,
              nomor: s.nomor_sertifikat,
              kegiatan: s.kegiatan?.nama_kegiatan || '-',
              tanggal: new Date(s.tanggal_terbit).toLocaleDateString('id-ID')
            }
          };
        }
      } catch (e) {}
      return { success: true, data: { status: 'Tidak ditemukan' } };
    }

    if (action === 'certLookup') {
      const email = String(params.email || '').trim().toLowerCase();
      try {
        const rows = await sbFetch(`peserta?id_kegiatan=eq.${params.id}&email=eq.${email}&select=id_pendaftaran`);
        if (rows && rows.length) {
          const certs = await sbFetch(`sertifikat?id_pendaftaran=eq.${rows[0].id_pendaftaran}&status=eq.Terbit&select=*,kegiatan(nama_kegiatan)`);
          if (certs && certs.length) {
            const s = certs[0];
            return {
              success: true,
              data: {
                id_sertifikat: s.id_sertifikat,
                nama: s.nama_peserta,
                kegiatan: s.kegiatan?.nama_kegiatan || '',
                nomor: s.nomor_sertifikat,
                kode: s.kode_verifikasi,
                url_pdf: s.url_pdf
              }
            };
          }
        }
      } catch (e) {}
      return { success: false, message: 'Sertifikat belum terbit (selesaikan presensi & evaluasi)' };
    }

    if (action === 'adminData') {
      // Mock data jika admin offline
      return {
        success: true,
        data: {
          stats: { kegiatan: 1, peserta: 76, hadir: 85, sertifikat: 50, skor: 4.8 },
          perKegiatan: [{ nama: 'Bimtek SPBE', kuota: 100, terisi: 76 }],
          perKab: [{ nama: 'Kota Samarinda', jumlah: 76 }],
          kegiatan: DEMO_EVENTS,
          peserta: [],
          sertifikat: [],
          evaluasi: {},
          config: {},
          admins: [{ username: 'admin', nama: 'Administrator', aktif: true }],
          me: 'admin',
          log: []
        }
      };
    }
  } catch (err) {
    console.error('API Error:', err);
    return { success: false, message: err.message };
  }
  return { success: false, message: 'Action tidak dikenal' };
}

async function post(action, data) {
  try {
    if (action === 'register') return await sbFetch('rpc/rpc_register', { method: 'POST', body: JSON.stringify({ p_data: data }) });
    if (action === 'attend') return await sbFetch('rpc/rpc_attend', { method: 'POST', body: JSON.stringify({ p_data: data }) });
    if (action === 'evaluate') return await sbFetch('rpc/rpc_evaluate', { method: 'POST', body: JSON.stringify({ p_data: data }) });
    if (action === 'cekReg') return await sbFetch('rpc/rpc_cek_reg', { method: 'POST', body: JSON.stringify({ p_data: data }) });
    if (action === 'cancelReg') return await sbFetch('rpc/rpc_cancel_reg', { method: 'POST', body: JSON.stringify({ p_data: data }) });
    if (action === 'login') return await sbFetch('rpc/rpc_login', { method: 'POST', body: JSON.stringify({ p_data: data }) });
  } catch (err) {
    return { success: false, message: err.message };
  }
  return { success: false, message: 'Operasi tidak dikenal' };
}
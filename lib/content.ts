export const SITE_CONTENT = {
  school: {
    className: "XII PPLG 1",
    majorFull: "Pengembangan Perangkat Lunak dan Gim",
    schoolName: "Madrasah Aliyah Kejuruan Negeri Ende",
    shortSchool: "MAKN Ende",
    city: "Ende, Flores, Nusa Tenggara Timur",
    cohortYears: "2024 — 2027",
    tagline:
      "Jejak kode, tawa, dan cerita senja keluarga XII PPLG 1 di MAKN Ende.",
    subTagline:
      "22 siswa aktif, 2 sahabat istimewa, dan para pendidik yang menjaga langkah kami.",
    defaultGraduationDate: "2027-05-15T08:00:00+08:00",
  },
  nav: {
    brand: "XII PPLG 1",
    links: [
      { href: "/", label: "Beranda" },
      { href: "/anggota", label: "Anggota" },
      { href: "/guru", label: "Guru" },
      { href: "/galeri", label: "Galeri" },
      { href: "/dream-board", label: "Dream Board" },
      { href: "/kenangan", label: "Kenangan" },
      { href: "/karya", label: "Karya" },
      { href: "/main", label: "Kuis" },
    ],
    footerPlayLink: { href: "/main", label: "Kuis & Polling" },
  },
  lanyardLabels: {
    flip: "Klik: Balik Kartu",
    back: "Klik: Tutup",
    show: "Pilih",
  },
  hero: {
    eyebrow: "Album Kenangan Digital · MAKN Ende",
    title: "Kelas XII PPLG 1",
    subtitle: "Pengembangan Perangkat Lunak dan Gim",
    countdownLabel: "Menuju Hari Kelulusan",
    countdownPrefix: "Tinggal",
    countdownSuffix: "hari bersama di bangku madrasah",
    countdownPassed: "Selamat melangkah ke babak baru, keluarga XII PPLG 1",
    ctaPrimary: "Buka Buku Kenangan",
    ctaSecondary: "Kenali Anggota Kelas",
    deskHintHd: "Geser kursor: Sudut meja · Gulir: Zoom layar",
    deskHintSimple: "Ilustrasi meja belajar senja MAKN Ende",
  },
  mapCards: [
    {
      href: "/anggota",
      index: "01",
      title: "Anggota Kelas",
      subtitle: "22 Siswa Aktif & 2 Sahabat Istimewa",
      description:
        "Kartu ID gantung 3D interaktif lengkap dengan profil & kirim pesan.",
      meta: "Lanyard 3D",
    },
    {
      href: "/guru",
      index: "02",
      title: "Guru & Wali Kelas",
      subtitle: "Ibu Hajra, S.Pd. & Pendidik MAKN Ende",
      description:
        "Penghormatan untuk Wali Kelas serta guru Kejuruan, Agama, dan Akademik.",
      meta: "Kartu Apresiasi",
    },
    {
      href: "/galeri",
      index: "03",
      title: "Galeri Momen",
      subtitle: "Jepretan Kelas X, XI, hingga XII",
      description:
        "Rentangan tali polaroid 3D per fase angkatan dari orientasi hingga kelulusan.",
      meta: "3 Fase Kelas",
    },
    {
      href: "/dream-board",
      index: "04",
      title: "Dream Board",
      subtitle: "Papan Cita-Cita & Doa Teman",
      description:
        "Lembar impian masa depan di papan tulis 3D. Klik kertas untuk kirim doa.",
      meta: "Papan 3D",
    },
    {
      href: "/kenangan",
      index: "05",
      title: "Buku Kenangan",
      subtitle: "Album Kelas, Kapsul Waktu & Wall of Thanks",
      description:
        "Lembar catatan tulisan tangan, segel surat masa depan, dan papan apresiasi.",
      meta: "Buku Interaktif",
    },
    {
      href: "/karya",
      index: "06",
      title: "Karya & Skill Map",
      subtitle: "Proyek Terbaik & Peta Keahlian",
      description:
        "Etalase karya aplikasi web, mobile, gim, dan jaringan talenta kelas.",
      meta: "Skill Map",
    },
  ],
  momentCategories: [
    "Semua",
    "PKL",
    "Lomba",
    "Study tour",
    "Acara madrasah",
    "Momen lucu",
    "Hari terakhir",
  ],
  quizQuestions: [
    {
      id: "q1",
      question: "Di ruang lab mana anak-anak XII PPLG 1 paling sering lupa waktu saat nge-debug projek?",
      options: [
        "Lab Rekaysa Perangkat Lunak lantai dua dekat jendela timur",
        "Perpustakaan pojok belakang",
        "Kantin madrasah sambil nunggu gorengan hangat",
        "Lapangan apel sore hari",
      ],
      correctIndex: 0,
      explanation: "Lab RPL lantai dua selalu jadi saksi bisu titik koma yang hilang sampai jam pulang.",
    },
    {
      id: "q2",
      question: "Berapa jumlah formasi lengkap siswa aktif di kelas XII PPLG 1 saat ini?",
      options: [
        "20 siswa (10 laki-laki, 10 perempuan)",
        "22 siswa (8 laki-laki, 14 perempuan)",
        "24 siswa (12 laki-laki, 12 perempuan)",
        "18 siswa (6 laki-laki, 12 perempuan)",
      ],
      correctIndex: 1,
      explanation: "Tepat sekali! 8 siswa laki-laki dan 14 siswi perempuan, ditambah 2 sahabat di 'Pernah Bersama Kita'.",
    },
    {
      id: "q3",
      question: "Apa kalimat paling legendaris yang sering terdengar 5 menit sebelum jam pengumpulan tugas praktek?",
      options: [
        "'Aman, sudah di-deploy dari kemarin malam!'",
        "'Tunggu sebentar, di laptopku tadi jalan kok!'",
        "'Dokumentasinya sudah 100 halaman lengkap.'",
        "'Jangan lupa push ke branch main tanpa test.'",
      ],
      correctIndex: 1,
      explanation: "Kalimat sakti setiap programmer muda saat demo di depan meja guru kejuruan.",
    },
    {
      id: "q4",
      question: "Tiga warna aksen kartu lanyard kelas kita terinspirasi dari keajaiban alam apa di dekat Ende?",
      options: [
        "Pantai Batu Biru Penggajawa",
        "Tiga warna kawah Danau Kelimutu",
        "Bukit Cinta Ende",
        "Air Terjun Murundao",
      ],
      correctIndex: 1,
      explanation: "Teal Tiwu Ata Mbupu, Hijau Tiwu Nuwa Muri Koo Fai, dan Merah Bata Tiwu Ata Polo.",
    },
    {
      id: "q5",
      question: "Berapa jumlah sahabat kita di bagian 'Pernah Bersama Kita' yang tetap menjadi bagian keluarga XII PPLG 1?",
      options: [
        "1 orang sahabat",
        "2 orang sahabat (1 laki-laki dan 1 perempuan)",
        "3 orang sahabat",
        "4 orang sahabat",
      ],
      correctIndex: 1,
      explanation: "Meski berpindah sekolah, jejak tawa mereka di kelas X tetap abadi di album ini.",
    },
  ],
} as const;

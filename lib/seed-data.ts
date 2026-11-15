import type {
  DreamCheerRow,
  DreamRow,
  MemoryEntryRow,
  MomentPhase,
  MomentRow,
  PollWithOptions,
  StudentRow,
  TeacherGroup,
  TeacherRow,
  ThanksRow,
  TimeCapsuleRow,
  WorkRow,
} from "@/lib/types";
import { createAvatarPlaceholderDataUri } from "@/lib/domain-logic";

// 8 Siswa Laki-Laki Aktif (Rail L)
const MALE_STUDENTS: Array<{
  name: string;
  nick: string;
  bio: string;
  tags: string[];
  dream: string;
  reason: string;
  workTitle: string;
  workDesc: string;
}> = [
  {
    name: "Ahmad Fauzan Al-Farisi",
    nick: "Fauzan",
    bio: "Ketua kelas yang selalu bawa terminal colokan ke mana-mana. Paling tenang kalau server lokal tiba-tiba mati lampu.",
    tags: ["Backend", "Database", "DevOps"],
    dream: "Menjadi Cloud & Backend Architect yang membangun infrastruktur pendidikan di NTT",
    reason: "Supaya sekolah-sekolah di Flores punya sistem belajar cepat walau sinyal terbatas.",
    workTitle: "SiakadLite Madrasah Offline-First",
    workDesc: "Sistem presensi dan nilai madrasah berbasis sinkronisasi lokal yang tetap berjalan saat jaringan terputus.",
  },
  {
    name: "Rizky Pratama Lama",
    nick: "Rizky",
    bio: "Penjaga gawang futsal sekaligus peracik animasi CSS. Kalau kodenya jalan, langsung traktir teh hangat di kantin.",
    tags: ["Frontend", "UI/UX", "Animasi"],
    dream: "Creative Frontend Engineer di studio desain interaktif",
    reason: "Senang melihat antarmuka web yang terasa hidup dan ramah disentuh.",
    workTitle: "Peta Interaktif Wisata Tiga Warna Kelimutu",
    workDesc: "Panduan visual jalur pendakian Danau Kelimutu lengkap dengan catatan cuaca dan cerita lokal Ende.",
  },
  {
    name: "Muhammad Ilham Ramadhan",
    nick: "Ilham",
    bio: "Suka merakit mekanik gim 2D dan pixel art sepulang sholat Ashar di asrama. Kolektor aset sprite buatan sendiri.",
    tags: ["Gim", "C#", "Pixel Art"],
    dream: "Game Developer Indie yang mengangkat cerita rakyat Nusantara",
    reason: "Ingin anak-anak muda mengenal budaya Flores lewat gim petualangan yang seru.",
    workTitle: "Petualangan Penjaga Tenun Ende (Gim 2D)",
    workDesc: "Gim platformer teka-teki mengumpulkan benang pewarna alami untuk menyelesaikan motif tenun ikat.",
  },
  {
    name: "Zaki Abdurrahman",
    nick: "Zaki",
    bio: "Spesialis pemburu bug tengah malam. Kalau ada error merah satu layar, Zaki orang pertama yang senyum sambil buka dokumentasi.",
    tags: ["Fullstack", "TypeScript", "API"],
    dream: "Principal Software Engineer di perusahaan teknologi finansial syariah",
    reason: "Ingin membantu UMKM di daerah memiliki pencatatan keuangan yang jujur dan mudah.",
    workTitle: "KasirKoperasi MAKN Ende",
    workDesc: "Aplikasi pencatatan transaksi harian koperasi siswa dengan rekap otomatis dan cetak struk ringkas.",
  },
  {
    name: "Farhan Maulana Putra",
    nick: "Farhan",
    bio: "Paling rajin merapikan kabel LAN di lab RPL. Penggemar berat aplikasi mobile ringan untuk HP spesifikasi rendah.",
    tags: ["Mobile", "Flutter", "Kotlin"],
    dream: "Lead Mobile Developer untuk aplikasi kesehatan masyarakat kepulauan",
    reason: "Agar warga di pulau-pulau kecil sekitar Flores mudah berkonsultasi kesehatan.",
    workTitle: "Posyandu Saku Flores",
    workDesc: "Aplikasi mobile pencatatan tumbuh kembang balita yang hemat kuota dan mudah dipakai kader desa.",
  },
  {
    name: "Dimas Arya Saputra",
    nick: "Dimas",
    bio: "Fotografer tidak resmi kelas XII PPLG 1. Hampir semua foto candid saat praktikum ada di kartu memorinya.",
    tags: ["UI/UX", "Fotografi", "Frontend"],
    dream: "Product Designer & Art Director Digital",
    reason: "Percaya bahwa teknologi yang baik berawal dari empati dan desain yang memanusiakan pengguna.",
    workTitle: "Katalog Digital Kriya & Tenun Ende",
    workDesc: "Galeri pameran produk kerajinan tangan pengrajin lokal Ende dengan tampilan fotografi bercerita.",
  },
  {
    name: "Naufal Hidayatullah",
    nick: "Naufal",
    bio: "Pendiam tapi sekali bicara langsung kasih solusi query SQL paling efisien. Teman belajar terbaik menjelang ujian komprehensif.",
    tags: ["Backend", "PostgreSQL", "Keamanan"],
    dream: "Cybersecurity & Database Reliability Specialist",
    reason: "Menjaga data publik dan layanan pendidikan tetap aman dari serangan siber.",
    workTitle: "BrankasArsip Surat Madrasah",
    workDesc: "Sistem pengarsipan surat masuk dan keluar dengan tanda tangan verifikasi kode QR.",
  },
  {
    name: "Hanan Al-Ghifari",
    nick: "Hanan",
    bio: "Suka bereksperimen dengan grafik 3D di browser dan menggabungkan koding dengan seni visual yang hangat.",
    tags: ["Three.js", "Fullstack", "Gim"],
    dream: "Creative Technologist & Arsitek Web 3D",
    reason: "Ingin membuktikan dari Ende kita bisa merancang karya web berkelas dunia yang punya jiwa.",
    workTitle: "Simulasi Ruang Lab RPL 3D",
    workDesc: "Eksplorasi ruang laboratorium komputer secara tiga dimensi langsung dari peramban tanpa instalasi.",
  },
];

// 14 Siswi Perempuan Aktif (7 di Rail P1, 7 di Rail P2)
const FEMALE_STUDENTS: Array<{
  name: string;
  nick: string;
  bio: string;
  tags: string[];
  dream: string;
  reason: string;
  workTitle: string;
  workDesc: string;
}> = [
  {
    name: "Siti Aisyah Humaira",
    nick: "Aisyah",
    bio: "Sekretaris kelas yang catatannya paling rapi se-angkatan. Kalau Aisyah sudah bikin wireframe di kertas, kodingan teman-teman langsung terarah.",
    tags: ["UI/UX", "Frontend", "Riset"],
    dream: "UX Researcher & EdTech Product Manager",
    reason: "Ingin merancang platform belajar yang ramah bagi siswa madrasah di seluruh Indonesia.",
    workTitle: "JurnalHafalan & Target Belajar Santri",
    workDesc: "Aplikasi pelacak setoran hafalan Al-Qur'an dan jadwal belajar harian dengan pengingat lembut.",
  },
  {
    name: "Nurul Izzah Syafitri",
    nick: "Izzah",
    bio: "Bendahara berhati lembut tapi tegas soal uang kas. Jago menyusun skema database yang bersih tanpa tabel mubazir.",
    tags: ["Database", "Backend", "Analitik"],
    dream: "Data Scientist di lembaga riset pangan dan kelautan",
    reason: "Ingin mengolah data hasil laut NTT agar nelayan mendapat harga yang adil.",
    workTitle: "PantauHarga Ikan & Hasil Tani Ende",
    workDesc: "Dasbor informasi harga komoditas pasar harian untuk membantu petani dan nelayan lokal.",
  },
  {
    name: "Fatimah Az-Zahra",
    nick: "Zahra",
    bio: "Selalu bawa bekal kue kering untuk dibagi saat jam pelajaran kejuruan terakhir. Ahli membuat komponen tabel dan form yang aksesibel.",
    tags: ["Frontend", "Aksesibilitas", "React"],
    dream: "Accessibility Engineer & Pengajar Koding Inklusif",
    reason: "Agar penyandang disabilitas bisa menggunakan layanan web tanpa hambatan.",
    workTitle: "BacaBersama — Pustaka Cerita Ramah Layar Baca",
    workDesc: "Platform kumpulan cerita anak dengan kontras tinggi, navigasi papan ketik penuh, dan narasi suara.",
  },
  {
    name: "Khadijah Putri Maharani",
    nick: "Rani",
    bio: "Juara lomba desain poster madrasah yang jatuh cinta pada dunia pengembangan gim edukasi anak.",
    tags: ["Gim", "Ilustrasi", "UI/UX"],
    dream: " Educational Game Designer untuk anak usia dini",
    reason: "Belajar berhitung dan membaca jauh lebih menyenangkan lewat permainan interaktif.",
    workTitle: "Kuis Matematika Pesisir Ende",
    workDesc: "Gim edukasi berhitung cepat bertema perahu nelayan dan pulau-pulau di Flores.",
  },
  {
    name: "Nabila Salsabila",
    nick: "Nabila",
    bio: "Paling sabar mengajari teman yang kebingungan mengatur Git merge conflict. Selalu punya playlist akustik sore.",
    tags: ["Fullstack", "Git", "Next.js"],
    dream: "Software Engineering Mentor & Tech Lead",
    reason: "Senang melihat teman-teman berkembang dan percaya diri menulis baris kode pertama mereka.",
    workTitle: "ForumTanya Kakak Kelas PPLG",
    workDesc: "Ruang diskusi tanya-jawab koding antarangkatan lengkap dengan potongan kode terformat.",
  },
  {
    name: "Salma Kamila",
    nick: "Salma",
    bio: "Penggemar tipografi dan tata letak editorial. Kalau Salma yang pegang halaman depan, tampilannya langsung terasa seperti majalah cetak.",
    tags: ["Frontend", "Tipografi", "CSS"],
    dream: "Design Systems Engineer",
    reason: "Membangun jembatan yang rapi antara tim desainer dan tim programmer.",
    workTitle: "Pustaka Komponen UI Tenun Flores",
    workDesc: "Kumpulan komponen antarmuka web siap pakai dengan palet warna alami tenun ikat.",
  },
  {
    name: "Wardah Hafizhah",
    nick: "Wardah",
    bio: "Sering jadi moderator saat presentasi projek kelas. Suaranya tenang dan penjelasannya bikin penguji manggut-manggut.",
    tags: ["Analisis Sistem", "UI/UX", "QA"],
    dream: "Quality Assurance Lead & System Analyst",
    reason: "Memastikan setiap perangkat lunak yang rilis benar-benar bebas bug dan nyaman digunakan.",
    workTitle: "UjiOtomatis Form Pendaftaran Siswa Baru",
    workDesc: "Rangkaian skrip pengujian otomatis dan daftar periksa kelayakan aplikasi PPDB madrasah.",
  },
  {
    name: "Zahra Amalia",
    nick: "Amel",
    bio: "Pecinta kucing asrama dan perancang aplikasi mobile. Selalu membawa buku sketsa kecil di saku seragam.",
    tags: ["Mobile", "UI/UX", "Flutter"],
    dream: "Mobile App Creator untuk pariwisata berkelanjutan",
    reason: "Memperkenalkan keindahan desa-desa adat di Flores dengan tetap menjaga kelestarian alamnya.",
    workTitle: "Jejak Desa Adat Wologai",
    workDesc: "Panduan kunjungan sopan dan sejarah rumah adat bagi wisatawan yang berkunjung ke Ende.",
  },
  {
    name: "Aulia Rahmawati",
    nick: "Aulia",
    bio: "Kalau jam istirahat suka menulis puisi di aplikasi catatan yang ia buat sendiri dengan React.",
    tags: ["Frontend", " Penulisan Teknis", "React"],
    dream: "Developer Relations & Penulis Dokumentasi Teknis",
    reason: "Menjelaskan teknologi rumit dengan bahasa Indonesia yang hangat dan mudah dipahami siapa saja.",
    workTitle: "Kamus Istilah Koding Bahasa Indonesia",
    workDesc: "Glosarium interaktif istilah pemrograman lengkap dengan contoh analogi sehari-hari.",
  },
  {
    name: "Intan Permata Sari",
    nick: "Intan",
    bio: "Cekatan mengurus logistik kegiatan kelas maupun struktur endpoint REST API.",
    tags: ["Backend", "Node.js", "API"],
    dream: "Backend Engineer di sistem logistik kepulauan",
    reason: "Mempercepat pengiriman buku dan alat sekolah ke daerah pelosok.",
    workTitle: "LacakPinjam Alat Lab PPLG",
    workDesc: "Aplikasi peminjaman kamera, proyektor, dan perangkat jaringan laboratorium secara tertib.",
  },
  {
    name: "Meisya Wulandari",
    nick: "Meisya",
    bio: "Selalu ceria dan punya ide segar saat kelas mulai lelah mengerjakan laporan PKL.",
    tags: ["UI/UX", "Ilustrasi", "Frontend"],
    dream: "Interactive Storyteller & Web Animator",
    reason: "Ingin membuat situs web edukasi sejarah Islam di Nusantara yang memikat secara visual.",
    workTitle: "Lini Masa Sejarah Ende & Bung Karno",
    workDesc: "Web cerita interaktif mengenai jejak perenungan Pancasila di Kota Ende.",
  },
  {
    name: "Safira Nur Azizah",
    nick: "Safira",
    bio: "Rajin mengecek kontras warna dan ukuran tombol di HP supaya aplikasi teman-teman nyaman di layar kecil.",
    tags: ["Mobile Web", "Frontend", "QA"],
    dream: "Mobile Web Performance Specialist",
    reason: "Mayoritas pengguna di daerah mengakses internet dari HP sederhana.",
    workTitle: "JadwalSholat & Imsakiyah Kabupaten Ende",
    workDesc: "Aplikasi web progresif super ringan penunjuk waktu sholat akurat untuk wilayah Flores.",
  },
  {
    name: "Tiara Kusuma Dewi",
    nick: "Tiara",
    bio: "Pendengar yang baik dan perancang alur pengguna yang teliti. Tidak pernah lupa ulang tahun teman sekelas.",
    tags: ["UI/UX", "Riset", "Frontend"],
    dream: "Digital Product Designer di bidang kesehatan mental remaja",
    reason: "Menyediakan ruang cerita yang aman dan menenangkan bagi pelajar.",
    workTitle: "RuangTenang — Jurnal Syukur Harian Siswa",
    workDesc: "Aplikasi catatan refleksi sore dengan statistik suasana hati mingguan yang ramah privasi.",
  },
  {
    name: "Yasmin Khairunnisa",
    nick: "Yasmin",
    bio: "Penggemar algoritma dan teka-teki logika. Suka membantu teman menyederhanakan fungsi yang terlalu panjang.",
    tags: ["Algoritma", "Backend", "TypeScript"],
    dream: " Peneliti Komputasi & Dosen Informatika",
    reason: "Ingin kembali mengajar di NTT setelah lulus kuliah nanti.",
    workTitle: "PenjadwalPiket & Pembagian Kelompok Adil",
    workDesc: "Generator jadwal piket kelas dan kelompok praktikum otomatis berbasis algoritma acak berimbang.",
  },
];

// 2 Teman di bagian "Pernah Bersama Kita" (1 Laki-Laki, 1 Perempuan)
const MOVED_STUDENTS: Array<{
  name: string;
  nick: string;
  gender: "L" | "P";
  showPhoto: boolean;
  bio: string;
  tags: string[];
}> = [
  {
    name: "Bagas Adi Nugroho",
    nick: "Bagas",
    gender: "L",
    showPhoto: true,
    bio: "Sahabat seperjuangan kita di Kelas X yang berpindah mengikuti tugas orang tua ke Kupang. Tawa dan semangatnya saat merakit PC pertama kali di lab tetap kami kenang.",
    tags: ["Jaringan", "Perangkat Keras", "Sahabat Kelas X"],
  },
  {
    name: "Rahma Dania Putri",
    nick: "Dania",
    gender: "P",
    showPhoto: false, // Contoh siswa yang memilih menampilkan siluet (show_photo = false)
    bio: "Teman sebangku yang hangat di tahun pertama madrasah sebelum pindah ke Makassar. Terima kasih pernah berbagi cerita dan doa bersama keluarga XII PPLG 1.",
    tags: ["Desain Grafis", "Sahabat Kelas X"],
  },
];

const PAPER_COLORS = [
  "#fae6b1",
  "#f7d6c4",
  "#d9ead3",
  "#d0e4e6",
  "#f5deb3",
  "#f4d5dc",
];

export function generateInitialSeedData() {
  const students: StudentRow[] = [];
  const dreams: DreamRow[] = [];
  const dreamCheers: DreamCheerRow[] = [];
  const memoryEntries: MemoryEntryRow[] = [];
  const works: WorkRow[] = [];

  // 1. 8 Laki-laki aktif
  MALE_STUDENTS.forEach((m, idx) => {
    const id = `student-l-${idx + 1}`;
    const tone = ((idx % 2) + 1) as 1 | 2;
    students.push({
      id,
      slug: m.nick.toLowerCase(),
      full_name: m.name,
      nickname: m.nick,
      gender: "L",
      is_active: true,
      show_photo: true,
      photo_url: createAvatarPlaceholderDataUri(m.name, tone, true),
      bio: m.bio,
      tags: m.tags,
      links: [{ label: "Karya Kelas", href: "/karya" }],
      tone,
      rail_group: "L",
      sort_order: idx + 1,
    });
  });

  // 2. 14 Perempuan aktif (7 P1, 7 P2)
  FEMALE_STUDENTS.forEach((f, idx) => {
    const id = `student-p-${idx + 1}`;
    const tone = ((idx % 2) + 3) as 3 | 4;
    const railGroup = idx < 7 ? "P1" : "P2";
    students.push({
      id,
      slug: f.nick.toLowerCase(),
      full_name: f.name,
      nickname: f.nick,
      gender: "P",
      is_active: true,
      show_photo: true,
      photo_url: createAvatarPlaceholderDataUri(f.name, tone, true),
      bio: f.bio,
      tags: f.tags,
      links: [{ label: "Karya Kelas", href: "/karya" }],
      tone,
      rail_group: railGroup,
      sort_order: 9 + idx,
    });
  });

  // 3. 2 Teman "Pernah Bersama Kita"
  MOVED_STUDENTS.forEach((mv, idx) => {
    const id = `student-moved-${idx + 1}`;
    students.push({
      id,
      slug: mv.nick.toLowerCase(),
      full_name: mv.name,
      nickname: mv.nick,
      gender: mv.gender,
      is_active: false,
      show_photo: mv.showPhoto,
      photo_url: mv.showPhoto ? createAvatarPlaceholderDataUri(mv.name, 5, true) : "",
      bio: mv.bio,
      tags: mv.tags,
      links: [],
      tone: 5,
      rail_group: "moved",
      sort_order: 30 + idx,
    });
  });

  // 4. Dreams, Cheers, Memory Entries, dan Works untuk 22 siswa aktif
  const allActiveSpecs = [...MALE_STUDENTS, ...FEMALE_STUDENTS];
  const activeStudents = students.filter((s) => s.is_active);

  activeStudents.forEach((stu, idx) => {
    const spec = allActiveSpecs[idx]!;
    const dreamId = `dream-${stu.id}`;
    const paperColor = PAPER_COLORS[idx % PAPER_COLORS.length]!;

    const cheersForDream: DreamCheerRow[] = [
      {
        id: `cheer-${idx}-1`,
        dream_id: dreamId,
        author_name: activeStudents[(idx + 3) % activeStudents.length]!.nickname,
        message: `Bismillah ${stu.nickname}, semoga langkahmu dimudahkan dan cita-citamu tercapai!`,
        status: "approved",
      },
      {
        id: `cheer-${idx}-2`,
        dream_id: dreamId,
        author_name: activeStudents[(idx + 7) % activeStudents.length]!.nickname,
        message: `Jangan lupa mampir ke Ende kalau nanti sudah sukses jadi ${spec.dream.split(" ")[0]}!`,
        status: "approved",
      },
    ];

    dreamCheers.push(...cheersForDream);
    dreams.push({
      id: dreamId,
      student_id: stu.id,
      student_name: stu.full_name,
      student_nickname: stu.nickname,
      dream: spec.dream,
      reason: spec.reason,
      paper_color: paperColor,
      status: "approved",
      cheers: cheersForDream,
    });

    // Buku Kenangan (2 pesan per siswa aktif)
    const friendA = activeStudents[(idx + 1) % activeStudents.length]!;
    const friendB = activeStudents[(idx + 5) % activeStudents.length]!;
    memoryEntries.push(
      {
        id: `mem-${stu.id}-1`,
        student_id: stu.id,
        author_name: friendA.full_name,
        message: `Terima kasih sudah jadi teman diskusi yang sabar selama di XII PPLG 1, ${stu.nickname}. Semoga sehat dan berkah selalu langkahmu selepas dari MAKN Ende!`,
        decor_seed: 100 + idx * 17,
        status: "approved",
      },
      {
        id: `mem-${stu.id}-2`,
        student_id: stu.id,
        author_name: friendB.full_name,
        message: `Bakal kangen suasana sore di lab waktu kita ngerjain projek bareng. Sukses terus untuk mimpi besarmu ya, ${stu.nickname}!`,
        decor_seed: 200 + idx * 23,
        status: "approved",
      }
    );

    // 1 Siswa = 1 Karya
    works.push({
      id: `work-${stu.id}`,
      student_id: stu.id,
      student_name: stu.full_name,
      title: spec.workTitle,
      description: spec.workDesc,
      tags: stu.tags,
      image_url: "",
      demo_url: `https://karya-xiipplg1-maknende.sch.id/${stu.slug}`,
      repo_url: `https://github.com/xiipplg1-maknende/${stu.slug}-project`,
      status: "approved",
    });
  });

  // 5. 50 Guru (1 Wali Kelas + 16 Kejuruan lainnya + 16 Agama + 17 Akademik = 50 Guru)
  const teachers: TeacherRow[] = [];

  // Wali Kelas khusus
  teachers.push({
    id: "teacher-homeroom",
    full_name: "Ibu Hajra, S.Pd.",
    title: "Wali Kelas XII PPLG 1 & Pendidik Pembimbing",
    grp: "akademik",
    is_homeroom: true,
    photo_url: createAvatarPlaceholderDataUri("Ibu Hajra", 3, true),
    message:
      "Anak-anakku XII PPLG 1 yang Ibu sayangi dan banggakan, baris kode bisa diperbarui kapan saja, tetapi kejujuran, adab, dan persaudaraan yang kalian bangun di madrasah ini adalah fondasi seumur hidup. Terbanglah tinggi meraih cita-cita kalian dan tetaplah rendah hati.",
    tone: 3,
    sort_order: 0,
  });

  const kejuruanTitles = [
    "Pemrograman Web & Perangkat Bergerak",
    "Basis Data & Administrasi Server",
    "Pengembangan Gim & Grafika Komputer",
    "Desain Antarmuka (UI/UX) & Kreatif",
    "Algoritma & Pemrograman Dasar",
    "Rekayasa Perangkat Lunak Terapan",
    "Keamanan Jaringan & Aplikasi",
    "Produk Kreatif & Kewirausahaan Digital",
  ];

  const agamaTitles = [
    "Al-Qur'an Hadis",
    "Akidah Akhlak",
    "Fikih Ibadah & Muamalah",
    "Sejarah Kebudayaan Islam",
    "Bahasa Arab & Tahsin",
    "Ilmu Tafsir & Hadis",
  ];

  const akademikTitles = [
    "Matematika Terapan",
    "Bahasa Indonesia & Sastra",
    "Bahasa Inggris Komunikasi",
    "Pendidikan Pancasila & Kewarganegaraan",
    "Sejarah Indonesia",
    "Fisika & Sains Kejuruan",
    "Seni Budaya & Prakarya Nusantara",
    "Pendidikan Jasmani & Kesehatan",
    "Bimbingan Konseling & Karir",
  ];

  const teacherFirstNames = [
    "Ustadz Ahmad",
    "Ibu Siti",
    "Bapak Lukman",
    "Ibu Nurhayati",
    "Bapak Ridwan",
    "Ibu Fatmawati",
    "Ustadz Syarif",
    "Ibu Rahmawati",
    "Bapak Fauzi",
    "Ibu Halimah",
    "Bapak Darmawan",
    "Ibu Khadijah",
    "Bapak Mansyur",
    "Ibu Aminah",
    "Bapak Ruslan",
    "Ibu Zainab",
    "Bapak Hidayat",
  ];

  const teacherLastNames = [
    "S.Kom.",
    "M.Kom.",
    "S.Pd.",
    "M.Pd.",
    "S.Ag.",
    "M.Ag.",
    "S.T.",
    "S.Si.",
  ];

  let tOrder = 1;
  const buildTeacherGroup = (grp: TeacherGroup, count: number, titles: string[], tone: 1 | 2 | 4) => {
    for (let i = 0; i < count; i++) {
      const fn = teacherFirstNames[(i + tOrder) % teacherFirstNames.length]!;
      const deg = teacherLastNames[(i + tOrder) % teacherLastNames.length]!;
      const fullName = `${fn} Pratama ${tOrder}, ${deg}`;
      const title = titles[i % titles.length]!;
      teachers.push({
        id: `teacher-${grp}-${i + 1}`,
        full_name: fullName,
        title,
        grp,
        is_homeroom: false,
        photo_url: createAvatarPlaceholderDataUri(fullName, tone, true),
        message: `Terima kasih atas kesabaran dan ilmu ${title.toLowerCase()} yang selalu menerangi langkah kami di MAKN Ende.`,
        tone,
        sort_order: tOrder++,
      });
    }
  };

  buildTeacherGroup("kejuruan", 16, kejuruanTitles, 1);
  buildTeacherGroup("agama", 16, agamaTitles, 2);
  buildTeacherGroup("akademik", 17, akademikTitles, 4);

  // 6. 100 Foto Galeri Momen (Fase X, XI, XII; 12 featured per fase untuk rak 3D)
  const moments: MomentRow[] = [];
  const categories = [
    "PKL",
    "Lomba",
    "Study tour",
    "Acara madrasah",
    "Momen lucu",
    "Hari terakhir",
  ];
  const phases: MomentPhase[] = ["X", "XI", "XII"];

  const captionTemplates = [
    "Sore itu setelah praktikum selesai, tidak ada yang langsung pulang karena sibuk menertawakan bug yang ternyata cuma kurang satu tanda kurung.",
    "Foto bersama di depan teras laboratorium PPLG sebelum berangkat kegiatan lapangan.",
    "Momen kompak satu kelas menyiapkan dekorasi acara peringatan hari besar di aula MAKN Ende.",
    "Diskusi kelompok di bawah pohon rindang halaman madrasah sambil ditemani angin sore Ende.",
    "Senyum lega sehabis presentasi projek akhir semester di hadapan guru penguji kejuruan.",
    "Perjalanan kebersamaan menuju kaki Danau Kelimutu, menyimpan cerita hangat di setiap tikungan jalan.",
  ];

  const featuredCountByPhase: Record<MomentPhase, number> = { X: 0, XI: 0, XII: 0 };

  for (let i = 1; i <= 100; i++) {
    const phase = phases[(i - 1) % phases.length]!;
    const category = categories[(i - 1) % categories.length]!;
    const isFeatured = featuredCountByPhase[phase] < 12;
    if (isFeatured) featuredCountByPhase[phase]++;

    const year = phase === "X" ? 2024 : phase === "XI" ? 2025 : 2026;
    const month = String(((i - 1) % 12) + 1).padStart(2, "0");
    const day = String(((i * 3) % 27) + 1).padStart(2, "0");
    const uploader = activeStudents[i % activeStudents.length]!.nickname;

    moments.push({
      id: `moment-${i}`,
      image_url: `/api/moment-illustration?seed=${i}`,
      caption: `${captionTemplates[i % captionTemplates.length]} (Arsip #${i})`,
      taken_at: `${year}-${month}-${day}`,
      category,
      phase,
      uploader_name: uploader,
      featured: isFeatured,
      status: "approved",
    });
  }

  // 7. Kapsul Waktu (Time Capsules — sebagian sudah terbuka, sebagian masih terkunci di masa depan)
  const rawTimeCapsules: Array<{
    id: string;
    author_name: string;
    recipient_label: string;
    message: string;
    unlock_at: string;
    status: "approved";
  }> = [
    {
      id: "capsule-1",
      author_name: "Ahmad Fauzan (Ketua Kelas)",
      recipient_label: "Untuk Keluarga XII PPLG 1 saat Hari Kelulusan",
      message:
        "Surat ini kita tulis waktu awal kelas XII. Kalau surat ini sudah terbuka, artinya kita sudah berhasil melewati ujian praktik dan siap melangkah ke dunia nyata. Jangan pernah lupakan ruang lab lantai dua kita!",
      unlock_at: "2026-06-01T00:00:00Z", // Sudah terbuka (<= 2026-11-14)
      status: "approved",
    },
    {
      id: "capsule-2",
      author_name: "Siti Aisyah Humaira",
      recipient_label: "Untuk Diri Sendiri & Sahabat Bangku Tengah",
      message:
        "Semoga saat pesan ini terbuka, kita semua masih saling berkabar dan tidak ada yang menyerah pada cita-cita yang pernah kita tempel di papan tulis kelas.",
      unlock_at: "2026-09-10T00:00:00Z", // Sudah terbuka
      status: "approved",
    },
    {
      id: "capsule-3",
      author_name: "Hanan Al-Ghifari",
      recipient_label: "Reuni 1 Tahun Alumni XII PPLG 1 MAKN Ende",
      message:
        "Pesan rahasia untuk reuni tahun 2027: siapa yang akhirnya beneran kerja di bidang koding dan siapa yang banting setir jadi pengusaha kuliner? Tetap kompak selalu!",
      unlock_at: "2027-06-01T00:00:00Z", // Masih terkunci (> Nov 2026)
      status: "approved",
    },
    {
      id: "capsule-4",
      author_name: "Wali Kelas — Ibu Hajra, S.Pd.",
      recipient_label: "Untuk 22 Siswa-Siswi Kebanggaan Ibu di Tahun 2028",
      message:
        "Pesan ini baru akan terbuka di tahun 2028. Ibu selalu mendoakan kesehatan, kesuksesan, dan keberkahan kalian di mana pun kalian berkarya.",
      unlock_at: "2028-01-01T00:00:00Z", // Masih terkunci
      status: "approved",
    },
    {
      id: "capsule-5",
      author_name: "Rizky Pratama & Ilham",
      recipient_label: "Untuk Tim Futsal & Koding Sore XII PPLG 1",
      message:
        "Ingat janji kita waktu duduk di tangga lab: lima tahun lagi kita kumpul lagi di Ende bawa cerita sukses masing-masing!",
      unlock_at: "2026-08-17T00:00:00Z", // Sudah terbuka
      status: "approved",
    },
    {
      id: "capsule-6",
      author_name: "Nabila Salsabila & Salma",
      recipient_label: "Untuk Semua Sahabat Putri XII PPLG 1 (Buka 2027)",
      message:
        "Surat rahasia untuk saudari-saudari seperjuangan asrama dan ruang lab.",
      unlock_at: "2027-12-01T00:00:00Z", // Masih terkunci
      status: "approved",
    },
  ];

  // 8. Wall of Thanks
  const thanksList: ThanksRow[] = [
    {
      id: "thanks-1",
      from_name: "Seluruh Siswa XII PPLG 1",
      to_name: "Ibu Hajra, S.Pd. (Wali Kelas Tercinta)",
      message:
        "Terima kasih tak terhingga Ibu Hajra sudah menjadi ibu kedua kami di madrasah, membimbing dengan penuh kesabaran dan selalu mendoakan langkah kami dari kelas X hingga kelas XII.",
      status: "approved",
    },
    {
      id: "thanks-2",
      from_name: "Penghuni Asrama Putra",
      to_name: "Fauzan & Zaki",
      message:
        "Terima kasih sudah rela begadang bantu nge-fix error database kami H-1 pengumpulan laporan PKL!",
      status: "approved",
    },
    {
      id: "thanks-3",
      from_name: "Tim Desain Kelas",
      to_name: "Aisyah, Salma & Rani",
      message:
        "Terima kasih sudah membuat setiap presentasi dan pameran karya kelas kita selalu tampil rapi dan membanggakan.",
      status: "approved",
    },
    {
      id: "thanks-4",
      from_name: "Keluarga XII PPLG 1",
      to_name: "Bagas & Dania (Pernah Bersama Kita)",
      message:
        "Terima kasih pernah menjadi bagian dari awal perjalanan kami di Kelas X. Nama kalian selalu ada di album ini.",
      status: "approved",
    },
    {
      id: "thanks-5",
      from_name: "Anak-Anak Lab RPL",
      to_name: "Ibu Kantin & Bapak Penjaga Madrasah",
      message:
        "Terima kasih atas teh hangat sore dan kesabarannya menunggu kami merapikan ruang lab sebelum gerbang dikunci.",
      status: "approved",
    },
    {
      id: "thanks-6",
      from_name: "Barisan Bangku Belakang",
      to_name: "Nabila, Wardah & Intan",
      message:
        "Terima kasih selalu sabar meminjamkan catatan rapi dan menjelaskan ulang algoritma sebelum ulangan harian!",
      status: "approved",
    },
    {
      id: "thanks-7",
      from_name: "Tim Projek Akhir",
      to_name: "Semua Guru Produktif PPLG MAKN Ende",
      message:
        "Terima kasih atas ilmu koding, kedisiplinan, dan nasihat kehidupan yang menjadi bekal berharga masa depan kami.",
      status: "approved",
    },
  ];

  // 9. Polls
  const polls: PollWithOptions[] = [
    {
      id: "poll-momen-terbaik",
      question: "Momen kebersamaan mana di XII PPLG 1 yang paling sulit kamu lupakan?",
      is_open: true,
      total_votes: 48,
      options: [
        {
          id: "opt-1",
          poll_id: "poll-momen-terbaik",
          label: "Begadang & saling bantu saat persiapan presentasi laporan PKL",
          votes: 18,
        },
        {
          id: "opt-2",
          poll_id: "poll-momen-terbaik",
          label: "Perjalanan bersama menikmati udara sejuk menuju Danau Kelimutu",
          votes: 14,
        },
        {
          id: "opt-3",
          poll_id: "poll-momen-terbaik",
          label: "Suasana sore di Lab RPL waktu satu kelas berhasil menjalankan projek tanpa error",
          votes: 11,
        },
        {
          id: "opt-4",
          poll_id: "poll-momen-terbaik",
          label: "Makan bersama satu angkatan selepas acara pentas seni madrasah",
          votes: 5,
        },
      ],
    },
  ];

  const timeCapsules: TimeCapsuleRow[] = rawTimeCapsules.map((c) => ({
    ...c,
    is_unlocked: new Date(c.unlock_at).getTime() <= Date.now(),
  }));

  return {
    students,
    teachers,
    moments,
    dreams,
    dreamCheers,
    memoryEntries,
    rawTimeCapsules,
    timeCapsules,
    thanksList,
    works,
    polls,
    settings: {
      graduation_date: "2027-05-15T08:00:00+08:00",
    },
  };
}

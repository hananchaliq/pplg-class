import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeText,
  studentToLanyardMember,
  teacherToLanyardMember,
  chunkIntoRails,
  maskTimeCapsuleForPublic,
  computeClassSkillMap,
  verifyClassCode,
  SubmitPayloadSchema,
} from "./domain-logic";
import { generateInitialSeedData } from "./seed-data";
import type { StudentRow, TeacherRow, WorkRow } from "./types";

describe("Domain Logic — XII PPLG 1 MAKN Ende", () => {
  it("sanitizeText escapes HTML tags and quotes to prevent XSS", () => {
    const raw = `  <script>alert("xss")</script> & 'teman'  `;
    const cleaned = sanitizeText(raw);
    assert.equal(
      cleaned,
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &#39;teman&#39;"
    );
  });

  it("studentToLanyardMember respects show_photo=false and is_active=false", () => {
    const movedStudent: StudentRow = {
      id: "student-moved-2",
      slug: "aisyah-moved",
      full_name: "Aisyah Maharani Putri",
      nickname: "Aisyah",
      gender: "P",
      is_active: false,
      show_photo: false,
      photo_url: "https://example.com/photo.jpg",
      bio: "Pernah duduk di bangku baris kedua.",
      tags: ["UI/UX"],
      links: [],
      tone: 5,
      rail_group: "moved",
      sort_order: 24,
    };

    const mapped = studentToLanyardMember(movedStudent, 0);
    assert.equal(mapped.image, "");
    assert.equal(mapped.tone, 5);
    assert.equal(mapped.team, "✦ SAHABAT ISTIMEWA SELAMANYA");
    assert.equal(mapped.role, "Sahabat yang pernah di sini");
  });

  it("teacherToLanyardMember assigns distinct group tones and homeroom badge", () => {
    const wali: TeacherRow = {
      id: "teacher-wali",
      full_name: "Ustadz Ahmad Fauzi, S.Kom.",
      title: "Wali Kelas XII PPLG 1",
      grp: "kejuruan",
      is_homeroom: true,
      photo_url: "",
      message: "Semoga sukses selalu.",
      tone: 3,
      sort_order: 1,
    };

    const mapped = teacherToLanyardMember(wali);
    assert.equal(mapped.tone, 3);
    assert.equal(mapped.team, "Wali Kelas XII PPLG 1");
    assert.ok(mapped.image && mapped.image.startsWith("data:image/svg+xml;utf8,"));
  });

  it("chunkIntoRails enforces maximum 8 cards per rail", () => {
    const items = Array.from({ length: 17 }, (_, i) => i + 1);
    const rails = chunkIntoRails(items, 8);
    assert.equal(rails.length, 3);
    assert.equal(rails[0]?.length, 8);
    assert.equal(rails[1]?.length, 8);
    assert.equal(rails[2]?.length, 1);

    // Even if someone passes maxPerRail > 8, it clamps to 8
    const clampedRails = chunkIntoRails(items, 12);
    assert.equal(clampedRails[0]?.length, 8);
  });

  it("maskTimeCapsuleForPublic hides message on server before unlock_at and reveals after unlock_at", () => {
    const nowMs = new Date("2026-01-10T00:00:00Z").getTime();

    const locked = maskTimeCapsuleForPublic(
      {
        id: "tc-locked",
        author_name: "Rizky",
        recipient_label: "Untuk 2028",
        message: "Rahasia masa depan tidak boleh bocor!",
        unlock_at: "2028-05-15T00:00:00Z",
        status: "approved",
      },
      nowMs
    );
    assert.equal(locked.is_unlocked, false);
    assert.equal(locked.message, null);

    const unlocked = maskTimeCapsuleForPublic(
      {
        id: "tc-unlocked",
        author_name: "Wali Kelas",
        recipient_label: "Hari Ini",
        message: "Selamat berjuang di semester akhir!",
        unlock_at: "2025-07-01T00:00:00Z",
        status: "approved",
      },
      nowMs
    );
    assert.equal(unlocked.is_unlocked, true);
    assert.equal(unlocked.message, "Selamat berjuang di semester akhir!");
  });

  it("computeClassSkillMap aggregates active student tags and approved work tags", () => {
    const students: StudentRow[] = [
      {
        id: "s1",
        slug: "s1",
        full_name: "Ahmad",
        nickname: "Ahmad",
        gender: "L",
        is_active: true,
        show_photo: true,
        photo_url: "",
        bio: "",
        tags: ["Next.js", "TypeScript"],
        links: [],
        tone: 1,
        rail_group: "L",
        sort_order: 1,
      },
      {
        id: "s2",
        slug: "s2",
        full_name: "Siti",
        nickname: "Siti",
        gender: "P",
        is_active: false, // Inactive student should not inflate active skill map
        show_photo: true,
        photo_url: "",
        bio: "",
        tags: ["Rust"],
        links: [],
        tone: 5,
        rail_group: "moved",
        sort_order: 2,
      },
    ];

    const works: WorkRow[] = [
      {
        id: "w1",
        student_id: "s1",
        title: "SIAKAD",
        description: "Aplikasi madrasah",
        tags: ["Next.js", "Supabase"],
        image_url: "",
        demo_url: "",
        repo_url: "",
        status: "approved",
      },
    ];

    const map = computeClassSkillMap(students, works);
    const nextSkill = map.find((n) => n.skill === "Next.js");
    assert.ok(nextSkill);
    assert.equal(nextSkill.studentCount, 1);
    assert.equal(nextSkill.workCount, 1);
    assert.equal(nextSkill.totalWeight, 2);

    const rustSkill = map.find((n) => n.skill === "Rust");
    assert.equal(rustSkill, undefined);
  });

  it("verifyClassCode and SubmitPayloadSchema validate submissions properly", () => {
    assert.equal(verifyClassCode("xiipplg1", "XIIPPLG1"), true);
    assert.equal(verifyClassCode("SALAH", "XIIPPLG1"), false);

    const validMemory = SubmitPayloadSchema.safeParse({
      type: "memory",
      classCode: "XIIPPLG1",
      honeypot: "",
      studentId: "student-1",
      authorName: "Nabila",
      message: "Semoga sukses selalu kawan seperjuangan!",
    });
    assert.equal(validMemory.success, true);

    const botFilledHoneypot = SubmitPayloadSchema.safeParse({
      type: "memory",
      classCode: "XIIPPLG1",
      honeypot: "spam-bot",
      studentId: "student-1",
      authorName: "Bot",
      message: "Spam link",
    });
    assert.equal(botFilledHoneypot.success, false);
  });

  it("generateInitialSeedData creates exact required counts (22 active + 2 moved students, 50 teachers, 100 moments, 22 works)", () => {
    const seed = generateInitialSeedData();
    const activeStudents = seed.students.filter((s) => s.is_active);
    const movedStudents = seed.students.filter((s) => !s.is_active);
    const maleActive = activeStudents.filter((s) => s.gender === "L");
    const femaleActive = activeStudents.filter((s) => s.gender === "P");

    assert.equal(activeStudents.length, 22);
    assert.equal(maleActive.length, 8);
    assert.equal(femaleActive.length, 14);
    assert.equal(movedStudents.length, 2);
    assert.equal(seed.teachers.length, 50);
    assert.equal(seed.moments.length, 100);
    assert.equal(seed.works.length, 22);
    assert.equal(seed.dreams.length, 22);
  });
});

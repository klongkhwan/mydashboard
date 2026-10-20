export interface MuscleGroupInfo {
  value: "chest" | "back" | "legs" | "shoulders" | "arms" | "core" | "cardio" | "other"
  label: string
}

export const MUSCLE_GROUPS: MuscleGroupInfo[] = [
  { value: "chest", label: "Chest (อก)" },
  { value: "back", label: "Back (หลัง)" },
  { value: "legs", label: "Legs (ขา)" },
  { value: "shoulders", label: "Shoulders (ไหล่)" },
  { value: "arms", label: "Arms (แขน)" },
  { value: "core", label: "Core (แกนกลาง)" },
  { value: "cardio", label: "Cardio (คาร์ดิโอ)" },
  { value: "other", label: "Other (อื่นๆ)" },
]

export interface ExerciseDefinition {
  name: string
  isBodyweight?: boolean
}

export const EXERCISES_BY_CATEGORY: Record<string, ExerciseDefinition[]> = {
  chest: [
    { name: "Push-ups (วิดพื้น)", isBodyweight: true },
    { name: "Diamond Push-ups (วิดพื้นเน้นอกใน/หลังแขน)", isBodyweight: true },
    { name: "Wide Push-ups (วิดพื้นมือห่าง)", isBodyweight: true },
    { name: "Incline Push-ups (วิดพื้นชันขึ้นกับเก้าอี้)", isBodyweight: true },
    { name: "Decline Push-ups (วิดพื้นเท้ายกสูง)", isBodyweight: true },
    { name: "Barbell Bench Press" },
    { name: "Dumbbell Bench Press" },
    { name: "Dumbbell Fly" },
  ],
  back: [
    { name: "Superman (นอนแอ่นหลัง)", isBodyweight: true },
    { name: "Doorframe Row (ดึงขอบประตู)", isBodyweight: true },
    { name: "Table Inverted Row (ดึงตัวใต้โต๊ะ)", isBodyweight: true },
    { name: "Floor Pulls / Y-T-W", isBodyweight: true },
    { name: "Pull-ups (โหนบาร์)", isBodyweight: true },
    { name: "Lat Pulldown" },
    { name: "Barbell Row" },
    { name: "Dumbbell Row" },
  ],
  legs: [
    { name: "Bodyweight Squats (สควอทบอดี้เวท)", isBodyweight: true },
    { name: "Walking Lunges (ก้าวขา)", isBodyweight: true },
    { name: "Bulgarian Split Squats (สควอทขาเดียวบนเก้าอี้)", isBodyweight: true },
    { name: "Glute Bridges (ยกสะโพกสร้างก้น)", isBodyweight: true },
    { name: "Calf Raises (เขย่งปลายเท้า)", isBodyweight: true },
    { name: "Wall Sit (นั่งพิงกำแพง)", isBodyweight: true },
    { name: "Barbell Squat" },
    { name: "Romanian Deadlift" },
    { name: "Leg Press" },
  ],
  shoulders: [
    { name: "Pike Push-ups (วิดพื้นกดไหล่)", isBodyweight: true },
    { name: "Handstand Hold / Wall Walk (ดันกำแพง)", isBodyweight: true },
    { name: "Shoulder Taps (แพลงก์แตะไหล่)", isBodyweight: true },
    { name: "Arm Circles (หมุนแขน)", isBodyweight: true },
    { name: "Overhead Press" },
    { name: "Dumbbell Lateral Raise" },
    { name: "Dumbbell Front Raise" },
    { name: "Face Pull" },
  ],
  arms: [
    { name: "Chair / Bench Dips (ดิดหลังแขนกับเก้าอี้)", isBodyweight: true },
    { name: "Diamond Push-ups (วิดพื้นหลังแขน)", isBodyweight: true },
    { name: "Doorframe Bicep Curl (ดึงเน้นหน้าแขน)", isBodyweight: true },
    { name: "Dumbbell Bicep Curl" },
    { name: "Tricep Pushdown" },
    { name: "Hammer Curls" },
  ],
  core: [
    { name: "Plank (แพลงก์)", isBodyweight: true },
    { name: "Side Plank (แพลงก์ด้านข้าง)", isBodyweight: true },
    { name: "Crunches (ซิทอัพสั้น)", isBodyweight: true },
    { name: "Mountain Climbers (วิ่งปีนเขา)", isBodyweight: true },
    { name: "Leg Raises (ยกขาฝึกท้องล่าง)", isBodyweight: true },
    { name: "Bicycle Crunches (ปั่นจักรยานกลางอากาศ)", isBodyweight: true },
    { name: "Russian Twists (บิดลำตัว)", isBodyweight: true },
    { name: "Hollow Body Hold", isBodyweight: true },
  ],
  cardio: [
    { name: "Jumping Jacks (กระโดดตบ)", isBodyweight: true },
    { name: "High Knees (วิ่งยกเข่าสูง)", isBodyweight: true },
    { name: "Burpees (เบอร์ปีส์)", isBodyweight: true },
    { name: "Shadow Boxing (ชกลม)", isBodyweight: true },
    { name: "กระโดดเชือก (Jump Rope)", isBodyweight: true },
    { name: "Jogging (วิ่งอยู่กับที่/รอบบ้าน)", isBodyweight: true },
  ],
  other: [
    { name: "Stretching (ยืดเหยียดกล้ามเนื้อ)", isBodyweight: true },
    { name: "Yoga Flow", isBodyweight: true },
  ],
}

export interface PresetRoutine {
  id: string
  name: string
  category: "home" | "gym" | "quick"
  badge: string
  description: string
  duration: number
  exercises: Array<{
    name: string
    muscle_group: "chest" | "back" | "legs" | "shoulders" | "arms" | "core" | "cardio" | "other"
    sets: Array<{ set_number: number; weight_kg: number; reps: number; completed: boolean }>
  }>
}

export const ROUTINE_PRESETS: PresetRoutine[] = [
  // --- 🏠 ออกกำลังกายที่บ้าน (ไร้อุปกรณ์) ---
  {
    id: "home_fullbody",
    name: "Home Full Body (ไร้อุปกรณ์)",
    category: "home",
    badge: "🏠 บ้าน/ไร้อุปกรณ์",
    description: "วิดพื้น, สควอท, นอนแอ่นหลัง, แพลงก์ ครบทั้งตัว 30 นาที",
    duration: 30,
    exercises: [
      {
        name: "Push-ups (วิดพื้น)",
        muscle_group: "chest",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 12, completed: false },
          { set_number: 2, weight_kg: 0, reps: 10, completed: false },
          { set_number: 3, weight_kg: 0, reps: 8, completed: false },
        ],
      },
      {
        name: "Bodyweight Squats (สควอทบอดี้เวท)",
        muscle_group: "legs",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 15, completed: false },
          { set_number: 2, weight_kg: 0, reps: 15, completed: false },
          { set_number: 3, weight_kg: 0, reps: 12, completed: false },
        ],
      },
      {
        name: "Superman (นอนแอ่นหลัง)",
        muscle_group: "back",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 12, completed: false },
          { set_number: 2, weight_kg: 0, reps: 12, completed: false },
        ],
      },
      {
        name: "Plank (แพลงก์)",
        muscle_group: "core",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 30, completed: false },
          { set_number: 2, weight_kg: 0, reps: 30, completed: false },
        ],
      },
    ],
  },
  {
    id: "home_push",
    name: "Home Push Day (อก/ไหล่/หลังแขน ไร้อุปกรณ์)",
    category: "home",
    badge: "💪 ดันช่วงบน",
    description: "วิดพื้นปกติ, วิดพื้นยกมุมชัน, วิดพื้นกดไหล่, ดิดหลังแขนกับเก้าอี้",
    duration: 25,
    exercises: [
      {
        name: "Push-ups (วิดพื้น)",
        muscle_group: "chest",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 12, completed: false },
          { set_number: 2, weight_kg: 0, reps: 10, completed: false },
          { set_number: 3, weight_kg: 0, reps: 8, completed: false },
        ],
      },
      {
        name: "Incline Push-ups (วิดพื้นชันขึ้นกับเก้าอี้)",
        muscle_group: "chest",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 12, completed: false },
          { set_number: 2, weight_kg: 0, reps: 10, completed: false },
        ],
      },
      {
        name: "Pike Push-ups (วิดพื้นกดไหล่)",
        muscle_group: "shoulders",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 8, completed: false },
          { set_number: 2, weight_kg: 0, reps: 8, completed: false },
        ],
      },
      {
        name: "Chair / Bench Dips (ดิดหลังแขนกับเก้าอี้)",
        muscle_group: "arms",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 12, completed: false },
          { set_number: 2, weight_kg: 0, reps: 10, completed: false },
        ],
      },
    ],
  },
  {
    id: "home_pull",
    name: "Home Pull & Back (หลังและแขน ไร้อุปกรณ์)",
    category: "home",
    badge: "🔙 ดึงช่วงหลัง",
    description: "นอนแอ่นหลัง Superman, ดึงขอบประตู Doorframe, ดึงตัวใต้โต๊ะ Table Row",
    duration: 25,
    exercises: [
      {
        name: "Superman (นอนแอ่นหลัง)",
        muscle_group: "back",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 15, completed: false },
          { set_number: 2, weight_kg: 0, reps: 12, completed: false },
          { set_number: 3, weight_kg: 0, reps: 12, completed: false },
        ],
      },
      {
        name: "Doorframe Row (ดึงขอบประตู)",
        muscle_group: "back",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 12, completed: false },
          { set_number: 2, weight_kg: 0, reps: 12, completed: false },
        ],
      },
      {
        name: "Table Inverted Row (ดึงตัวใต้โต๊ะ)",
        muscle_group: "back",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 8, completed: false },
          { set_number: 2, weight_kg: 0, reps: 8, completed: false },
        ],
      },
      {
        name: "Floor Pulls / Y-T-W",
        muscle_group: "back",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 12, completed: false },
          { set_number: 2, weight_kg: 0, reps: 12, completed: false },
        ],
      },
    ],
  },
  {
    id: "home_lower",
    name: "Home Lower Body & Glutes (ขาและสะโพก)",
    category: "home",
    badge: "🦵 ขาและสะโพก",
    description: "สควอทบอดี้เวท, ลันจ์, บริดจ์ยกสะโพก, เขย่งปลายเท้า",
    duration: 25,
    exercises: [
      {
        name: "Bodyweight Squats (สควอทบอดี้เวท)",
        muscle_group: "legs",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 15, completed: false },
          { set_number: 2, weight_kg: 0, reps: 15, completed: false },
          { set_number: 3, weight_kg: 0, reps: 12, completed: false },
        ],
      },
      {
        name: "Walking Lunges (ก้าวขา)",
        muscle_group: "legs",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 12, completed: false },
          { set_number: 2, weight_kg: 0, reps: 12, completed: false },
        ],
      },
      {
        name: "Glute Bridges (ยกสะโพกสร้างก้น)",
        muscle_group: "legs",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 15, completed: false },
          { set_number: 2, weight_kg: 0, reps: 15, completed: false },
        ],
      },
      {
        name: "Calf Raises (เขย่งปลายเท้า)",
        muscle_group: "legs",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 20, completed: false },
          { set_number: 2, weight_kg: 0, reps: 20, completed: false },
        ],
      },
    ],
  },
  {
    id: "home_sixpack",
    name: "Six-Pack & Core Blast (ร่อง 11 และแกนกลาง)",
    category: "home",
    badge: "🎯 กล้ามท้อง",
    description: "ซิทอัพสั้น, ยกขาฝึกท้องล่าง, รัสเซียนทวิสต์, วิ่งปีนเขา, แพลงก์",
    duration: 20,
    exercises: [
      {
        name: "Crunches (ซิทอัพสั้น)",
        muscle_group: "core",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 20, completed: false },
          { set_number: 2, weight_kg: 0, reps: 20, completed: false },
        ],
      },
      {
        name: "Leg Raises (ยกขาฝึกท้องล่าง)",
        muscle_group: "core",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 15, completed: false },
          { set_number: 2, weight_kg: 0, reps: 12, completed: false },
        ],
      },
      {
        name: "Russian Twists (บิดลำตัว)",
        muscle_group: "core",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 20, completed: false },
          { set_number: 2, weight_kg: 0, reps: 20, completed: false },
        ],
      },
      {
        name: "Mountain Climbers (วิ่งปีนเขา)",
        muscle_group: "core",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 20, completed: false },
          { set_number: 2, weight_kg: 0, reps: 20, completed: false },
        ],
      },
      {
        name: "Plank (แพลงก์)",
        muscle_group: "core",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 45, completed: false },
          { set_number: 2, weight_kg: 0, reps: 30, completed: false },
        ],
      },
    ],
  },
  {
    id: "home_hiit",
    name: "Cardio & Fat Burn (เบิร์นไขมัน ไร้อุปกรณ์)",
    category: "home",
    badge: "🔥 เบิร์นไขมัน",
    description: "กระโดดตบ, วิ่งยกเข่าสูง, เบอร์ปีส์, วิ่งปีนเขา เผาผลาญเร็วสุด",
    duration: 20,
    exercises: [
      {
        name: "Jumping Jacks (กระโดดตบ)",
        muscle_group: "cardio",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 30, completed: false },
          { set_number: 2, weight_kg: 0, reps: 30, completed: false },
        ],
      },
      {
        name: "High Knees (วิ่งยกเข่าสูง)",
        muscle_group: "cardio",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 30, completed: false },
          { set_number: 2, weight_kg: 0, reps: 30, completed: false },
        ],
      },
      {
        name: "Burpees (เบอร์ปีส์)",
        muscle_group: "cardio",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 10, completed: false },
          { set_number: 2, weight_kg: 0, reps: 8, completed: false },
        ],
      },
      {
        name: "Mountain Climbers (วิ่งปีนเขา)",
        muscle_group: "core",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 20, completed: false },
          { set_number: 2, weight_kg: 0, reps: 20, completed: false },
        ],
      },
    ],
  },
  {
    id: "home_calisthenics",
    name: "Calisthenics Strength (บอดี้เวทขั้นสูง)",
    category: "home",
    badge: "🤸 คาลิสเทนิกส์",
    description: "Diamond Push-ups, Pike Push-ups, Dips, Wall Walk ฝึกพละกำลัง",
    duration: 35,
    exercises: [
      {
        name: "Diamond Push-ups (วิดพื้นเน้นอกใน/หลังแขน)",
        muscle_group: "chest",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 10, completed: false },
          { set_number: 2, weight_kg: 0, reps: 8, completed: false },
          { set_number: 3, weight_kg: 0, reps: 8, completed: false },
        ],
      },
      {
        name: "Pike Push-ups (วิดพื้นกดไหล่)",
        muscle_group: "shoulders",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 10, completed: false },
          { set_number: 2, weight_kg: 0, reps: 8, completed: false },
        ],
      },
      {
        name: "Chair / Bench Dips (ดิดหลังแขนกับเก้าอี้)",
        muscle_group: "arms",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 15, completed: false },
          { set_number: 2, weight_kg: 0, reps: 12, completed: false },
        ],
      },
      {
        name: "Hollow Body Hold",
        muscle_group: "core",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 30, completed: false },
          { set_number: 2, weight_kg: 0, reps: 30, completed: false },
        ],
      },
    ],
  },
  {
    id: "home_mobility",
    name: "Morning Mobility & Stretch (ยืดเหยียดฟื้นฟู)",
    category: "home",
    badge: "🧘 ฟื้นฟูร่างกาย",
    description: "ยืดกล้ามเนื้อทั้งตัว หมุนข้อต่อ ลดอาการตึงหลังและไหล่",
    duration: 15,
    exercises: [
      {
        name: "Stretching (ยืดเหยียดกล้ามเนื้อ)",
        muscle_group: "other",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 60, completed: false },
          { set_number: 2, weight_kg: 0, reps: 60, completed: false },
        ],
      },
      {
        name: "Arm Circles (หมุนแขน)",
        muscle_group: "shoulders",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 20, completed: false },
          { set_number: 2, weight_kg: 0, reps: 20, completed: false },
        ],
      },
      {
        name: "Superman (นอนแอ่นหลัง)",
        muscle_group: "back",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 10, completed: false },
        ],
      },
    ],
  },

  // --- 🏋️ ยิมและเวทเทรนนิ่ง (มีอุปกรณ์) ---
  {
    id: "gym_push",
    name: "Gym Push Day (อก/ไหล่/หลังแขน)",
    category: "gym",
    badge: "🏋️ ยิม/มีอุปกรณ์",
    description: "Barbell Bench Press, Overhead Press, Dumbbell Fly, Tricep Pushdown",
    duration: 45,
    exercises: [
      {
        name: "Barbell Bench Press",
        muscle_group: "chest",
        sets: [
          { set_number: 1, weight_kg: 50, reps: 10, completed: false },
          { set_number: 2, weight_kg: 55, reps: 8, completed: false },
          { set_number: 3, weight_kg: 60, reps: 6, completed: false },
        ],
      },
      {
        name: "Overhead Press",
        muscle_group: "shoulders",
        sets: [
          { set_number: 1, weight_kg: 30, reps: 8, completed: false },
          { set_number: 2, weight_kg: 35, reps: 8, completed: false },
        ],
      },
      {
        name: "Dumbbell Fly",
        muscle_group: "chest",
        sets: [
          { set_number: 1, weight_kg: 12, reps: 12, completed: false },
          { set_number: 2, weight_kg: 14, reps: 10, completed: false },
        ],
      },
      {
        name: "Tricep Pushdown",
        muscle_group: "arms",
        sets: [
          { set_number: 1, weight_kg: 20, reps: 12, completed: false },
          { set_number: 2, weight_kg: 25, reps: 10, completed: false },
        ],
      },
    ],
  },
  {
    id: "gym_pull",
    name: "Gym Pull Day (หลัง/ไหล่หลัง/หน้าแขน)",
    category: "gym",
    badge: "🏋️ ยิม/มีอุปกรณ์",
    description: "Lat Pulldown, Barbell Row, Face Pull, Dumbbell Bicep Curl",
    duration: 45,
    exercises: [
      {
        name: "Lat Pulldown",
        muscle_group: "back",
        sets: [
          { set_number: 1, weight_kg: 45, reps: 10, completed: false },
          { set_number: 2, weight_kg: 50, reps: 8, completed: false },
          { set_number: 3, weight_kg: 55, reps: 8, completed: false },
        ],
      },
      {
        name: "Barbell Row",
        muscle_group: "back",
        sets: [
          { set_number: 1, weight_kg: 40, reps: 10, completed: false },
          { set_number: 2, weight_kg: 45, reps: 8, completed: false },
        ],
      },
      {
        name: "Face Pull",
        muscle_group: "shoulders",
        sets: [
          { set_number: 1, weight_kg: 15, reps: 15, completed: false },
          { set_number: 2, weight_kg: 17.5, reps: 12, completed: false },
        ],
      },
      {
        name: "Dumbbell Bicep Curl",
        muscle_group: "arms",
        sets: [
          { set_number: 1, weight_kg: 12, reps: 10, completed: false },
          { set_number: 2, weight_kg: 12, reps: 10, completed: false },
        ],
      },
    ],
  },
  {
    id: "gym_legs",
    name: "Gym Leg Day (สควอท/เดดลิฟท์/ขาครบมัด)",
    category: "gym",
    badge: "🏋️ ยิม/มีอุปกรณ์",
    description: "Barbell Squat, Romanian Deadlift, Leg Press, Calf Raises",
    duration: 50,
    exercises: [
      {
        name: "Barbell Squat",
        muscle_group: "legs",
        sets: [
          { set_number: 1, weight_kg: 60, reps: 10, completed: false },
          { set_number: 2, weight_kg: 70, reps: 8, completed: false },
          { set_number: 3, weight_kg: 80, reps: 6, completed: false },
        ],
      },
      {
        name: "Romanian Deadlift",
        muscle_group: "legs",
        sets: [
          { set_number: 1, weight_kg: 50, reps: 10, completed: false },
          { set_number: 2, weight_kg: 60, reps: 8, completed: false },
        ],
      },
      {
        name: "Leg Press",
        muscle_group: "legs",
        sets: [
          { set_number: 1, weight_kg: 100, reps: 12, completed: false },
          { set_number: 2, weight_kg: 120, reps: 10, completed: false },
        ],
      },
      {
        name: "Calf Raises (เขย่งปลายเท้า)",
        muscle_group: "legs",
        sets: [
          { set_number: 1, weight_kg: 30, reps: 15, completed: false },
          { set_number: 2, weight_kg: 30, reps: 15, completed: false },
        ],
      },
    ],
  },
  {
    id: "gym_upper",
    name: "Gym Upper Body (ช่วงบนรวม ดัมเบล)",
    category: "gym",
    badge: "🏋️ ยิม/มีอุปกรณ์",
    description: "Dumbbell Bench Press, Lat Pulldown, Lateral Raise, Hammer Curls",
    duration: 40,
    exercises: [
      {
        name: "Dumbbell Bench Press",
        muscle_group: "chest",
        sets: [
          { set_number: 1, weight_kg: 20, reps: 10, completed: false },
          { set_number: 2, weight_kg: 22, reps: 8, completed: false },
        ],
      },
      {
        name: "Lat Pulldown",
        muscle_group: "back",
        sets: [
          { set_number: 1, weight_kg: 45, reps: 10, completed: false },
          { set_number: 2, weight_kg: 50, reps: 8, completed: false },
        ],
      },
      {
        name: "Dumbbell Lateral Raise",
        muscle_group: "shoulders",
        sets: [
          { set_number: 1, weight_kg: 8, reps: 12, completed: false },
          { set_number: 2, weight_kg: 8, reps: 12, completed: false },
        ],
      },
      {
        name: "Hammer Curls",
        muscle_group: "arms",
        sets: [
          { set_number: 1, weight_kg: 12, reps: 10, completed: false },
          { set_number: 2, weight_kg: 12, reps: 10, completed: false },
        ],
      },
    ],
  },

  // --- ⚡ โปรแกรมด่วน 10-15 นาที ---
  {
    id: "quick_desk",
    name: "Desk Worker Stretch (แก้ Office Syndrome)",
    category: "quick",
    badge: "⚡ ด่วน 10 นาที",
    description: "ยืดกล้ามเนื้อคอบ่าไหล่, สะโพก, หมุนแขน สำหรับคนนั่งทำงานนาน",
    duration: 10,
    exercises: [
      {
        name: "Stretching (ยืดเหยียดกล้ามเนื้อ)",
        muscle_group: "other",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 60, completed: false },
          { set_number: 2, weight_kg: 0, reps: 60, completed: false },
        ],
      },
      {
        name: "Arm Circles (หมุนแขน)",
        muscle_group: "shoulders",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 20, completed: false },
        ],
      },
      {
        name: "Superman (นอนแอ่นหลัง)",
        muscle_group: "back",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 10, completed: false },
        ],
      },
    ],
  },
  {
    id: "quick_15m_burn",
    name: "Quick 15-Min Fat Burn (เบิร์นด่วน 15 นาที)",
    category: "quick",
    badge: "⚡ ด่วน 15 นาที",
    description: "กระโดดตบ, วิ่งยกเข่าสูง, วิ่งปีนเขา, แพลงก์ เร่งเหงื่อประหยัดเวลา",
    duration: 15,
    exercises: [
      {
        name: "Jumping Jacks (กระโดดตบ)",
        muscle_group: "cardio",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 30, completed: false },
          { set_number: 2, weight_kg: 0, reps: 30, completed: false },
        ],
      },
      {
        name: "High Knees (วิ่งยกเข่าสูง)",
        muscle_group: "cardio",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 30, completed: false },
        ],
      },
      {
        name: "Mountain Climbers (วิ่งปีนเขา)",
        muscle_group: "core",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 20, completed: false },
        ],
      },
      {
        name: "Plank (แพลงก์)",
        muscle_group: "core",
        sets: [
          { set_number: 1, weight_kg: 0, reps: 30, completed: false },
        ],
      },
    ],
  },
]

export type MuscleSetsMap = Record<string, number>

export function calculateMuscleSets(
  workouts: Array<{ workout_date: string; exercises?: any[] }>,
  timeRange: "week" | "30d" | "90d" | "all"
): MuscleSetsMap {
  const now = new Date()
  let cutoffDate: Date | null = null

  if (timeRange === "week") {
    cutoffDate = new Date(now)
    cutoffDate.setDate(now.getDate() - 7)
  } else if (timeRange === "30d") {
    cutoffDate = new Date(now)
    cutoffDate.setDate(now.getDate() - 30)
  } else if (timeRange === "90d") {
    cutoffDate = new Date(now)
    cutoffDate.setDate(now.getDate() - 90)
  }

  const result: MuscleSetsMap = {
    chest: 0,
    back: 0,
    legs: 0,
    shoulders: 0,
    arms: 0,
    core: 0,
    cardio: 0,
    other: 0,
  }

  for (const w of workouts) {
    if (!w.workout_date) continue
    if (cutoffDate) {
      const wDate = new Date(w.workout_date)
      if (wDate < cutoffDate) continue
    }

    if (Array.isArray(w.exercises)) {
      for (const ex of w.exercises) {
        const mg = ex.muscle_group || "other"
        const completedSets = Array.isArray(ex.sets)
          ? ex.sets.filter((s: any) => s.completed === true).length
          : 0
        result[mg] = (result[mg] || 0) + completedSets
      }
    }
  }

  return result
}

export function isWorkoutCompleted(w: {
  workout_date?: string
  exercises?: any[]
  duration_minutes?: number
}): boolean {
  if (Array.isArray(w.exercises) && w.exercises.length > 0) {
    return w.exercises.some((ex) =>
      Array.isArray(ex.sets) && ex.sets.some((s: any) => s.completed === true)
    )
  }
  return (Number(w.duration_minutes) || 0) > 0
}

export function calculateWeekStreak(
  workouts: Array<{ workout_date: string; exercises?: any[]; duration_minutes?: number; total_volume_kg?: number | string }>
): number {
  if (!workouts || workouts.length === 0) return 0

  const validWorkouts = workouts.filter((w) => Boolean(w.workout_date) && isWorkoutCompleted(w))

  if (validWorkouts.length === 0) return 0
  const workoutDates = new Set(validWorkouts.map((w) => w.workout_date).filter(Boolean))
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get week key (YYYY-Www)
  const getWeekKey = (d: Date) => {
    const target = new Date(d.valueOf())
    const dayNr = (d.getDay() + 6) % 7
    target.setDate(target.getDate() - dayNr + 3)
    const firstThursday = target.valueOf()
    target.setMonth(0, 1)
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7))
    }
    const weekNr = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000)
    return `${target.getFullYear()}-W${String(weekNr).padStart(2, "0")}`
  }

  const activeWeeks = new Set<string>()
  for (const dStr of workoutDates) {
    activeWeeks.add(getWeekKey(new Date(dStr)))
  }

  let streak = 0
  const checkDate = new Date(today)
  const currentWeekKey = getWeekKey(checkDate)

  // If current week has workout, streak starts from current week.
  // Otherwise if last week has workout, start from last week.
  if (activeWeeks.has(currentWeekKey)) {
    streak = 1
    checkDate.setDate(checkDate.getDate() - 7)
  } else {
    checkDate.setDate(checkDate.getDate() - 7)
    if (!activeWeeks.has(getWeekKey(checkDate))) {
      return 0
    }
    streak = 1
    checkDate.setDate(checkDate.getDate() - 7)
  }

  while (activeWeeks.has(getWeekKey(checkDate))) {
    streak++
    checkDate.setDate(checkDate.getDate() - 7)
  }

  return streak
}

export function calculate30dVolume(
  workouts: Array<{ workout_date: string; total_volume_kg?: number | string }>
): number {
  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setDate(now.getDate() - 30)

  return workouts.reduce((sum, w) => {
    if (!w.workout_date) return sum
    if (new Date(w.workout_date) >= cutoff) {
      return sum + (Number(w.total_volume_kg) || 0)
    }
    return sum
  }, 0)
}


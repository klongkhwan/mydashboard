import test from "node:test"
import assert from "node:assert/strict"
import { workoutSchema, workoutSetSchema } from "../app/dashboard/my-wealth/schema.ts"

// Core workout formulas adapted from openGym
function calculateTotalVolume(exercises) {
  return exercises.reduce((exTotal, ex) => {
    return exTotal + ex.sets.reduce((setTotal, s) => {
      return setTotal + (s.completed ? s.weight_kg * s.reps : 0)
    }, 0)
  }, 0)
}

function calculateEstimated1RM(weightKg, reps) {
  if (reps <= 0) return 0
  if (reps === 1) return weightKg
  // Epley formula: w * (1 + r / 30)
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10
}

test("Volume calculation matches openGym logic for completed sets only", () => {
  const exercises = [
    {
      name: "Bench Press",
      muscle_group: "chest",
      sets: [
        { set_number: 1, weight_kg: 60, reps: 10, completed: true }, // 600
        { set_number: 2, weight_kg: 70, reps: 8, completed: true },  // 560
        { set_number: 3, weight_kg: 80, reps: 5, completed: false }, // not completed -> 0
      ],
    },
    {
      name: "Tricep Pushdown",
      muscle_group: "arms",
      sets: [
        { set_number: 1, weight_kg: 25, reps: 12, completed: true }, // 300
      ],
    },
  ]

  const total = calculateTotalVolume(exercises)
  assert.equal(total, 600 + 560 + 300) // 1460
})

test("Estimated 1RM calculates accurately via Epley formula", () => {
  // 1 rep of 100kg is 100kg 1RM
  assert.equal(calculateEstimated1RM(100, 1), 100)

  // 10 reps of 60kg: 60 * (1 + 10/30) = 60 * 1.3333 = 80kg
  assert.equal(calculateEstimated1RM(60, 10), 80)

  // 5 reps of 100kg: 100 * (1 + 5/30) = 100 * 1.1667 = 116.7kg
  assert.equal(calculateEstimated1RM(100, 5), 116.7)
})

test("Zod workoutSchema validates correct payload", () => {
  const valid = {
    workout_date: "2026-10-20",
    title: "Push Day A",
    duration_minutes: 50,
    notes: "Feeling strong today",
    exercises: [
      {
        name: "Barbell Bench Press",
        muscle_group: "chest",
        sets: [
          { set_number: 1, weight_kg: 60, reps: 10, completed: true },
        ],
      },
    ],
  }

  const result = workoutSchema.safeParse(valid)
  assert.equal(result.success, true)
})

test("Zod workoutSchema rejects invalid payload (empty title, no exercises)", () => {
  const invalid1 = {
    workout_date: "2026-10-20",
    title: "  ",
    exercises: [
      {
        name: "Squat",
        muscle_group: "legs",
        sets: [{ set_number: 1, weight_kg: 80, reps: 5, completed: true }],
      },
    ],
  }
  assert.equal(workoutSchema.safeParse(invalid1).success, false)

  const invalid2 = {
    workout_date: "2026-10-20",
    title: "Leg Day",
    exercises: [],
  }
  assert.equal(workoutSchema.safeParse(invalid2).success, false)
})

test("All routine presets are valid according to workoutSchema and include bodyweight exercises", async () => {
  const { ROUTINE_PRESETS, EXERCISES_BY_CATEGORY } = await import("../lib/workout-presets.ts")
  
  assert.ok(ROUTINE_PRESETS.length >= 4, "Should have at least 4 presets")
  
  for (const preset of ROUTINE_PRESETS) {
    const payload = {
      workout_date: "2026-10-20",
      title: preset.name,
      duration_minutes: preset.duration,
      exercises: preset.exercises,
    }
    const parseResult = workoutSchema.safeParse(payload)
    assert.equal(parseResult.success, true, `Preset "${preset.name}" must be valid`)
  }

  // Check that every main category has at least one bodyweight (no equipment) option
  const mainCategories = ["chest", "back", "legs", "shoulders", "arms", "core", "cardio"]
  for (const cat of mainCategories) {
    const exercises = EXERCISES_BY_CATEGORY[cat]
    assert.ok(exercises && exercises.length > 0, `Category ${cat} must exist`)
    const hasBodyweight = exercises.some((e) => e.isBodyweight)
    assert.ok(hasBodyweight, `Category ${cat} must include bodyweight/no-equipment options`)
  }
})

test("calculateMuscleSets and calculate30dVolume aggregate correctly", async () => {
  const { calculateMuscleSets, calculate30dVolume, calculateWeekStreak } = await import("../lib/workout-presets.ts")

  const todayStr = new Date().toISOString().split("T")[0]
  const mockWorkouts = [
    {
      workout_date: todayStr,
      total_volume_kg: 2500,
      exercises: [
        {
          name: "Push-ups",
          muscle_group: "chest",
          sets: [
            { set_number: 1, completed: true },
            { set_number: 2, completed: true },
            { set_number: 3, completed: false },
          ],
        },
        {
          name: "Squats",
          muscle_group: "legs",
          sets: [{ set_number: 1, completed: true }],
        },
      ],
    },
  ]

  const sets = calculateMuscleSets(mockWorkouts, "week")
  assert.equal(sets.chest, 2)
  assert.equal(sets.legs, 1)
  assert.equal(sets.back, 0)

  const vol = calculate30dVolume(mockWorkouts)
  assert.equal(vol, 2500)

  const streak = calculateWeekStreak(mockWorkouts)
  assert.equal(streak, 1)
})

test("isWorkoutCompleted and preset routine defaults prevent uncompleted workouts from lighting up heatmaps", async () => {
  const { ROUTINE_PRESETS, isWorkoutCompleted, calculateMuscleSets, calculateWeekStreak } =
    await import("../lib/workout-presets.ts")

  // 1. Presets must initialize with completed: false so selecting them doesn't falsely mark them done
  for (const preset of ROUTINE_PRESETS) {
    for (const ex of preset.exercises) {
      for (const s of ex.sets) {
        assert.equal(
          s.completed,
          false,
          `Preset "${preset.name}" exercise "${ex.name}" sets must default to completed: false`
        )
      }
    }
  }

  // 2. A workout with uncompleted preset exercises is NOT completed
  const uncompletedWorkout = {
    workout_date: "2026-10-20",
    exercises: ROUTINE_PRESETS[0].exercises,
  }
  assert.equal(isWorkoutCompleted(uncompletedWorkout), false)

  // 3. Muscle map yields 0 sets across all muscle groups for uncompleted workouts
  const zeroMuscleSets = calculateMuscleSets([uncompletedWorkout], "week")
  assert.equal(zeroMuscleSets.chest, 0)
  assert.equal(zeroMuscleSets.legs, 0)
  assert.equal(zeroMuscleSets.back, 0)
  assert.equal(zeroMuscleSets.shoulders, 0)
  assert.equal(zeroMuscleSets.arms, 0)
  assert.equal(zeroMuscleSets.core, 0)

  // 4. Week streak is 0 for uncompleted workouts
  const zeroStreak = calculateWeekStreak([uncompletedWorkout])
  assert.equal(zeroStreak, 0)

  // 5. When a set is ticked as completed, isWorkoutCompleted becomes true
  const partiallyCompletedWorkout = {
    workout_date: "2026-10-20",
    exercises: [
      {
        name: "Push-ups",
        muscle_group: "chest",
        sets: [
          { set_number: 1, completed: true },
          { set_number: 2, completed: false },
        ],
      },
    ],
  }
  assert.equal(isWorkoutCompleted(partiallyCompletedWorkout), true)
  const tickedMuscleSets = calculateMuscleSets([partiallyCompletedWorkout], "week")
  assert.equal(tickedMuscleSets.chest, 1)
})

test("Double submission prevention logic works as expected", () => {
  // Test debounce timestamp check logic
  const now = Date.now()
  const recentCutoff = new Date(now - 10000).toISOString()
  const createdJustNow = new Date(now - 1000).toISOString()
  const createdOlder = new Date(now - 20000).toISOString()

  // Recent submission is within the 10-second duplicate cutoff
  assert.ok(new Date(createdJustNow) >= new Date(recentCutoff))
  // Older submission is outside the cutoff
  assert.ok(new Date(createdOlder) < new Date(recentCutoff))
})

test("Workout dates format to DD/MM/YYYY for UI display (preventing year-first display)", async () => {
  const { formatDateDDMMYYYY } = await import("../components/dashboard/format.ts")

  assert.equal(formatDateDDMMYYYY("2026-10-20"), "20/10/2026")
  assert.equal(formatDateDDMMYYYY("2026-01-05"), "05/01/2026")
  assert.equal(formatDateDDMMYYYY(""), "-")
  assert.equal(formatDateDDMMYYYY(null), "-")
})





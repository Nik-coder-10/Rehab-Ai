"""Database seed script for demo patient, doctor, clinical exercises, plan & sample progress."""

import datetime
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.doctor import DoctorProfile, PatientDoctor, PatientProfile
from app.models.exercise import Exercise, ExerciseCategory
from app.models.plan import PlanExercise, PlanStatus, RehabilitationPlan
from app.models.session import ExerciseMetric, ExerciseSession, ProgressRecord, SessionStatus
from app.models.user import User, UserRole


def seed_db():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        # 1. Check or create demo Doctor
        doctor_user = db.scalar(select(User).where(User.email == "doctor@rehabai.com"))
        if not doctor_user:
            doctor_user = User(
                email="doctor@rehabai.com",
                password_hash=hash_password("DoctorPass123!"),
                full_name="Dr. Elena Vance, DPT",
                role=UserRole.doctor,
            )
            doctor_profile = DoctorProfile(
                specialization="Orthopedic Rehabilitation & Sports Physical Therapy",
                organization="Apex Physical Therapy & Sports Medicine Institute",
                license_number="PT-CA-984210",
            )
            doctor_user.doctor_profile = doctor_profile
            db.add(doctor_user)
            db.commit()
            db.refresh(doctor_user)
            print("Seeded Doctor: doctor@rehabai.com")

        # 2. Check or create demo Patient
        patient_user = db.scalar(select(User).where(User.email == "patient@rehabai.com"))
        if not patient_user:
            patient_user = User(
                email="patient@rehabai.com",
                password_hash=hash_password("PatientPass123!"),
                full_name="Marcus Sterling",
                role=UserRole.patient,
            )
            patient_profile = PatientProfile(
                date_of_birth=datetime.date(1992, 6, 15),
                height_cm=182.0,
                weight_kg=78.5,
                medical_conditions="Post-operative Right ACL Reconstruction (Week 6), mild patellofemoral inflammation.",
                notes="Patient is advancing through Phase 2 knee rehabilitation. Focus on terminal extension and quadriceps hypertrophy.",
            )
            patient_user.patient_profile = patient_profile
            db.add(patient_user)
            db.commit()
            db.refresh(patient_user)
            print("Seeded Patient: patient@rehabai.com")

        # Ensure patient-doctor association
        doc_profile = doctor_user.doctor_profile
        pat_profile = patient_user.patient_profile
        assoc = db.scalar(
            select(PatientDoctor).where(
                PatientDoctor.patient_profile_id == pat_profile.id,
                PatientDoctor.doctor_profile_id == doc_profile.id,
            )
        )
        if not assoc:
            new_assoc = PatientDoctor(
                patient_profile_id=pat_profile.id,
                doctor_profile_id=doc_profile.id,
            )
            db.add(new_assoc)
            db.commit()

        # 3. Seed Standard Clinical Exercises
        exercises_data = [
            {
                "code": "seated_knee_extension",
                "name": "Seated Knee Extension",
                "description": "Strengthens the quadriceps femoris through active knee extension from a 90-degree flexed seated posture.",
                "category": ExerciseCategory.strength,
                "instructions": "1. Sit upright on a stable chair with back supported and knees bent at 90 degrees.\n2. Slowly extend your affected knee until the leg is parallel to the floor.\n3. Hold the peak contraction for 2 seconds while engaging the quad.\n4. Lower your leg back smoothly to starting position over 3 seconds.",
                "default_engine_config": {
                    "target_joint": "right_knee",
                    "landmarks": ["right_hip", "right_knee", "right_ankle"],
                    "min_rom_angle_deg": 10.0,
                    "target_rom_angle_deg": 85.0,
                    "cadence_sec": 4.0,
                },
            },
            {
                "code": "standing_shoulder_abduction",
                "name": "Standing Shoulder Abduction",
                "description": "Improves middle deltoid and supraspinatus strength and coronal plane glenohumeral range of motion.",
                "category": ExerciseCategory.mobility,
                "instructions": "1. Stand tall with feet shoulder-width apart and arms hanging at your sides.\n2. Keeping your elbow straight and thumb pointed upward, raise your arm out to the side.\n3. Ascend smoothly to shoulder level (90 degrees) or prescribed target.\n4. Avoid shrugging your shoulder blade; lower slowly under control.",
                "default_engine_config": {
                    "target_joint": "right_shoulder",
                    "landmarks": ["right_hip", "right_shoulder", "right_elbow"],
                    "min_rom_angle_deg": 15.0,
                    "target_rom_angle_deg": 90.0,
                    "cadence_sec": 3.5,
                },
            },
            {
                "code": "sit_to_stand_squat",
                "name": "Chair Sit-to-Stand (Functional Squat)",
                "description": "Functional closed kinetic chain exercise targeting gluteal complex, quadriceps, and core motor coordination.",
                "category": ExerciseCategory.strength,
                "instructions": "1. Position yourself on a firm chair with feet flat and hip-width apart.\n2. Cross arms over your chest or extend forward for balance.\n3. Lean forward slightly from the hips and push through your midfoot to stand completely.\n4. Pause for 1 second, then slowly hinge hips back and sit down without dropping.",
                "default_engine_config": {
                    "target_joint": "knee_hip_compound",
                    "landmarks": ["shoulder", "hip", "knee", "ankle"],
                    "target_rom_angle_deg": 90.0,
                    "cadence_sec": 4.0,
                },
            },
            {
                "code": "standing_bicep_curl",
                "name": "Controlled Bicep Curl",
                "description": "Isolates the biceps brachii and brachialis while enforcing upright spinal posture and elbow stability.",
                "category": ExerciseCategory.strength,
                "instructions": "1. Stand with core braced and elbows pinned gently beside your torso.\n2. Curl forearm upward towards anterior shoulder while exhaling.\n3. Squeeze at the top position without swinging the torso.\n4. Lower slowly with full eccentric control over 3 seconds.",
                "default_engine_config": {
                    "target_joint": "elbow",
                    "landmarks": ["shoulder", "elbow", "wrist"],
                    "target_rom_angle_deg": 130.0,
                    "cadence_sec": 3.0,
                },
            },
            {
                "code": "ankle_dorsiflexion_stretch",
                "name": "Gastrocnemius Wall Stretch & Ankle Dorsiflexion",
                "description": "Lengthens calf musculature and increases talocrural dorsiflexion mobility.",
                "category": ExerciseCategory.stretching,
                "instructions": "1. Face a wall with hands placed flat at shoulder height.\n2. Place affected leg straight back with heel pressed firmly into the floor.\n3. Bend the front knee and gently shift weight forward until a stretch is felt in the back calf.\n4. Hold stationary for 20-30 seconds per repetition without bouncing.",
                "default_engine_config": {
                    "target_joint": "ankle",
                    "landmarks": ["knee", "ankle", "foot_index"],
                    "target_rom_angle_deg": 25.0,
                    "cadence_sec": 20.0,
                },
            },
        ]

        created_exercises = []
        for ed in exercises_data:
            ex = db.scalar(select(Exercise).where(Exercise.code == ed["code"]))
            if not ex:
                ex = Exercise(
                    code=ed["code"],
                    name=ed["name"],
                    description=ed["description"],
                    category=ed["category"],
                    instructions=ed["instructions"],
                    default_engine_config=ed["default_engine_config"],
                    created_by=doctor_user.id,
                )
                db.add(ex)
                db.commit()
                db.refresh(ex)
                print(f"Seeded Exercise: {ex.name}")
            created_exercises.append(ex)

        # 4. Seed Active Rehabilitation Plan for Patient
        existing_plan = db.scalar(
            select(RehabilitationPlan).where(
                RehabilitationPlan.patient_profile_id == pat_profile.id,
                RehabilitationPlan.status == PlanStatus.active,
            )
        )
        if not existing_plan:
            plan = RehabilitationPlan(
                patient_profile_id=pat_profile.id,
                doctor_profile_id=doc_profile.id,
                title="Phase 2 ACL Recovery & Quadriceps Reactivation",
                description="Prescription focusing on progressive resistance, quadriceps hypertrophy, joint stabilization, and functional neuromuscular control.",
                status=PlanStatus.active,
                start_date=datetime.date.today() - datetime.timedelta(days=14),
                end_date=datetime.date.today() + datetime.timedelta(days=28),
            )
            db.add(plan)
            db.commit()
            db.refresh(plan)

            # Assign exercises to plan
            plan_assignments = [
                (created_exercises[0], 1, 3, 12, 85.0, 5, "Focus on smooth 2-second hold at full extension."),
                (created_exercises[2], 2, 3, 10, 90.0, 4, "Ensure equal weight distribution across both heels."),
                (created_exercises[1], 3, 2, 10, 90.0, 3, "Keep neck relaxed and scapula retracted."),
                (created_exercises[4], 4, 3, 5, 25.0, 7, "Hold each stretch for 20 seconds. No bouncing."),
            ]

            for ex_obj, order, sets, reps, rom, freq, override in plan_assignments:
                pe = PlanExercise(
                    plan_id=plan.id,
                    exercise_id=ex_obj.id,
                    order_index=order,
                    target_sets=sets,
                    target_reps=reps,
                    target_rom_degrees=rom,
                    frequency_per_week=freq,
                    instructions_override=override,
                )
                db.add(pe)

            db.commit()
            print("Seeded Rehabilitation Plan with 4 assigned exercises.")

        # 5. Seed Historical Sessions & Progress Records
        existing_sessions_count = db.scalar(
            select(func.count(ExerciseSession.id)).where(ExerciseSession.patient_profile_id == pat_profile.id)
        ) or 0

        if existing_sessions_count == 0:
            now = datetime.datetime.now(datetime.timezone.utc)
            # Create 3 past sessions
            for i in range(3, 0, -1):
                sess_time = now - datetime.timedelta(days=i * 2, hours=3)
                sess = ExerciseSession(
                    patient_profile_id=pat_profile.id,
                    exercise_id=created_exercises[0].id,
                    status=SessionStatus.completed,
                    started_at=sess_time,
                    ended_at=sess_time + datetime.timedelta(minutes=8),
                    created_at=sess_time,
                )
                db.add(sess)
                db.commit()
                db.refresh(sess)

                # Add rep metrics
                for r in range(1, 11):
                    m = ExerciseMetric(
                        session_id=sess.id,
                        rep_index=r,
                        performed_at=sess_time + datetime.timedelta(seconds=r * 25),
                        rom_min_deg=12.0,
                        rom_max_deg=75.0 + (3 - i) * 3.5,
                        form_score=82.0 + (3 - i) * 4.0,
                        form_issues=[],
                        valid=True,
                    )
                    db.add(m)

                # Add Progress record
                pr = ProgressRecord(
                    patient_profile_id=pat_profile.id,
                    session_id=sess.id,
                    metric="knee_extension_rom_deg",
                    value=75.0 + (3 - i) * 3.5,
                    unit="deg",
                    recorded_at=sess_time,
                )
                db.add(pr)

            db.commit()
            print("Seeded 3 past exercise sessions and progress records.")

        print("Seeding completed successfully!")
    finally:
        db.close()


if __name__ == "__main__":
    from sqlalchemy import func
    seed_db()

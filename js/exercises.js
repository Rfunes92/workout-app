/* Exercise library + equipment catalog. Plain globals, no build step. */
(function () {
  'use strict';

  const EQUIPMENT_GROUPS = [
    { group: 'Free weights', items: [
      ['dumbbells', 'Dumbbells'], ['barbell', 'Barbell + plates'], ['ez_bar', 'EZ curl bar'], ['kettlebells', 'Kettlebells']] },
    { group: 'Benches & racks', items: [
      ['bench_flat', 'Flat bench'], ['bench_adjustable', 'Adjustable (incline) bench'], ['rack', 'Squat / power rack'],
      ['smith', 'Smith machine'], ['pullup_bar', 'Pull-up bar'], ['dip_station', 'Dip station / parallel bars'],
      ['plyo_box', 'Plyo box / step'], ['back_ext', 'Back extension (hyper) bench']] },
    { group: 'Cables & machines', items: [
      ['cable', 'Cable station / functional trainer'], ['lat_pulldown', 'Lat pulldown'], ['seated_row', 'Seated cable row'],
      ['chest_press_machine', 'Chest press machine'], ['pec_deck', 'Pec deck / rear delt fly'], ['shoulder_press_machine', 'Shoulder press machine'],
      ['leg_press', 'Leg press'], ['hack_squat', 'Hack squat'], ['leg_ext', 'Leg extension'], ['leg_curl', 'Leg curl'],
      ['hip_abductor', 'Hip abductor / adductor machine'], ['calf_machine', 'Calf raise machine'], ['assisted_pullup', 'Assisted pull-up / dip machine']] },
    { group: 'Accessories', items: [
      ['bands', 'Resistance bands'], ['trx', 'Suspension trainer (TRX)'], ['medicine_ball', 'Medicine ball'], ['stability_ball', 'Stability ball'],
      ['ab_wheel', 'Ab wheel'], ['jump_rope', 'Jump rope'], ['mat', 'Exercise mat'], ['foam_roller', 'Foam roller'], ['heavy_bag', 'Heavy bag']] },
    { group: 'Cardio', items: [
      ['treadmill', 'Treadmill'], ['bike', 'Stationary / air bike'], ['rower', 'Rowing machine'], ['elliptical', 'Elliptical'], ['stairmaster', 'StairMaster / stepmill']] }
  ];
  const EQUIPMENT = {};
  EQUIPMENT_GROUPS.forEach(g => g.items.forEach(([id, label]) => { EQUIPMENT[id] = { id, label, group: g.group }; }));
  const ALL_IDS = Object.keys(EQUIPMENT);

  const PRESETS = {
    gym: { label: 'Full commercial gym', items: ALL_IDS.filter(id => !['heavy_bag', 'trx'].includes(id)) },
    muaythai: { label: 'Muay Thai gym', items: ['heavy_bag', 'jump_rope', 'mat', 'bands'] },
    home: { label: 'Home basics', items: ['dumbbells', 'bench_adjustable', 'bands', 'pullup_bar', 'mat'] },
    home_full: { label: 'Home – full garage gym', items: ['dumbbells', 'barbell', 'bench_adjustable', 'bench_flat', 'rack', 'pullup_bar', 'bands', 'kettlebells', 'cable', 'mat', 'jump_rope', 'foam_roller', 'plyo_box'] }
  };

  const MUSCLES = {
    chest: 'Chest', front_delts: 'Front delts', side_delts: 'Side delts', rear_delts: 'Rear delts',
    biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms', abs: 'Abs', obliques: 'Obliques',
    quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves', lats: 'Lats',
    traps: 'Traps', upper_back: 'Upper back (rhomboids)', lower_back: 'Lower back', adductors: 'Adductors',
    abductors: 'Abductors (glute med)', hip_flexors: 'Hip flexors'
  };

  // req: list of requirements; "a|b" = any of. Bodyweight needs nothing.
  const B = 'bench_flat|bench_adjustable';
  const L = [];
  function E(id, name, req, slots, pattern, primary, secondary, kind, cues, extra) {
    L.push(Object.assign({ id, name, req, slots, pattern, primary, secondary, kind, cues }, extra || {}));
  }

  // ---------- Horizontal push ----------
  E('bb_bench', 'Barbell Bench Press', ['barbell', B, 'rack'], ['hpush'], 'bench', ['chest'], ['front_delts', 'triceps'], 'compound',
    ['Eyes under the bar, shoulder blades pinched and down, feet planted.', 'Grip just outside shoulder width; unrack with straight arms.', 'Lower to mid/lower chest with elbows ~45°.', 'Press up and slightly back; keep butt on the bench.']);
  E('db_bench', 'Dumbbell Bench Press', ['dumbbells', B], ['hpush'], 'bench', ['chest'], ['front_delts', 'triceps'], 'compound',
    ['Kick dumbbells up from your knees as you lie back.', 'Retract shoulder blades, slight arch, feet flat.', 'Lower until a deep chest stretch, elbows ~45°.', 'Press up and slightly in without clanking the bells.']);
  E('machine_chest_press', 'Machine Chest Press', ['chest_press_machine'], ['hpush'], 'bench', ['chest'], ['front_delts', 'triceps'], 'compound',
    ['Set the seat so handles line up with mid-chest.', 'Shoulder blades back against the pad.', 'Press out smoothly without locking hard.', 'Control the return for 2–3 seconds.']);
  E('pushup', 'Push-Up', [], ['hpush', 'triceps'], 'pushup', ['chest'], ['front_delts', 'triceps', 'abs'], 'compound',
    ['Hands just wider than shoulders, body in a straight line.', 'Brace abs and squeeze glutes.', 'Lower chest to an inch off the floor, elbows ~45°.', 'Push the floor away. Elevate hands to make it easier.']);
  E('band_pushup', 'Banded Push-Up', ['bands'], ['hpush'], 'pushup', ['chest'], ['front_delts', 'triceps', 'abs'], 'compound',
    ['Loop a band across your upper back, ends under your hands.', 'Same straight-line plank as a push-up.', 'Lower under control.', 'Drive up hard against the band at the top.']);
  E('incline_db_press', 'Incline Dumbbell Press', ['dumbbells', 'bench_adjustable'], ['incline', 'hpush'], 'bench', ['chest', 'front_delts'], ['triceps'], 'compound',
    ['Set bench to 30–45°.', 'Dumbbells at upper-chest level, elbows slightly tucked.', 'Press up over the upper chest.', 'Lower slowly to a full stretch.']);
  E('incline_bb_press', 'Incline Barbell Press', ['barbell', 'bench_adjustable', 'rack'], ['incline'], 'bench', ['chest', 'front_delts'], ['triceps'], 'compound',
    ['Bench at 30°, set safeties.', 'Lower the bar to the upper chest.', 'Keep shoulder blades pinned.', 'Press straight up over the collarbone.']);
  E('smith_incline', 'Smith Machine Incline Press', ['smith', 'bench_adjustable'], ['incline'], 'bench', ['chest', 'front_delts'], ['triceps'], 'compound',
    ['Bench at 30° under the Smith bar.', 'Bar should touch upper chest at the bottom.', 'Rotate to unhook, lower for 2–3s.', 'Press smoothly; re-hook at the end.']);
  E('cable_fly', 'Cable Fly', ['cable'], ['fly'], 'fly', ['chest'], ['front_delts'], 'iso',
    ['Pulleys at shoulder height, staggered stance.', 'Slight bend in elbows, kept fixed.', 'Hug a big tree until hands meet in front.', 'Open slowly to a stretch.']);
  E('pec_deck', 'Pec Deck Fly', ['pec_deck'], ['fly'], 'fly', ['chest'], ['front_delts'], 'iso',
    ['Seat so handles are at chest height.', 'Soft elbows, chest up.', 'Bring handles together and squeeze 1s.', 'Return slowly to a stretch.']);
  E('db_fly', 'Dumbbell Fly', ['dumbbells', B], ['fly'], 'fly', ['chest'], ['front_delts'], 'iso',
    ['Lie on bench, dumbbells over chest, palms facing.', 'Slight elbow bend; open arms wide.', 'Stop at a comfortable stretch.', 'Squeeze back up like hugging a barrel.']);
  E('dips', 'Chest Dip', ['dip_station|assisted_pullup'], ['hpush', 'triceps'], 'dip', ['chest', 'triceps'], ['front_delts'], 'compound',
    ['Support yourself on the bars, arms locked.', 'Lean slightly forward for chest.', 'Lower until upper arms are about parallel.', 'Press back up; use assist if needed.']);

  // ---------- Vertical push ----------
  E('bb_ohp', 'Barbell Overhead Press', ['barbell', 'rack'], ['vpush'], 'press', ['front_delts'], ['side_delts', 'triceps', 'abs'], 'compound',
    ['Bar on front of shoulders, grip just outside shoulders.', 'Squeeze glutes and brace hard.', 'Press straight up, moving head back then through.', 'Lock out overhead, biceps by ears.']);
  E('db_shoulder_press', 'Seated Dumbbell Shoulder Press', ['dumbbells', 'bench_adjustable'], ['vpush'], 'press', ['front_delts'], ['side_delts', 'triceps'], 'compound',
    ['Bench upright (80–90°).', 'Dumbbells at ear height, palms forward.', 'Press up and slightly in.', 'Lower to ear level with control.']);
  E('standing_db_press', 'Standing Dumbbell Press', ['dumbbells'], ['vpush'], 'press', ['front_delts'], ['side_delts', 'triceps', 'abs'], 'compound',
    ['Feet hip-width, ribs down, glutes tight.', 'Dumbbells at shoulders.', 'Press overhead without leaning back.', 'Lower under control.']);
  E('machine_shoulder_press', 'Machine Shoulder Press', ['shoulder_press_machine'], ['vpush'], 'press', ['front_delts'], ['side_delts', 'triceps'], 'compound',
    ['Handles start around chin level.', 'Back flat on pad.', 'Press up without shrugging.', 'Slow 2–3s lowering.']);
  E('arnold_press', 'Arnold Press', ['dumbbells'], ['vpush'], 'press', ['front_delts', 'side_delts'], ['triceps'], 'compound',
    ['Start with palms facing you at chin height.', 'Rotate palms forward as you press up.', 'Finish overhead, palms forward.', 'Reverse the rotation on the way down.']);
  E('kb_press', 'Kettlebell Overhead Press', ['kettlebells'], ['vpush'], 'press', ['front_delts'], ['side_delts', 'triceps', 'abs'], 'compound',
    ['Bell in rack position, wrist straight.', 'Brace and squeeze glutes.', 'Press up, rotating palm forward.', 'Lower back to rack.']);
  E('band_ohp', 'Band Overhead Press', ['bands'], ['vpush'], 'press', ['front_delts'], ['side_delts', 'triceps'], 'compound',
    ['Stand on the band, handles at shoulders.', 'Brace, ribs down.', 'Press overhead to lockout.', 'Lower slowly.']);
  E('pike_pushup', 'Pike Push-Up', [], ['vpush'], 'pushup', ['front_delts'], ['triceps', 'side_delts'], 'compound',
    ['Hips high in an inverted V.', 'Lower your head toward the floor between hands.', 'Elbows track back at ~45°.', 'Press up; elevate feet to progress.']);

  // ---------- Horizontal pull ----------
  E('bb_row', 'Barbell Bent-Over Row', ['barbell'], ['hpull'], 'row', ['upper_back', 'lats'], ['rear_delts', 'biceps', 'lower_back'], 'compound',
    ['Hinge to ~45°, flat back, soft knees.', 'Grip just outside knees.', 'Row bar to lower ribs, squeezing shoulder blades.', 'Lower under control; no torso swinging.']);
  E('db_row', 'One-Arm Dumbbell Row', ['dumbbells', B], ['hpull'], 'row', ['lats', 'upper_back'], ['rear_delts', 'biceps'], 'compound',
    ['Knee and hand on bench, back flat.', 'Let the dumbbell hang straight down.', 'Pull elbow toward your hip.', 'Pause, then lower to a full stretch.']);
  E('chest_supported_row', 'Chest-Supported Dumbbell Row', ['dumbbells', 'bench_adjustable'], ['hpull'], 'row', ['upper_back', 'lats'], ['rear_delts', 'biceps'], 'compound',
    ['Lie face-down on a 30–45° incline.', 'Arms hang straight.', 'Row elbows back, squeezing shoulder blades.', 'Lower slowly.']);
  E('cable_row', 'Seated Cable Row', ['seated_row|cable'], ['hpull'], 'row', ['upper_back', 'lats'], ['rear_delts', 'biceps'], 'compound',
    ['Sit tall, slight knee bend.', 'Pull handle to your belly button.', 'Squeeze shoulder blades; chest proud.', 'Reach forward to a stretch without rounding hard.'], { demoPattern: 'seatedrow' });
  E('kb_row', 'Kettlebell Row', ['kettlebells'], ['hpull'], 'row', ['lats', 'upper_back'], ['rear_delts', 'biceps'], 'compound',
    ['Staggered stance, hinge with flat back.', 'Row the bell to your hip.', 'Pause, squeeze.', 'Lower to a stretch.']);
  E('inverted_row', 'Inverted Row', ['smith|rack|trx'], ['hpull'], 'invrow', ['upper_back', 'lats'], ['rear_delts', 'biceps', 'abs'], 'compound',
    ['Bar at hip height (or TRX handles).', 'Body straight, heels on floor.', 'Pull chest to bar.', 'Lower with control. Bend knees to make easier.']);
  E('band_row', 'Band Seated Row', ['bands'], ['hpull'], 'seatedrow', ['upper_back', 'lats'], ['rear_delts', 'biceps'], 'compound',
    ['Loop band around feet or anchor at chest height.', 'Sit/stand tall.', 'Row to ribs, squeezing shoulder blades.', 'Return slowly.']);
  E('prone_ytw', 'Prone Y-T-W Raise', [], ['rear_delt', 'hpull'], 'ytw', ['rear_delts', 'upper_back'], ['traps', 'lower_back'], 'iso',
    ['Lie face down, forehead on a towel.', 'Lift arms into a Y, then T, then W.', 'Thumbs up, squeeze shoulder blades each rep.', 'Slow and controlled; 1 rep = Y+T+W.']);

  // ---------- Vertical pull ----------
  E('pullup', 'Pull-Up', ['pullup_bar'], ['vpull'], 'vpull', ['lats'], ['biceps', 'upper_back', 'forearms'], 'compound',
    ['Overhand grip slightly wider than shoulders.', 'Start from a dead hang, shoulders engaged.', 'Pull chest to bar, elbows down to ribs.', 'Lower fully. Use a band for assistance if needed.']);
  E('chinup', 'Chin-Up', ['pullup_bar'], ['vpull', 'biceps'], 'vpull', ['lats', 'biceps'], ['upper_back', 'forearms'], 'compound',
    ['Underhand grip, shoulder width.', 'Dead hang, brace.', 'Pull chin over bar.', 'Lower slowly for 3s.']);
  E('lat_pulldown', 'Lat Pulldown', ['lat_pulldown|cable'], ['vpull'], 'pulldown', ['lats'], ['biceps', 'upper_back', 'rear_delts'], 'compound',
    ['Thighs locked under pad, grip just outside shoulders.', 'Lean back slightly, chest up.', 'Pull bar to upper chest, elbows down and back.', 'Let it rise slowly to a full stretch.']);
  E('assisted_pullup', 'Assisted Pull-Up (Machine)', ['assisted_pullup'], ['vpull'], 'vpull', ['lats'], ['biceps', 'upper_back'], 'compound',
    ['Choose assistance so you can do the reps cleanly.', 'Kneel on the pad, overhand grip.', 'Pull chest toward handles.', 'Lower fully. Reduce assistance over time.']);
  E('band_pulldown', 'Band Lat Pulldown', ['bands'], ['vpull'], 'pulldown', ['lats'], ['biceps', 'upper_back'], 'compound',
    ['Anchor band high (door anchor or bar).', 'Kneel, arms overhead.', 'Pull elbows down to ribs.', 'Return slowly.']);
  E('straight_arm_pulldown', 'Straight-Arm Cable Pulldown', ['cable|lat_pulldown'], ['vpull'], 'straightarm', ['lats'], ['triceps', 'abs'], 'iso',
    ['High pulley, rope or bar, slight hip hinge.', 'Arms straight, soft elbows.', 'Sweep hands down to thighs.', 'Control back up to eye level.']);

  // ---------- Quads / squat ----------
  E('bb_back_squat', 'Barbell Back Squat', ['barbell', 'rack'], ['quad'], 'squat', ['quads', 'glutes'], ['adductors', 'lower_back', 'abs'], 'compound',
    ['Bar on upper traps, feet shoulder-width, toes slightly out.', 'Brace, sit hips back and down to at least parallel.', 'Knees track over toes; chest up.', 'Drive up through mid-foot.']);
  E('leg_press', 'Leg Press', ['leg_press'], ['quad'], 'legpress', ['quads', 'glutes'], ['adductors', 'hamstrings'], 'compound',
    ['Feet shoulder-width, mid-platform.', 'Lower until knees reach ~90° without lower back peeling off.', 'Press through whole foot.', 'Don\'t lock knees hard at the top.']);
  E('hack_squat', 'Hack Squat', ['hack_squat'], ['quad'], 'squat', ['quads'], ['glutes', 'adductors'], 'compound',
    ['Shoulders under pads, feet mid-platform.', 'Release safeties, descend slowly.', 'Go as deep as you control.', 'Drive up without locking out.']);
  E('smith_squat', 'Smith Machine Squat', ['smith'], ['quad'], 'squat', ['quads', 'glutes'], ['adductors'], 'compound',
    ['Feet slightly in front of the bar.', 'Unhook, brace.', 'Squat to parallel or below.', 'Stand up tall.']);
  E('goblet_squat', 'Goblet Squat', ['dumbbells|kettlebells'], ['quad'], 'squat', ['quads', 'glutes'], ['adductors', 'abs'], 'compound',
    ['Hold a dumbbell/kettlebell at chest.', 'Feet shoulder-width, toes out.', 'Sit down between your heels, elbows inside knees.', 'Stand up, squeezing glutes.']);
  E('front_squat', 'Barbell Front Squat', ['barbell', 'rack'], ['quad'], 'squat', ['quads'], ['glutes', 'abs', 'upper_back'], 'compound',
    ['Bar on front delts, elbows high.', 'Brace, sit straight down.', 'Stay upright.', 'Drive elbows up as you stand.']);
  E('bw_squat', 'Bodyweight Squat (Tempo)', [], ['quad'], 'squat', ['quads', 'glutes'], ['adductors'], 'compound',
    ['Feet shoulder-width.', 'Lower for 3 seconds.', 'Pause 1s at the bottom.', 'Stand up fast.']);
  E('leg_extension', 'Leg Extension', ['leg_ext'], ['quad_iso'], 'legext', ['quads'], [], 'iso',
    ['Knee aligned with machine pivot.', 'Extend fully and squeeze quads 1s.', 'Lower slowly for 3s.', 'Keep hips down on the seat.']);
  E('sissy_band_ext', 'Banded Terminal Knee Extension', ['bands'], ['quad_iso'], 'squat', ['quads'], [], 'iso',
    ['Anchor band low, loop behind the knee.', 'Step back to tension.', 'Straighten knee fully against band.', 'Squeeze the quad each rep.']);

  // ---------- Lunge / unilateral ----------
  E('bulgarian_split_squat', 'Bulgarian Split Squat', ['dumbbells', B], ['lunge'], 'lunge', ['quads', 'glutes'], ['adductors', 'hamstrings'], 'compound',
    ['Rear foot on bench, front foot ~2 ft forward.', 'Drop back knee straight down.', 'Slight forward lean = more glute.', 'Drive up through front heel. All reps one side, then switch.']);
  E('walking_lunge', 'Dumbbell Walking Lunge', ['dumbbells'], ['lunge'], 'lunge', ['quads', 'glutes'], ['hamstrings', 'adductors'], 'compound',
    ['Dumbbells at sides, tall posture.', 'Step forward, lower back knee near the floor.', 'Drive through front heel into the next step.', 'Reps are per leg.']);
  E('reverse_lunge', 'Reverse Lunge', [], ['lunge'], 'lunge', ['quads', 'glutes'], ['hamstrings'], 'compound',
    ['Stand tall, step one foot back.', 'Lower both knees to ~90°.', 'Push through the front foot to return.', 'Add dumbbells when easy.']);
  E('step_up', 'Dumbbell Step-Up', ['dumbbells', 'plyo_box|bench_flat|bench_adjustable'], ['lunge'], 'lunge', ['quads', 'glutes'], ['hamstrings'], 'compound',
    ['Box/bench at about knee height.', 'Whole foot on box.', 'Drive up without pushing off the back leg.', 'Lower slowly.']);
  E('smith_split_squat', 'Smith Machine Split Squat', ['smith'], ['lunge'], 'lunge', ['quads', 'glutes'], ['adductors'], 'compound',
    ['Split stance under the Smith bar.', 'Lower back knee toward floor.', 'Torso tall.', 'Drive up through front foot.']);

  // ---------- Hinge ----------
  E('bb_rdl', 'Barbell Romanian Deadlift', ['barbell'], ['hinge'], 'hinge', ['hamstrings', 'glutes'], ['lower_back', 'forearms'], 'compound',
    ['Hold bar at hips, soft knees.', 'Push hips back, bar slides down thighs.', 'Stop at a strong hamstring stretch (~mid-shin).', 'Drive hips forward to stand; flat back throughout.']);
  E('db_rdl', 'Dumbbell Romanian Deadlift', ['dumbbells'], ['hinge'], 'hinge', ['hamstrings', 'glutes'], ['lower_back', 'forearms'], 'compound',
    ['Dumbbells in front of thighs.', 'Hinge at hips, knees soft.', 'Lower to a hamstring stretch.', 'Squeeze glutes to stand.']);
  E('bb_deadlift', 'Barbell Deadlift', ['barbell'], ['hinge'], 'hinge', ['glutes', 'hamstrings', 'lower_back'], ['quads', 'traps', 'forearms'], 'compound',
    ['Bar over mid-foot, shins near bar.', 'Grip, flatten back, chest up.', 'Push the floor away, bar close.', 'Lock out with glutes; lower the same path.']);
  E('kb_swing', 'Kettlebell Swing', ['kettlebells|dumbbells'], ['hinge', 'cardio'], 'swing', ['glutes', 'hamstrings'], ['lower_back', 'abs', 'front_delts'], 'compound',
    ['Hike the bell back between legs.', 'Snap hips forward explosively.', 'Bell floats to chest height; arms just guide.', 'Hinge (not squat) as it comes down.']);
  E('single_leg_rdl', 'Single-Leg RDL', [], ['hinge'], 'hinge', ['hamstrings', 'glutes'], ['abductors', 'lower_back'], 'compound',
    ['Stand on one leg, soft knee.', 'Hinge forward as rear leg rises.', 'Keep hips square.', 'Return to standing. Hold a weight to progress.']);
  E('back_extension', 'Back Extension (Glute Bias)', ['back_ext'], ['hinge'], 'hinge', ['glutes', 'lower_back'], ['hamstrings'], 'iso',
    ['Pad just below hip crease.', 'Round slightly and lower.', 'Squeeze glutes to rise to a straight line.', 'Don\'t hyperextend at the top.']);
  E('cable_pull_through', 'Cable Pull-Through', ['cable'], ['hinge', 'glute'], 'hinge', ['glutes', 'hamstrings'], ['lower_back'], 'compound',
    ['Rope on low pulley, face away.', 'Hinge back, rope between legs.', 'Drive hips forward to stand.', 'Squeeze glutes hard at top.']);
  E('band_good_morning', 'Band Good Morning', ['bands'], ['hinge'], 'hinge', ['hamstrings', 'glutes'], ['lower_back'], 'compound',
    ['Stand on band, loop behind neck/shoulders.', 'Hinge forward with flat back.', 'Feel hamstrings stretch.', 'Drive hips forward to stand.']);

  // ---------- Glutes ----------
  E('bb_hip_thrust', 'Barbell Hip Thrust', ['barbell', B], ['glute'], 'bridge', ['glutes'], ['hamstrings', 'adductors'], 'compound',
    ['Upper back on bench edge, bar over hips (use a pad).', 'Feet flat, shins vertical at the top.', 'Drive hips up, chin tucked, ribs down.', 'Squeeze 1–2s at the top.']);
  E('db_hip_thrust', 'Dumbbell Hip Thrust', ['dumbbells', B], ['glute'], 'bridge', ['glutes'], ['hamstrings'], 'compound',
    ['Upper back on bench, dumbbell on hips.', 'Drive through heels.', 'Full hip extension; squeeze.', 'Lower with control.']);
  E('smith_hip_thrust', 'Smith Machine Hip Thrust', ['smith', B], ['glute'], 'bridge', ['glutes'], ['hamstrings'], 'compound',
    ['Bench perpendicular under Smith bar.', 'Bar padded over hips.', 'Thrust up and squeeze.', 'Lower slowly.']);
  E('glute_bridge', 'Glute Bridge', [], ['glute'], 'bridge', ['glutes'], ['hamstrings'], 'compound',
    ['Lie on back, knees bent, feet flat.', 'Drive hips up through heels.', 'Squeeze glutes 2s at top.', 'Go single-leg to progress.']);
  E('banded_glute_bridge', 'Banded Glute Bridge', ['bands'], ['glute', 'glute_acc'], 'bridge', ['glutes'], ['abductors', 'hamstrings'], 'compound',
    ['Band above knees.', 'Push knees out against band.', 'Bridge up and squeeze.', 'Lower slowly.']);
  E('hip_abduction', 'Hip Abduction Machine', ['hip_abductor'], ['glute_acc'], 'abduct', ['abductors', 'glutes'], [], 'iso',
    ['Sit tall or lean slightly forward (more glute).', 'Push knees out.', 'Pause 1s.', 'Return slowly.']);
  E('band_lateral_walk', 'Banded Lateral Walk', ['bands'], ['glute_acc'], 'abduct', ['abductors', 'glutes'], ['quads'], 'iso',
    ['Band above knees or ankles, quarter squat.', 'Step sideways, keep tension.', 'Don\'t let knees cave.', 'Reps per direction.']);
  E('cable_kickback', 'Cable Glute Kickback', ['cable'], ['glute_acc'], 'kickback', ['glutes'], ['hamstrings'], 'iso',
    ['Ankle strap on low pulley.', 'Hinge slightly, hold the frame.', 'Kick leg back and up, squeeze glute.', 'Control the return.']);

  // ---------- Hamstring isolation ----------
  E('leg_curl', 'Lying / Seated Leg Curl', ['leg_curl'], ['ham_iso'], 'legcurl', ['hamstrings'], ['calves'], 'iso',
    ['Knee lined up with pivot.', 'Curl fully, squeeze 1s.', 'Lower slowly for 3s.', 'Keep hips pinned.']);
  E('ball_leg_curl', 'Stability Ball Leg Curl', ['stability_ball'], ['ham_iso'], 'bridge', ['hamstrings'], ['glutes', 'calves'], 'iso',
    ['Heels on ball, hips up.', 'Curl ball toward glutes.', 'Keep hips high.', 'Extend slowly.']);
  E('band_leg_curl', 'Band Leg Curl', ['bands'], ['ham_iso'], 'legcurl', ['hamstrings'], [], 'iso',
    ['Anchor band low, loop around ankle, lie face down.', 'Curl heel to glute.', 'Pause and squeeze.', 'Lower slowly.']);
  E('db_leg_curl', 'Dumbbell Leg Curl', ['dumbbells', B], ['ham_iso'], 'legcurl', ['hamstrings'], [], 'iso',
    ['Lie face down on bench, dumbbell between feet.', 'Curl to ~90°.', 'Lower slowly.', 'Use a light weight; control is key.']);

  // ---------- Calves ----------
  E('calf_machine', 'Standing Calf Raise (Machine)', ['calf_machine|smith|leg_press'], ['calves'], 'calf', ['calves'], [], 'iso',
    ['Balls of feet on the edge.', 'Lower to a deep stretch, pause 1s.', 'Rise as high as possible, pause 1s.', 'No bouncing.']);
  E('db_calf_raise', 'Dumbbell Calf Raise', ['dumbbells'], ['calves'], 'calf', ['calves'], [], 'iso',
    ['Hold a dumbbell, stand on a step edge.', 'Full stretch at the bottom.', 'Full squeeze at the top.', 'Single-leg to progress.']);
  E('bw_calf_raise', 'Bodyweight Calf Raise', [], ['calves'], 'calf', ['calves'], [], 'iso',
    ['Stand on a step edge.', 'Slow 3s down.', 'Pause at top.', 'Go single-leg when easy.']);

  // ---------- Shoulders isolation ----------
  E('db_lateral_raise', 'Dumbbell Lateral Raise', ['dumbbells'], ['side_delt'], 'raise', ['side_delts'], ['traps'], 'iso',
    ['Slight forward lean, soft elbows.', 'Raise arms out to shoulder height.', 'Lead with elbows, pinkies slightly up.', 'Lower slowly; no swinging.']);
  E('cable_lateral_raise', 'Cable Lateral Raise', ['cable'], ['side_delt'], 'raise', ['side_delts'], ['traps'], 'iso',
    ['Low pulley, cable crosses in front of body.', 'Raise out to shoulder height.', 'Pause, lower slowly.', 'Constant tension the whole time.']);
  E('band_lateral_raise', 'Band Lateral Raise', ['bands'], ['side_delt'], 'raise', ['side_delts'], [], 'iso',
    ['Stand on band, handles at sides.', 'Raise to shoulder height.', 'Pause.', 'Lower slowly.']);
  E('face_pull', 'Face Pull', ['cable|bands'], ['rear_delt'], 'facepull', ['rear_delts', 'upper_back'], ['traps', 'biceps'], 'iso',
    ['Rope at upper-chest/face height.', 'Pull toward your forehead, elbows high.', 'Rotate hands back at the end (double biceps).', 'Return slowly.']);
  E('reverse_pec_deck', 'Reverse Pec Deck', ['pec_deck'], ['rear_delt'], 'reversefly', ['rear_delts'], ['upper_back', 'traps'], 'iso',
    ['Face the pad, handles at shoulder height.', 'Sweep arms back in an arc.', 'Pause, squeeze.', 'Return slowly.']);
  E('db_rear_delt_fly', 'Bent-Over Rear Delt Fly', ['dumbbells'], ['rear_delt'], 'reversefly', ['rear_delts'], ['upper_back'], 'iso',
    ['Hinge to near parallel, light dumbbells.', 'Raise arms out wide, soft elbows.', 'Think "pull apart", not squeeze shoulder blades.', 'Lower slowly.']);
  E('band_pull_apart', 'Band Pull-Apart', ['bands'], ['rear_delt', 'mobility'], 'reversefly', ['rear_delts', 'upper_back'], ['traps'], 'iso',
    ['Hold band at shoulder height, arms straight.', 'Pull apart until band touches chest.', 'Squeeze shoulder blades.', 'Return under control.']);

  // ---------- Arms ----------
  E('db_curl', 'Dumbbell Curl', ['dumbbells'], ['biceps'], 'curl', ['biceps'], ['forearms'], 'iso',
    ['Elbows pinned at sides.', 'Curl up, rotating palms up.', 'Squeeze at top.', 'Lower for 2–3s.']);
  E('hammer_curl', 'Hammer Curl', ['dumbbells'], ['biceps'], 'curl', ['biceps', 'forearms'], [], 'iso',
    ['Neutral grip (palms facing).', 'Elbows still.', 'Curl to shoulder.', 'Lower slowly.']);
  E('incline_db_curl', 'Incline Dumbbell Curl', ['dumbbells', 'bench_adjustable'], ['biceps'], 'curl', ['biceps'], ['forearms'], 'iso',
    ['Bench at ~60°, arms hang behind body.', 'Curl without moving elbows forward.', 'Squeeze.', 'Full stretch at bottom.']);
  E('ez_curl', 'EZ-Bar Curl', ['ez_bar|barbell'], ['biceps'], 'curl', ['biceps'], ['forearms'], 'iso',
    ['Shoulder-width grip on the angled handles.', 'Elbows at sides.', 'Curl up without leaning back.', 'Lower slowly.']);
  E('cable_curl', 'Cable Curl', ['cable'], ['biceps'], 'curl', ['biceps'], ['forearms'], 'iso',
    ['Low pulley, straight bar or rope.', 'Elbows pinned.', 'Curl and squeeze.', 'Control the return.']);
  E('band_curl', 'Band Curl', ['bands'], ['biceps'], 'curl', ['biceps'], ['forearms'], 'iso',
    ['Stand on band.', 'Curl up, elbows at sides.', 'Squeeze at top.', 'Lower slowly.']);
  E('cable_pushdown', 'Cable Triceps Pushdown', ['cable'], ['triceps'], 'pushdown', ['triceps'], [], 'iso',
    ['High pulley, rope or bar.', 'Elbows pinned to sides.', 'Push down to full lockout; spread rope.', 'Return to ~90°.']);
  E('db_overhead_ext', 'Overhead Dumbbell Triceps Extension', ['dumbbells'], ['triceps'], 'overheadext', ['triceps'], [], 'iso',
    ['Hold one dumbbell overhead with both hands.', 'Lower behind head, elbows pointing up.', 'Extend fully.', 'Keep ribs down.']);
  E('skull_crusher', 'Skull Crusher', ['ez_bar|barbell|dumbbells', B], ['triceps'], 'skull', ['triceps'], [], 'iso',
    ['Lie on bench, weight over forehead.', 'Bend only at the elbows to lower toward head.', 'Extend fully.', 'Elbows stay narrow.']);
  E('band_pushdown', 'Band Triceps Pushdown', ['bands'], ['triceps'], 'pushdown', ['triceps'], [], 'iso',
    ['Anchor band high.', 'Elbows at sides.', 'Push down to lockout.', 'Return slowly.']);
  E('bench_dip', 'Bench / Chair Dip', [], ['triceps'], 'benchdip', ['triceps'], ['chest', 'front_delts'], 'iso',
    ['Hands on bench/chair edge behind you.', 'Lower until elbows are ~90°.', 'Press up to lockout.', 'Straighten legs to progress.']);
  E('close_grip_pushup', 'Close-Grip Push-Up', [], ['triceps'], 'pushup', ['triceps'], ['chest', 'front_delts'], 'iso',
    ['Hands under shoulders.', 'Elbows brush ribs.', 'Lower chest to hands.', 'Press up.']);

  // ---------- Core ----------
  E('plank', 'Plank', [], ['core'], 'plank', ['abs'], ['obliques', 'front_delts', 'glutes'], 'core',
    ['Forearms under shoulders.', 'Straight line head to heels.', 'Squeeze glutes, tuck pelvis slightly.', 'Breathe; don\'t let hips sag.'], { unit: 'time' });
  E('dead_bug', 'Dead Bug', [], ['core'], 'deadbug', ['abs'], ['hip_flexors', 'obliques'], 'core',
    ['On back, arms up, knees at 90°.', 'Press lower back into floor.', 'Extend opposite arm and leg slowly.', 'Return, switch sides. Reps per side.']);
  E('bird_dog', 'Bird Dog', [], ['core'], 'birddog', ['abs', 'lower_back'], ['glutes', 'obliques'], 'core',
    ['Hands under shoulders, knees under hips.', 'Brace like someone’s about to poke your stomach.', 'Reach opposite arm and leg long — no hip tilt.', 'Pause 2s, return, switch. Reps per side.']);
  E('hanging_knee_raise', 'Hanging Knee Raise', ['pullup_bar|dip_station'], ['core'], 'kneeraise', ['abs', 'hip_flexors'], ['forearms', 'obliques'], 'core',
    ['Hang with shoulders engaged.', 'Curl knees toward chest, tilting pelvis.', 'No swinging.', 'Lower slowly.']);
  E('cable_crunch', 'Cable Crunch', ['cable'], ['core'], 'cablecrunch', ['abs'], ['obliques'], 'core',
    ['Kneel facing high pulley, rope by head.', 'Crunch ribs toward hips.', 'Hips stay still.', 'Return slowly.']);
  E('ab_wheel', 'Ab Wheel Rollout', ['ab_wheel'], ['core'], 'rollout', ['abs'], ['lats', 'obliques'], 'core',
    ['Kneel, hands on wheel under shoulders.', 'Roll out with a slight posterior pelvic tilt.', 'Go as far as you keep a flat back.', 'Pull back with abs.']);
  E('side_plank', 'Side Plank', [], ['core'], 'sideplank', ['obliques'], ['abs', 'abductors'], 'core',
    ['Elbow under shoulder, stacked feet.', 'Lift hips into a straight line.', 'Hold, then switch sides.', 'Time is per side.'], { unit: 'time' });
  E('russian_twist', 'Russian Twist', [], ['core'], 'twist', ['obliques'], ['abs'], 'core',
    ['Sit, lean back ~45°, feet down or up.', 'Rotate torso side to side.', 'Move from ribs, not just arms.', 'Hold a weight to progress.']);
  E('pallof_press', 'Pallof Press', ['cable|bands'], ['core'], 'pallof', ['obliques', 'abs'], [], 'core',
    ['Stand side-on to anchor at chest height.', 'Press handle straight out.', 'Resist rotation, hold 2s.', 'Reps per side.']);
  E('bicycle_crunch', 'Bicycle Crunch', [], ['core'], 'crunch', ['abs', 'obliques'], ['hip_flexors'], 'core',
    ['On back, hands by head.', 'Bring elbow toward opposite knee.', 'Extend other leg.', 'Slow and controlled.']);
  E('mountain_climber', 'Mountain Climbers', [], ['core', 'cardio'], 'climber', ['abs'], ['hip_flexors', 'front_delts', 'quads'], 'core',
    ['High plank position.', 'Drive knees toward chest alternately.', 'Hips level.', 'Fast but controlled.'], { unit: 'time' });
  E('farmer_carry', 'Farmer Carry', ['dumbbells|kettlebells'], ['carry', 'core'], 'carry', ['forearms', 'traps'], ['abs', 'obliques', 'glutes'], 'compound',
    ['Pick up heavy weights, stand tall.', 'Walk with short steps.', 'Shoulders down and back.', 'Don\'t let weights swing.'], { unit: 'time' });

  // ---------- Cardio / finishers ----------
  E('treadmill_incline', 'Treadmill Incline Intervals', ['treadmill'], ['cardio'], 'run', ['quads', 'glutes', 'calves'], ['hamstrings'], 'cardio',
    ['Warm up 2 min.', 'Alternate brisk incline walk/jog with easy walking.', 'Hold rails only for balance.', 'Breathing hard on work bouts.'], { unit: 'time' });
  E('bike_sprint', 'Bike Sprints', ['bike'], ['cardio'], 'bike', ['quads'], ['glutes', 'calves', 'hamstrings'], 'cardio',
    ['Seat at hip height.', 'All-out sprints, then easy spin.', 'Stay seated, smooth pedaling.', 'Great joint-friendly finisher.'], { unit: 'time' });
  E('rower_intervals', 'Rower Intervals', ['rower'], ['cardio'], 'rower', ['upper_back', 'quads', 'lats'], ['glutes', 'hamstrings', 'biceps'], 'cardio',
    ['Legs, then hips, then arms on the drive.', 'Arms, hips, legs on the recovery.', 'Keep strokes powerful, not rushed.', 'Damper 4–6.'], { unit: 'time' });
  E('stairmaster', 'StairMaster Intervals', ['stairmaster|elliptical'], ['cardio'], 'run', ['glutes', 'quads'], ['calves', 'hamstrings'], 'cardio',
    ['Upright posture, light hands.', 'Alternate faster and easier pace.', 'Full foot on each step.', 'Push through heels for glutes.'], { unit: 'time' });
  E('jump_rope', 'Jump Rope Intervals', ['jump_rope'], ['cardio', 'mt'], 'jump', ['calves'], ['quads', 'front_delts', 'forearms'], 'cardio',
    ['Small hops on balls of feet.', 'Turn with wrists, elbows in.', 'Alternate fast and easy rounds.', 'Great for footwork and conditioning.'], { unit: 'time' });
  E('burpee', 'Burpees', [], ['cardio'], 'burpee', ['quads', 'chest'], ['glutes', 'front_delts', 'abs', 'triceps'], 'cardio',
    ['Squat down, hands to floor.', 'Jump feet back to plank.', 'Optional push-up.', 'Jump feet in and jump up.'], { unit: 'time' });
  E('jumping_jack', 'Jumping Jacks / High Knees', [], ['cardio'], 'jack', ['calves'], ['quads', 'side_delts', 'abductors'], 'cardio',
    ['Light, springy feet.', 'Arms fully overhead.', 'Alternate with high knees for intensity.', 'Keep a steady rhythm.'], { unit: 'time' });
  E('shadowbox', 'Shadowboxing Rounds', [], ['cardio', 'mt'], 'punch', ['front_delts', 'obliques'], ['calves', 'abs', 'triceps'], 'cardio',
    ['Stay in stance, guard up.', 'Throw crisp combos, return to guard.', 'Move your feet; pivot on kicks/punches.', 'Breathe out on every strike.'], { unit: 'time' });
  E('bag_rounds', 'Heavy Bag Rounds', ['heavy_bag'], ['cardio', 'mt'], 'punch', ['front_delts', 'obliques'], ['calves', 'abs', 'triceps', 'glutes'], 'cardio',
    ['Wrap hands, gloves on.', 'Mix punches, kicks, knees.', 'Full rotation through the hips.', 'Stay relaxed between strikes.'], { unit: 'time' });
  E('incline_walk', 'Brisk / Incline Walk', [], ['recovery'], 'walk', ['glutes', 'calves'], ['quads', 'hamstrings'], 'cardio',
    ['Outdoors or treadmill.', 'Conversational pace (Zone 2).', 'Nasal breathing if you can.', 'Great for fat loss without fatigue.'], { unit: 'time' });

  // ---------- Mobility ----------
  E('worlds_greatest', "World's Greatest Stretch", [], ['mobility'], 'mobility', ['hip_flexors', 'hamstrings'], ['glutes', 'upper_back', 'adductors'], 'mobility',
    ['Step into a long lunge.', 'Drop same-side elbow toward instep.', 'Rotate and reach that arm to the ceiling.', 'Reps per side, slow.']);
  E('hip_9090', 'Hip 90/90 Switches', [], ['mobility'], 'hip9090', ['glutes', 'hip_flexors'], ['adductors', 'abductors'], 'mobility',
    ['Sit with both knees bent 90°, one in front, one to the side.', 'Rotate knees to the other side.', 'Stay tall; use hands if needed.', 'Slow and smooth.']);
  E('cat_cow', 'Cat-Cow', [], ['mobility'], 'catcow', ['lower_back', 'abs'], ['upper_back'], 'mobility',
    ['On all fours.', 'Round spine up (cat), then arch (cow).', 'Move segment by segment.', 'Breathe with the movement.']);
  E('open_book', 'Thoracic Open Book', [], ['mobility'], 'twist', ['upper_back', 'obliques'], ['chest'], 'mobility',
    ['Lie on side, knees bent, arms forward.', 'Open top arm across to the other side.', 'Follow hand with eyes.', 'Reps per side.']);
  E('couch_stretch', 'Couch / Hip Flexor Stretch', [], ['mobility'], 'mobility', ['hip_flexors', 'quads'], [], 'mobility',
    ['Back knee on floor/pad, foot up a wall or couch.', 'Squeeze glute of back leg.', 'Stay tall; don\'t arch.', 'Hold per side. Great after kicks.'], { unit: 'time' });
  E('ankle_rocks', 'Ankle Rocks', [], ['mobility'], 'lunge', ['calves'], [], 'mobility',
    ['Half-kneeling, front foot flat.', 'Drive knee forward over toes.', 'Heel stays down.', 'Reps per side.']);
  E('band_dislocates', 'Band Shoulder Dislocates', ['bands'], ['mobility'], 'press', ['front_delts', 'rear_delts'], ['chest', 'upper_back'], 'mobility',
    ['Wide grip on band in front.', 'Arc band overhead and behind.', 'Arms straight.', 'Narrow grip over time.']);
  E('foam_roll', 'Foam Roll (Quads, Glutes, Upper Back)', ['foam_roller'], ['mobility'], 'mobility', ['quads', 'glutes', 'upper_back'], ['calves', 'lats'], 'mobility',
    ['Roll slowly, ~30–60s per area.', 'Pause on tender spots and breathe.', 'Avoid rolling the lower back directly.', 'Stay relaxed.'], { unit: 'time' });
  E('deep_squat_hold', 'Deep Squat Hold', [], ['mobility'], 'squat', ['adductors', 'quads'], ['calves', 'glutes'], 'mobility',
    ['Sit into a deep squat, heels down.', 'Elbows push knees out.', 'Chest up; breathe.', 'Hold onto something if needed.'], { unit: 'time' });

  // derive the prop drawn in the demo from the first listed equipment option
  const PROP = { barbell: 'bar', smith: 'bar', ez_bar: 'bar', dumbbells: 'db', kettlebells: 'kb', cable: 'cable', lat_pulldown: 'cable', seated_row: 'cable', bands: 'band' };
  L.forEach(x => {
    const first = x.req[0] ? x.req[0].split('|')[0] : '';
    x.prop = x.pattern === 'invrow' ? 'none' : (PROP[first] || 'none');
  });

  window.WO = window.WO || {};
  Object.assign(window.WO, { EQUIPMENT_GROUPS, EQUIPMENT, PRESETS, MUSCLES, EXERCISES: L, EX_BY_ID: Object.fromEntries(L.map(x => [x.id, x])) });
})();

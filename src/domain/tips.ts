/**
 * Short technique cues for the most common exercises. Deliberately brief:
 * three things to think about during a set, not a full tutorial.
 */
import type { Language } from "./model";

type Tips = { readonly de: readonly string[]; readonly en: readonly string[] };

const tips: Record<string, Tips> = {
  bench_press: {
    de: [
      "Schulterblätter zusammen und nach unten ziehen",
      "Füße fest am Boden, leichtes Hohlkreuz",
      "Stange zur unteren Brust, Ellbogen ca. 45° vom Körper",
    ],
    en: ["Pull shoulder blades back and down", "Feet planted, slight arch", "Bar to lower chest, elbows about 45° from your body"],
  },
  incline_bench_press: {
    de: ["Bank auf ca. 30°, nicht steiler", "Stange zur oberen Brust absenken", "Schulterblätter bleiben fest auf der Bank"],
    en: ["Bench at about 30°, not steeper", "Lower the bar to your upper chest", "Keep shoulder blades pinned to the bench"],
  },
  db_bench_press: {
    de: ["Hanteln auf Brusthöhe kontrolliert absenken", "Unten kurz dehnen, nicht abfedern", "Oben nicht klackend zusammenstoßen"],
    en: [
      "Lower the dumbbells under control to chest level",
      "Brief stretch at the bottom, no bouncing",
      "Don't clank them together at the top",
    ],
  },
  machine_chest_press: {
    de: ["Griffe auf Brusthöhe einstellen", "Schulterblätter an der Lehne lassen", "Langsam zurück, Gewicht nicht absetzen"],
    en: ["Set the handles at chest height", "Keep shoulder blades against the pad", "Return slowly without resting the stack"],
  },
  pec_deck: {
    de: ["Ellbogen leicht gebeugt und fixiert", "Bewegung aus der Brust, nicht aus den Armen", "Vorne kurz zusammendrücken"],
    en: ["Elbows slightly bent and locked", "Move from the chest, not the arms", "Squeeze briefly at the front"],
  },
  cable_fly: {
    de: ["Leicht nach vorne lehnen, stabiler Stand", "Arme wie beim Umarmen eines Baums führen", "Hände vor der Brust zusammenführen"],
    en: ["Lean slightly forward, stable stance", "Move as if hugging a tree", "Bring hands together in front of your chest"],
  },
  dips: {
    de: ["Schultern weg von den Ohren", "Nur so tief, wie es die Schulter zulässt", "Leicht nach vorne lehnen für mehr Brust"],
    en: ["Shoulders away from your ears", "Only go as low as your shoulders allow", "Lean slightly forward for more chest"],
  },
  push_up: {
    de: ["Körper bildet eine gerade Linie", "Hände etwas breiter als schulterbreit", "Brust bis knapp über den Boden"],
    en: ["Body forms a straight line", "Hands slightly wider than shoulders", "Chest to just above the floor"],
  },
  deadlift: {
    de: [
      "Stange nah am Schienbein, über Fußmitte",
      "Rücken gerade, Brust raus, dann vom Boden drücken",
      "Hüfte und Schultern steigen gleichzeitig",
    ],
    en: ["Bar close to shins, over mid-foot", "Flat back, chest up, then push the floor away", "Hips and shoulders rise together"],
  },
  rdl: {
    de: [
      "Hüfte nach hinten schieben, Knie leicht gebeugt",
      "Stange gleitet an den Oberschenkeln entlang",
      "Runter, bis die Beinrückseite deutlich zieht",
    ],
    en: ["Push hips back, knees slightly bent", "Bar slides down your thighs", "Lower until hamstrings stretch clearly"],
  },
  squat: {
    de: ["Rumpf anspannen, tief einatmen", "Knie in Richtung der Zehen schieben", "Mindestens bis Oberschenkel parallel"],
    en: ["Brace your core, big breath", "Knees track over your toes", "At least to thighs parallel"],
  },
  front_squat: {
    de: ["Ellbogen hoch, Stange liegt auf den Schultern", "Oberkörper möglichst aufrecht", "Tief sitzen, Fersen am Boden"],
    en: ["Elbows high, bar rests on shoulders", "Keep your torso upright", "Sit deep, heels down"],
  },
  leg_press: {
    de: ["Füße schulterbreit mittig auf der Platte", "Unterer Rücken bleibt an der Lehne", "Knie oben nicht durchstrecken"],
    en: ["Feet shoulder-width, mid-platform", "Lower back stays on the pad", "Don't lock your knees at the top"],
  },
  hack_squat: {
    de: ["Rücken fest an die Lehne", "Tief gehen, Knie über den Zehen erlaubt", "Durch die ganze Fußsohle drücken"],
    en: ["Back firmly against the pad", "Go deep, knees past toes is fine", "Push through your whole foot"],
  },
  leg_extension: {
    de: ["Drehachse auf Höhe des Knies einstellen", "Oben eine Sekunde halten", "Langsam absenken, nicht fallen lassen"],
    en: ["Align the pivot with your knee", "Hold for a second at the top", "Lower slowly, don't drop it"],
  },
  leg_curl_seated: {
    de: ["Oberschenkelpolster fest einstellen", "Ferse Richtung Gesäß ziehen", "Hüfte bleibt am Sitz"],
    en: ["Set the thigh pad snugly", "Pull your heels towards your glutes", "Keep hips on the seat"],
  },
  leg_curl_lying: {
    de: ["Hüfte bleibt auf dem Polster", "Kontrolliert hoch und runter", "Füße angezogen für mehr Spannung"],
    en: ["Hips stay on the pad", "Controlled up and down", "Flex your feet for more tension"],
  },
  lunge: {
    de: ["Großer Schritt, Oberkörper aufrecht", "Hinteres Knie Richtung Boden", "Vorderes Knie bleibt über dem Fuß"],
    en: ["Long step, upright torso", "Back knee towards the floor", "Front knee stays over your foot"],
  },
  bulgarian_split_squat: {
    de: ["Hinterer Fuß auf der Bank, vorne weiter weg", "Senkrecht nach unten sinken", "Gewicht auf dem vorderen Bein"],
    en: ["Back foot on the bench, front foot far enough out", "Sink straight down", "Weight on the front leg"],
  },
  hip_thrust: {
    de: ["Schulterblätter an der Bankkante", "Kinn leicht zur Brust, Blick nach vorne", "Oben Gesäß fest anspannen, Hüfte gestreckt"],
    en: ["Shoulder blades on the bench edge", "Chin slightly tucked, eyes forward", "Squeeze glutes hard at the top"],
  },
  calf_raise_standing: {
    de: ["Unten volle Dehnung", "Oben eine Sekunde halten", "Knie gestreckt, nicht wippen"],
    en: ["Full stretch at the bottom", "Hold a second at the top", "Knees straight, no bouncing"],
  },
  bw_squat: {
    de: ["Füße schulterbreit, Fußspitzen leicht nach außen", "Hüfte nach hinten, so tief wie sauber möglich", "Fersen bleiben am Boden"],
    en: ["Feet shoulder-width, toes slightly out", "Hips back, as deep as you can with good form", "Heels stay on the floor"],
  },
  bw_lunge: {
    de: ["Großer Schritt, Oberkörper aufrecht", "Hinteres Knie Richtung Boden", "Wiederholungen pro Bein eintragen"],
    en: ["Long step, upright torso", "Back knee towards the floor", "Log reps per leg"],
  },
  bw_split_squat: {
    de: ["Hinterer Fuß auf Bank oder Sofa", "Senkrecht nach unten sinken", "Wiederholungen pro Bein eintragen"],
    en: ["Back foot on a bench or sofa", "Sink straight down", "Log reps per leg"],
  },
  wall_sit: {
    de: ["Rücken flach an der Wand", "Knie etwa im rechten Winkel", "Knie über den Füßen, nicht nach innen"],
    en: ["Back flat against the wall", "Knees at about a right angle", "Knees over your feet, not caving in"],
  },
  pike_push_up: {
    de: ["Hüfte hoch, Körper bildet ein umgedrehtes V", "Kopf zwischen den Händen Richtung Boden", "Schwerer: Füße erhöht aufstellen"],
    en: ["Hips high, body forms an upside-down V", "Lower your head between your hands", "Harder: put your feet up on something"],
  },
  single_leg_glute_bridge: {
    de: ["Ein Fuß am Boden, das andere Bein gestreckt", "Hüfte bleibt gerade, kippt nicht ab", "Wiederholungen pro Bein eintragen"],
    en: ["One foot down, the other leg straight", "Keep your hips level", "Log reps per leg"],
  },
  copenhagen_plank: {
    de: ["Seitstütz, oberes Bein auf einer Bank", "Hüfte hoch, Körper in einer Linie", "Leichter: Knie statt Fuß auf der Bank"],
    en: ["Side plank, top leg on a bench", "Hips up, body in one line", "Easier: knee instead of foot on the bench"],
  },
  superman: {
    de: ["Bauchlage, Arme nach vorne gestreckt", "Arme und Beine gleichzeitig leicht anheben", "Oben kurz halten, Blick zum Boden"],
    en: ["Lie face down, arms stretched forward", "Lift arms and legs together, just a little", "Hold briefly, eyes on the floor"],
  },
  bird_dog: {
    de: ["Vierfüßlerstand, Rücken gerade", "Gegenüberliegenden Arm und Bein strecken", "Langsam, Hüfte dreht nicht mit"],
    en: ["On all fours, flat back", "Extend the opposite arm and leg", "Slowly, hips don't rotate"],
  },
  dead_hang: {
    de: ["Schulterbreit an die Stange greifen", "Schultern aktiv, nicht ganz in die Gelenke sacken", "Füße frei, ruhig atmen"],
    en: ["Grip the bar shoulder-width", "Keep shoulders engaged, don't sag fully", "Feet off the floor, breathe calmly"],
  },
  calf_raise_bodyweight: {
    de: ["Fußballen auf einer Stufe, Ferse frei", "Langsam ganz nach unten, oben kurz halten", "Zu leicht? Einbeinig weitermachen"],
    en: ["Balls of the feet on a step, heels free", "Slowly all the way down, brief hold at the top", "Too easy? Move on to single-leg"],
  },
  calf_raise_single_leg: {
    de: ["Fußballen auf einer Stufe, Ferse frei", "Unten volle Dehnung, oben kurz halten", "Wiederholungen pro Bein eintragen"],
    en: ["Ball of the foot on a step, heel free", "Full stretch at the bottom, brief hold at the top", "Log reps per leg"],
  },
  pull_up: {
    de: ["Aus dem Hang Schulterblätter zuerst runterziehen", "Brust zur Stange, Ellbogen nach unten", "Unten ganz strecken"],
    en: ["From the hang, pull shoulder blades down first", "Chest to the bar, elbows down", "Fully extend at the bottom"],
  },
  lat_pulldown: {
    de: ["Stange zur oberen Brust, nicht in den Nacken", "Ellbogen nach unten und hinten", "Oberkörper nur leicht zurücklehnen"],
    en: ["Bar to upper chest, not behind the neck", "Drive elbows down and back", "Lean back only slightly"],
  },
  barbell_row: {
    de: ["Oberkörper ca. 45° vorgebeugt, Rücken gerade", "Stange zum Bauchnabel ziehen", "Kein Schwung aus der Hüfte"],
    en: ["Torso about 45° forward, flat back", "Pull the bar to your belly button", "No hip swing"],
  },
  db_row: {
    de: ["Freie Hand und Knie auf der Bank abstützen", "Ellbogen nah am Körper zur Hüfte ziehen", "Oben Schulterblatt nach hinten"],
    en: [
      "Support yourself with free hand and knee",
      "Pull elbow close to your body towards the hip",
      "Squeeze the shoulder blade back at the top",
    ],
  },
  cable_row: {
    de: ["Aufrecht sitzen, Brust raus", "Griff zum Bauch, Schulterblätter zusammen", "Nicht mit dem Oberkörper schaukeln"],
    en: ["Sit tall, chest up", "Handle to your belly, squeeze shoulder blades", "Don't rock your torso"],
  },
  machine_row: {
    de: ["Brustpolster so, dass die Arme gestreckt greifen", "Ellbogen nach hinten führen", "Langsam nach vorne lassen"],
    en: ["Set the chest pad so you reach with straight arms", "Drive elbows back", "Let the weight forward slowly"],
  },
  face_pull: {
    de: ["Seil auf Augenhöhe", "Zum Gesicht ziehen, Hände auseinander", "Oben Daumen nach hinten drehen"],
    en: ["Rope at eye level", "Pull towards your face, hands apart", "Rotate thumbs back at the end"],
  },
  overhead_press: {
    de: ["Gesäß und Bauch anspannen, kein Hohlkreuz", "Kopf kurz zurück, Stange gerade hoch", "Oben Kopf durch die Arme"],
    en: ["Squeeze glutes and abs, no overarching", "Head back briefly, bar straight up", "Head through your arms at the top"],
  },
  db_shoulder_press: {
    de: ["Hanteln auf Ohrhöhe starten", "Ellbogen leicht vor dem Körper", "Rücken fest an der Lehne"],
    en: ["Start with dumbbells at ear height", "Elbows slightly in front of the body", "Back firmly against the pad"],
  },
  lateral_raise: {
    de: ["Leichtes Gewicht, kein Schwung", "Ellbogen führen, bis Schulterhöhe", "Daumen leicht nach unten"],
    en: ["Light weight, no swinging", "Lead with elbows up to shoulder height", "Thumbs slightly down"],
  },
  barbell_curl: {
    de: ["Ellbogen bleiben am Körper", "Kein Schwung aus dem Rücken", "Unten ganz strecken"],
    en: ["Elbows stay at your sides", "No swinging from the back", "Fully extend at the bottom"],
  },
  db_curl: {
    de: ["Beim Hochziehen Handgelenk nach außen drehen", "Oben kurz anspannen", "Langsam absenken"],
    en: ["Rotate your wrist out as you curl", "Squeeze briefly at the top", "Lower slowly"],
  },
  hammer_curl: {
    de: ["Daumen zeigen nach oben", "Ellbogen ruhig am Körper", "Abwechselnd oder gleichzeitig, aber kontrolliert"],
    en: ["Thumbs point up", "Elbows still at your sides", "Alternate or together, but controlled"],
  },
  triceps_pushdown: {
    de: ["Ellbogen am Körper fixieren", "Unten ganz durchstrecken", "Nur die Unterarme bewegen sich"],
    en: ["Pin elbows to your sides", "Fully lock out at the bottom", "Only your forearms move"],
  },
  skull_crusher: {
    de: ["Oberarme senkrecht halten", "Stange Richtung Stirn oder hinter den Kopf", "Ellbogen zeigen nach vorne, nicht nach außen"],
    en: ["Keep upper arms vertical", "Lower the bar towards forehead or behind the head", "Elbows point forward, not out"],
  },
  plank: {
    de: ["Ellbogen unter den Schultern", "Gesäß und Bauch anspannen", "Kopf bis Ferse eine Linie"],
    en: ["Elbows under shoulders", "Squeeze glutes and abs", "Straight line from head to heels"],
  },
  crunch: {
    de: ["Unterer Rücken bleibt am Boden", "Rippen Richtung Becken rollen", "Nicht am Kopf ziehen"],
    en: ["Lower back stays on the floor", "Curl ribs towards your pelvis", "Don't pull on your head"],
  },
  hanging_leg_raise: {
    de: ["Kein Schwung, Körper ruhig halten", "Becken nach oben einrollen", "Langsam absenken"],
    en: ["No swinging, keep your body still", "Curl your pelvis up", "Lower slowly"],
  },
  kb_swing: {
    de: ["Hüftbewegung, keine Kniebeuge", "Kraft kommt aus dem Gesäß, Arme sind nur Seile", "Oben Körper gestreckt, Bauch fest"],
    en: ["Hinge at the hips, it's not a squat", "Power from your glutes, arms are just ropes", "Stand tall and brace at the top"],
  },
  goblet_squat: {
    de: ["Hantel dicht vor der Brust", "Ellbogen zwischen die Knie sinken lassen", "Brust bleibt oben"],
    en: ["Dumbbell close to your chest", "Let elbows sink between your knees", "Keep your chest up"],
  },
  back_extension: {
    de: ["Polster knapp unter dem Hüftknochen", "Nur bis zur geraden Linie hochkommen", "Kontrolliert, kein Schwung"],
    en: ["Pad just below your hip bones", "Rise only to a straight line", "Controlled, no swinging"],
  },
};

/**
 * EGYM machines set seat, lever and weight themselves – the tips are about
 * the movement, the same way as for any other exercise.
 */
const egymTips: Record<string, Tips> = {
  egym_seated_row: {
    de: ["Brust aufrecht, nicht nach hinten lehnen", "Ziehen mit den Ellbogen, nah am Körper", "Hinten Schulterblätter zusammendrücken"],
    en: ["Chest up, don't lean back", "Pull with your elbows, close to your body", "Squeeze shoulder blades together at the back"],
  },
  egym_abdominal: {
    de: ["Brustbein Richtung Becken einrollen", "Ausatmen beim Zusammenziehen", "Nicht mit den Armen ziehen, die Bauchmuskeln arbeiten"],
    en: ["Curl your breastbone towards your pelvis", "Breathe out as you crunch", "Don't pull with your arms, let the abs work"],
  },
  egym_chest_press: {
    de: [
      "Schulterblätter an der Lehne lassen",
      "Drücken aus der Brust, Ellbogen etwas unter Schulterhöhe",
      "Arme vorne nicht ganz durchstrecken",
    ],
    en: [
      "Keep shoulder blades against the pad",
      "Push from the chest, elbows a little below shoulder height",
      "Don't fully lock your arms at the front",
    ],
  },
  egym_triceps: {
    de: ["Oberarme ruhig halten, nur der Unterarm bewegt sich", "Unten kurz voll strecken", "Schultern locker, nicht hochziehen"],
    en: ["Keep upper arms still, only the forearms move", "Fully straighten briefly at the bottom", "Shoulders relaxed, don't shrug"],
  },
  egym_lat_pulldown: {
    de: ["Brust raus, leicht zurücklehnen", "Ellbogen nach unten zu den Hüften ziehen", "Oben strecken, Schultern dabei unten lassen"],
    en: ["Chest up, lean back slightly", "Drive your elbows down to your hips", "Stretch at the top, keep shoulders down"],
  },
  egym_shoulder_press: {
    de: ["Rücken an der Lehne, kein Hohlkreuz", "Senkrecht nach oben drücken", "Unten bis etwa Kinnhöhe absenken"],
    en: ["Back against the pad, no arching", "Press straight up", "Lower to about chin height"],
  },
  egym_biceps: {
    de: ["Oberarme fest auf dem Polster", "Langsam ablassen, unten fast strecken", "Handgelenke gerade, nicht einknicken"],
    en: ["Upper arms firmly on the pad", "Lower slowly, almost straight at the bottom", "Wrists straight, don't curl them"],
  },
  egym_adductor: {
    de: ["Becken bleibt ruhig auf dem Sitz", "Beine aus der Innenseite der Oberschenkel schließen", "Langsam öffnen, die Dehnung spüren"],
    en: ["Keep your pelvis still on the seat", "Close your legs from the inner thighs", "Open slowly and feel the stretch"],
  },
  egym_abductor: {
    de: ["Becken ruhig, Rücken an der Lehne", "Knie nach außen drücken, aus dem Gesäß", "Außen kurz halten, langsam zurück"],
    en: ["Pelvis still, back against the pad", "Push your knees out from the glutes", "Hold briefly at the outside, return slowly"],
  },
  egym_back_extension: {
    de: ["Bewegung aus der Hüfte, Rücken lang", "Nur bis zur geraden Linie strecken, nicht überstrecken", "Bauch leicht anspannen"],
    en: ["Move from the hips, keep your back long", "Extend only to a straight line, not beyond", "Brace your abs lightly"],
  },
  egym_leg_curl: {
    de: ["Hüfte bleibt am Sitz, nicht abheben", "Fersen kräftig Richtung Gesäß ziehen", "Langsam zurück, fast bis zur Streckung"],
    en: ["Hips stay on the seat, don't lift", "Pull your heels hard towards your glutes", "Return slowly, almost to full extension"],
  },
  egym_leg_extension: {
    de: ["Oben kurz voll strecken und anspannen", "Langsam absenken, nicht fallen lassen", "Am Sitz festhalten, Gesäß bleibt unten"],
    en: ["Fully straighten and squeeze briefly at the top", "Lower slowly, don't drop it", "Hold the seat, keep your glutes down"],
  },
  egym_leg_press: {
    de: ["Knie zeigen in Richtung Fußspitzen", "Durch die ganze Fußsohle drücken", "Oben Knie nicht ganz durchdrücken"],
    en: ["Knees track over your toes", "Push through your whole foot", "Don't lock your knees at the top"],
  },
  egym_squat: {
    de: ["Knie zeigen in Richtung Fußspitzen", "Rücken gerade, Brust aufrecht", "Aus den Fersen nach oben drücken"],
    en: ["Knees track over your toes", "Back straight, chest up", "Drive up through your heels"],
  },
  egym_glute: {
    de: ["Becken stabil, kein Hohlkreuz", "Bewegung aus dem Gesäß, nicht aus dem Rücken", "Am Ende kurz anspannen"],
    en: ["Pelvis stable, no arching", "Move from the glutes, not the lower back", "Squeeze briefly at the end"],
  },
  egym_hip_thrust: {
    de: ["Kinn leicht zur Brust, Blick nach vorne", "Hüfte bis zur geraden Linie strecken", "Oben das Gesäß fest anspannen"],
    en: ["Chin slightly tucked, eyes forward", "Extend your hips to a straight line", "Squeeze your glutes hard at the top"],
  },
  egym_butterfly: {
    de: ["Ellbogen leicht gebeugt, Winkel bleibt gleich", "Bewegung aus der Brust, nicht aus den Armen", "Vorne kurz zusammendrücken"],
    en: ["Elbows slightly bent, keep the angle", "Move from the chest, not the arms", "Squeeze briefly at the front"],
  },
  egym_reverse_butterfly: {
    de: ["Brust ans Polster, Schultern unten", "Arme weit nach hinten-außen führen", "Hinten Schulterblätter zusammen"],
    en: ["Chest against the pad, shoulders down", "Sweep your arms wide, back and out", "Squeeze shoulder blades together at the back"],
  },
  egym_rotation: {
    de: ["Becken bleibt fest, nur der Oberkörper dreht", "Drehung aus den seitlichen Bauchmuskeln", "Langsam zurück zur Mitte"],
    en: ["Pelvis stays put, only your torso turns", "Rotate from your obliques", "Return slowly to the centre"],
  },
};

export const tipsFor = (exerciseKey: string, lang: Language): readonly string[] | null => {
  const entry = tips[exerciseKey] ?? egymTips[exerciseKey];
  return entry ? entry[lang] : null;
};

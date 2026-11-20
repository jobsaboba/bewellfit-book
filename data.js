/* Be Well Fit — weekly timetable and class guide.
   Update this one file when the timetable changes, then bump the cache
   version in sw.js so installed phones pick it up.

   day:    1 = Monday … 6 = Saturday
   time:   24-hour "HH:MM"
   studio: 1 or 2
*/

window.BWF_UPDATED = "19 November 2026";

window.BWF_CONFIG = {
  siteUrl: "https://bewellfit.org",
  contactEmail: "bewellfit@gmx.com",
  address: "Bewellfit, Clifton Rd, Hastings TN34 2AA",
  mapsUrl: "https://maps.google.com/?q=Bewellfit,+Clifton+Rd,+Hastings+TN34+2AA",
  // The studio's existing booking form. It emails the Be Well Fit team.
  bookingEndpoint: "https://bewellfit.org/wp-json/contact-form-7/v1/contact-forms/503/feedback",
  bookingFormId: "503",
  bookingUnitTag: "wpcf7-f503-p93-o1",
  bookingContainerPost: "93",
  bookingFormVersion: "6.2.4.1",
  bookingLocale: "en_US"
};

window.BWF_CATEGORIES = [
  { id: "fitness", label: "Fitness", emoji: "🏋️", blurb: "Cardio, strength & toning" },
  { id: "aerial", label: "Aerial & Bungee", emoji: "🤸", blurb: "Hoop, sling & bungee" },
  { id: "yoga", label: "Yoga & Pilates", emoji: "🧘", blurb: "Stretch, flow & core" },
  { id: "dance", label: "Dance & Drums", emoji: "🥁", blurb: "Zumba, Twizt & Drums Alive" },
  { id: "seniors", label: "Seniors & Chair", emoji: "🪑", blurb: "Gentle, supported exercise" },
  { id: "kids", label: "Kids & Home Ed", emoji: "⭐", blurb: "Young people & home ed" }
];

window.BWF_CLASS_INFO = {
  "LBT / Step": {
    cats: ["fitness"],
    desc: "Lower-body toning and step cardio in one fun class."
  },
  "Twizt": {
    cats: ["dance"],
    desc: "A fun, freestyle dance workout — no coordination needed."
  },
  "Gentle Yoga": {
    cats: ["yoga"],
    desc: "Slow, gentle yoga to release tension and improve mobility."
  },
  "Pilates": {
    cats: ["yoga"],
    desc: "Core-focused Pilates for strength, posture and control."
  },
  "Senior Circuits": {
    cats: ["seniors"],
    desc: "Friendly, gentle circuits for over-50s returning to exercise."
  },
  "Spin": {
    cats: ["fitness"],
    desc: "Indoor cycling for a heart-pumping, low-impact workout."
  },
  "Step": {
    cats: ["fitness"],
    desc: "Choreographed step routines — low impact, high energy."
  },
  "Pump Pilates": {
    cats: ["yoga"],
    desc: "Pilates with weights, kettlebells and bars for extra strength."
  },
  "Adult Aerial Skills": {
    cats: ["aerial"],
    desc: "Aerial hoop and sling skills for adults, all levels."
  },
  "Aerial Skills": {
    cats: ["aerial"],
    desc: "Build strength and confidence on aerial hoop and sling."
  },
  "Cheer Circus": {
    cats: ["aerial", "kids"],
    desc: "Cheer, circus and aerial fun for energy and confidence."
  },
  "Superfly Bungee": {
    cats: ["aerial"],
    desc: "Bungee fitness — low-impact, high-fun cardio."
  },
  "Retro Aerobics": {
    cats: ["fitness"],
    desc: "Old-school aerobics with great music and gentle impact."
  },
  "Stretch n Flex": {
    cats: ["yoga"],
    desc: "A stretch-focused class for flexibility and recovery."
  },
  "Chair Exercise": {
    cats: ["seniors"],
    desc: "Seated and supported exercise for all abilities."
  },
  "Drums Alive": {
    cats: ["dance"],
    desc: "Drum your way through a fun, stress-busting workout."
  },
  "Fitness Hoop": {
    cats: ["fitness"],
    desc: "Hula-hoop fitness for core and waist strength."
  },
  "Fitball": {
    cats: ["fitness"],
    desc: "Ball-based toning and core work."
  },
  "Boxfit": {
    cats: ["fitness"],
    desc: "Boxing-inspired cardio and conditioning."
  },
  "Rebound": {
    cats: ["fitness"],
    desc: "Mini-trampoline cardio that's kind to joints."
  },
  "Pilates (Fitness)": {
    cats: ["yoga"],
    desc: "A fitter, stronger Pilates session."
  },
  "Kettlebells & Free Weights": {
    cats: ["fitness"],
    desc: "Strength training with kettlebells and free weights."
  },
  "Home Ed Aerial Skills": {
    cats: ["aerial", "kids"],
    desc: "Aerial skills for home-educated young people."
  },
  "Aerobics / LBT": {
    cats: ["fitness"],
    desc: "Aerobic cardio with lower-body toning."
  },
  "Ab Attack": {
    cats: ["fitness"],
    desc: "Short, focused core and abs workout."
  },
  "Fitness Yoga": {
    cats: ["yoga"],
    desc: "Stronger, flow-based yoga for fitness."
  },
  "Core Stretch": {
    cats: ["yoga"],
    desc: "Core work and deep stretching."
  },
  "Weights": {
    cats: ["fitness"],
    desc: "Guided weights session for all-over strength."
  },
  "Gymnastics": {
    cats: ["aerial", "kids"],
    desc: "Gymnastics skills, strength and flexibility for young people."
  },
  "LBT Xpress": {
    cats: ["fitness"],
    desc: "A quick lower-body and toning blast."
  },
  "Vitality Flow": {
    cats: ["yoga"],
    desc: "A calming mind-and-body flow to release and relax."
  },
  "Chair Rehab": {
    cats: ["seniors"],
    desc: "Supported chair-based rehabilitation exercise."
  },
  "Flexibility FX": {
    cats: ["yoga"],
    desc: "Improve flexibility, mobility and movement."
  },
  "Zumba": {
    cats: ["dance"],
    desc: "Dance fitness with Latin-inspired moves."
  },
  "Purestretch": {
    cats: ["yoga"],
    desc: "Simple, effective stretching for flexibility and wellbeing."
  },
  "Chair Aerobics": {
    cats: ["seniors"],
    desc: "Seated aerobic fun to music for all abilities."
  },
  "Pilates (For All)": {
    cats: ["yoga"],
    desc: "Accessible Pilates for every level."
  },
  "Adult Aerial": {
    cats: ["aerial"],
    desc: "Aerial hoop and sling practice for adults."
  },
  "Open Training Session": {
    cats: ["aerial"],
    desc: "Open practice time in the aerial studio."
  }
};

/* Class photos shown on the booking screen. To change a picture, replace the
   file in img/classes/ or point the class at a different image here. Classes
   without a photo fall back to img/classes/placeholder.webp. */
window.BWF_CLASS_IMAGES = {
  "LBT / Step": "img/classes/lbt-step.webp",
  "Twizt": "img/classes/twizt.webp",
  "Gentle Yoga": "img/classes/gentle-yoga.webp",
  "Pilates": "img/classes/pilates.webp",
  "Senior Circuits": "img/classes/senior-circuits.webp",
  "Spin": "img/classes/spin.webp",
  "Step": "img/classes/step.webp",
  "Pump Pilates": "img/classes/pump-pilates.webp",
  "Adult Aerial Skills": "img/classes/adult-aerial-skills.webp",
  "Aerial Skills": "img/classes/aerial-skills.webp",
  "Cheer Circus": "img/classes/cheer-circus.webp",
  "Superfly Bungee": "img/classes/superfly-bungee.webp",
  "Retro Aerobics": "img/classes/retro-aerobics.webp",
  "Stretch n Flex": "img/classes/stretch-n-flex.webp",
  "Chair Exercise": "img/classes/chair-exercise.webp",
  "Drums Alive": "img/classes/drums-alive.webp",
  "Fitness Hoop": "img/classes/fitness-hoop.webp",
  "Fitball": "img/classes/fitball.webp",
  "Boxfit": "img/classes/boxfit.webp",
  "Rebound": "img/classes/rebound.webp",
  "Pilates (Fitness)": "img/classes/pilates-fitness.webp",
  "Kettlebells & Free Weights": "img/classes/kettlebells-free-weights.webp",
  "Home Ed Aerial Skills": "img/classes/home-ed-aerial-skills.webp",
  "Aerobics / LBT": "img/classes/aerobics-lbt.webp",
  "Ab Attack": "img/classes/ab-attack.webp",
  "Fitness Yoga": "img/classes/fitness-yoga.webp",
  "Core Stretch": "img/classes/core-stretch.webp",
  "Weights": "img/classes/weights.webp",
  "Gymnastics": "img/classes/gymnastics.webp",
  "LBT Xpress": "img/classes/lbt-xpress.webp",
  "Vitality Flow": "img/classes/vitality-flow.webp",
  "Chair Rehab": "img/classes/chair-rehab.webp",
  "Flexibility FX": "img/classes/flexibility-fx.webp",
  "Zumba": "img/classes/zumba.webp",
  "Purestretch": "img/classes/purestretch.webp",
  "Pilates (For All)": "img/classes/pilates-for-all.webp",
  "Chair Aerobics": "img/classes/chair-aerobics.webp",
  "Adult Aerial": "img/classes/adult-aerial.webp",
  "Open Training Session": "img/classes/open-training-session.webp"
};

window.BWF_SLOTS = [
  /* Monday */
  { name: "LBT / Step", day: 1, time: "09:15", studio: 1 },
  { name: "Twizt", day: 1, time: "10:00", studio: 1 },
  { name: "Gentle Yoga", day: 1, time: "10:45", studio: 1 },
  { name: "Pilates", day: 1, time: "11:30", studio: 1 },
  { name: "Senior Circuits", day: 1, time: "16:00", studio: 1 },
  { name: "Spin", day: 1, time: "17:00", studio: 1 },
  { name: "Step", day: 1, time: "18:00", studio: 1 },
  { name: "Pump Pilates", day: 1, time: "18:45", studio: 1 },
  { name: "Adult Aerial Skills", day: 1, time: "09:15", studio: 2 },
  { name: "Aerial Skills", day: 1, time: "16:00", studio: 2 },
  { name: "Cheer Circus", day: 1, time: "17:00", studio: 2 },
  { name: "Aerial Skills", day: 1, time: "18:00", studio: 2 },
  { name: "Superfly Bungee", day: 1, time: "18:15", studio: 2 },
  { name: "Superfly Bungee", day: 1, time: "19:15", studio: 2 },

  /* Tuesday */
  { name: "Retro Aerobics", day: 2, time: "09:15", studio: 1 },
  { name: "Stretch n Flex", day: 2, time: "10:00", studio: 1 },
  { name: "Chair Exercise", day: 2, time: "13:00", studio: 1 },
  { name: "Drums Alive", day: 2, time: "14:00", studio: 1 },
  { name: "Fitness Hoop", day: 2, time: "16:45", studio: 1 },
  { name: "Fitball", day: 2, time: "17:15", studio: 1 },
  { name: "Boxfit", day: 2, time: "18:00", studio: 1 },
  { name: "Rebound", day: 2, time: "18:45", studio: 1 },
  { name: "Pilates (Fitness)", day: 2, time: "19:30", studio: 1 },
  { name: "Kettlebells & Free Weights", day: 2, time: "09:15", studio: 2 },
  { name: "Home Ed Aerial Skills", day: 2, time: "14:00", studio: 2 },
  { name: "Aerial Skills", day: 2, time: "16:00", studio: 2 },
  { name: "Aerial Skills", day: 2, time: "17:00", studio: 2 },
  { name: "Aerial Skills", day: 2, time: "18:00", studio: 2 },
  { name: "Aerobics / LBT", day: 2, time: "19:05", studio: 2 },

  /* Wednesday */
  { name: "Rebound", day: 3, time: "09:15", studio: 1 },
  { name: "Spin", day: 3, time: "09:45", studio: 1 },
  { name: "Fitness Hoop", day: 3, time: "17:00", studio: 1 },
  { name: "Rebound", day: 3, time: "17:45", studio: 1 },
  { name: "Spin", day: 3, time: "18:15", studio: 1 },
  { name: "Ab Attack", day: 3, time: "19:00", studio: 1 },
  { name: "Fitness Yoga", day: 3, time: "19:30", studio: 1 },
  { name: "Core Stretch", day: 3, time: "09:15", studio: 2 },
  { name: "Weights", day: 3, time: "10:00", studio: 2 },
  { name: "Home Ed Aerial Skills", day: 3, time: "11:00", studio: 2 },
  { name: "Home Ed Aerial Skills", day: 3, time: "12:00", studio: 2 },
  { name: "Aerial Skills", day: 3, time: "16:00", studio: 2 },
  { name: "Gymnastics", day: 3, time: "17:00", studio: 2 },
  { name: "Gymnastics", day: 3, time: "18:00", studio: 2 },
  { name: "Superfly Bungee", day: 3, time: "19:15", studio: 2 },

  /* Thursday */
  { name: "LBT Xpress", day: 4, time: "09:15", studio: 1 },
  { name: "Vitality Flow", day: 4, time: "09:45", studio: 1 },
  { name: "Drums Alive", day: 4, time: "11:00", studio: 1 },
  { name: "Chair Rehab", day: 4, time: "12:00", studio: 1 },
  { name: "Spin", day: 4, time: "17:00", studio: 1 },
  { name: "Flexibility FX", day: 4, time: "17:45", studio: 1 },
  { name: "Zumba", day: 4, time: "18:30", studio: 1 },
  { name: "Drums Alive", day: 4, time: "19:30", studio: 1 },
  { name: "Flexibility FX", day: 4, time: "09:15", studio: 2 },
  { name: "Home Ed Aerial Skills", day: 4, time: "13:00", studio: 2 },
  { name: "Aerial Skills", day: 4, time: "16:00", studio: 2 },
  { name: "Aerial Skills", day: 4, time: "17:00", studio: 2 },
  { name: "Gymnastics", day: 4, time: "18:00", studio: 2 },
  { name: "Purestretch", day: 4, time: "19:10", studio: 2 },

  /* Friday */
  { name: "Fitness Yoga", day: 5, time: "09:15", studio: 1 },
  { name: "Pilates (For All)", day: 5, time: "10:15", studio: 1 },
  { name: "Chair Aerobics", day: 5, time: "12:30", studio: 1 },
  { name: "Zumba", day: 5, time: "18:15", studio: 1 },
  { name: "Boxfit", day: 5, time: "09:15", studio: 2 },
  { name: "Home Ed Aerial Skills", day: 5, time: "11:00", studio: 2 },
  { name: "Aerial Skills", day: 5, time: "16:00", studio: 2 },
  { name: "Aerial Skills", day: 5, time: "17:00", studio: 2 },
  { name: "Adult Aerial", day: 5, time: "18:30", studio: 2 },

  /* Saturday */
  { name: "Weights", day: 6, time: "09:15", studio: 1 },
  { name: "Purestretch", day: 6, time: "10:00", studio: 1 },
  { name: "Open Training Session", day: 6, time: "09:15", studio: 2 }
];

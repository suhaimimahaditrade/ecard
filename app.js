/**
 * E-Card Studio JavaScript Logic
 * Includes Live Databinding, Countdown Timer, Web Audio Synth, RSVP local persistence,
 * and standalone self-contained HTML exporter.
 */

// Web Audio API Synth Piano for Canon in D theme
class PianoSynth {
  constructor() {
    this.ctx = null;
    this.timer = null;
    this.isPlaying = false;
    this.tempo = 110; // BPM
    this.step = 0;
    this.delayNode = null;
    this.gainNode = null;
    
    // Musical frequencies
    this.notes = {
      'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31, 'G2': 98.00, 'A2': 110.00, 'B2': 123.47,
      'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
      'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
      'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
      '0': 0
    };
    
    // Canon in D chord progression arpeggios
    this.sequenceDefault = [
      ['C3', 'G3', 'C4', 'E4'],
      ['G2', 'D3', 'G3', 'B3'],
      ['A2', 'E3', 'A3', 'C4'],
      ['E2', 'B2', 'E3', 'G3'],
      ['F2', 'C3', 'F3', 'A3'],
      ['C2', 'G3', 'C3', 'E3'],
      ['F2', 'C3', 'F3', 'A3'],
      ['G2', 'D3', 'G3', 'B3']
    ];

    // Retro Mario theme riff
    this.sequenceMario = ['E5', 'E5', '0', 'E5', '0', 'C5', 'E5', '0', 'G5', '0', '0', '0', 'G4', '0', '0', '0'];

    // Cinematic Avengers theme minor progression
    this.sequenceMarvel = ['A2', 'E3', 'A3', 'C4', 'D4', 'E4', 'D4', 'C4', 'G2', 'D3', 'G3', 'B3', 'C4', 'D4', 'C4', 'B3'];
  }
  
  init() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = 0.2; // Keep volume soft
    
    // Delay effect node
    this.delayNode = this.ctx.createDelay(1.0);
    this.delayNode.delayTime.value = 0.4;
    
    const feedback = this.ctx.createGain();
    feedback.gain.value = 0.35;
    
    this.delayNode.connect(feedback);
    feedback.connect(this.delayNode);
    
    // Connections
    this.gainNode.connect(this.ctx.destination);
    this.gainNode.connect(this.delayNode);
    this.delayNode.connect(this.ctx.destination);
  }
  
  playNote(noteName, time) {
    if (noteName === '0' || !this.notes[noteName]) return;
    
    const freq = this.notes[noteName];
    
    // Choose wave oscillator type based on theme
    let type = 'triangle';
    if (appState.theme === 'mario') {
      type = 'square';
    } else if (appState.theme === 'marvel') {
      type = 'sawtooth';
    }
    
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    
    // Gain/Volume envelope
    const env = this.ctx.createGain();
    
    if (appState.theme === 'mario') {
      // 8-bit flat envelope (chunky retro sound)
      env.gain.setValueAtTime(0, time);
      env.gain.linearRampToValueAtTime(0.12, time + 0.005);
      env.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
      
      osc.connect(env);
      env.connect(this.gainNode);
      osc.start(time);
      osc.stop(time + 0.25);
    } else if (appState.theme === 'marvel') {
      // Brassy slow swell
      env.gain.setValueAtTime(0, time);
      env.gain.linearRampToValueAtTime(0.1, time + 0.06); 
      env.gain.exponentialRampToValueAtTime(0.001, time + 0.75);
      
      osc.connect(env);
      env.connect(this.gainNode);
      osc.start(time);
      osc.stop(time + 0.8);
    } else {
      // Default: Triangle + Sine hammer pluck
      const pluck = this.ctx.createOscillator();
      pluck.type = 'sine';
      pluck.frequency.value = freq * 3.0;
      
      env.gain.setValueAtTime(0, time);
      env.gain.linearRampToValueAtTime(0.3, time + 0.015);
      env.gain.exponentialRampToValueAtTime(0.001, time + 1.0);
      
      const pluckEnv = this.ctx.createGain();
      pluckEnv.gain.setValueAtTime(0, time);
      pluckEnv.gain.linearRampToValueAtTime(0.15, time + 0.005);
      pluckEnv.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
      
      osc.connect(env);
      env.connect(this.gainNode);
      
      pluck.connect(pluckEnv);
      pluckEnv.connect(this.gainNode);
      
      osc.start(time);
      osc.stop(time + 1.1);
      
      pluck.start(time);
      pluck.stop(time + 0.08);
    }
  }
  
  start() {
    if (this.isPlaying) return;
    if (!this.ctx) this.init();
    
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    
    this.isPlaying = true;
    this.step = 0;
    
    // Choose tempo and note duration based on theme
    let tempo = this.tempo;
    let stepDuration;
    
    if (appState.theme === 'mario') {
      tempo = 145; // Faster retro beat
      stepDuration = 60 / tempo / 2; // Eighth notes (approx 200ms)
    } else if (appState.theme === 'marvel') {
      tempo = 90; // Cinematic slower dramatic beat
      stepDuration = 60 / tempo / 2; // 333ms
    } else {
      stepDuration = 60 / tempo / 2; // Default Canon
    }
    
    let nextStepTime = this.ctx.currentTime + 0.05;
    
    const scheduler = () => {
      while (nextStepTime < this.ctx.currentTime + 0.1) {
        let note = '0';
        
        if (appState.theme === 'mario') {
          note = this.sequenceMario[this.step % this.sequenceMario.length];
        } else if (appState.theme === 'marvel') {
          note = this.sequenceMarvel[this.step % this.sequenceMarvel.length];
        } else {
          const chordIndex = Math.floor(this.step / 4) % this.sequenceDefault.length;
          const noteIndex = this.step % 4;
          note = this.sequenceDefault[chordIndex][noteIndex];
        }
        
        this.playNote(note, nextStepTime);
        
        nextStepTime += stepDuration;
        this.step++;
      }
      this.timer = setTimeout(scheduler, 25);
    };
    
    scheduler();
  }
  
  stop() {
    if (!this.isPlaying) return;
    clearTimeout(this.timer);
    this.isPlaying = false;
  }
}

// App State Management
const appState = {
  eventType: 'perkahwinan',
  theme: 'duck-birthday',
  customThemeActive: true,
  customThemePrompt: 'duck chef riding motorcycle carrying birthday cake in enchanted forest with sparklers',
  customThemeColors: {
    bg: '#0f1a10',
    bgGradient: 'linear-gradient(135deg, #0f1a10 0%, #1c2e1b 50%, #3b1d1b 100%)',
    text: '#ffffff',
    textMuted: '#fde047',
    accent: '#fde047',
    accentRgb: '253, 224, 71',
    border: '2px solid #fde047',
    softBg: 'rgba(253, 224, 71, 0.15)',
    particleColor: 'rgba(253, 224, 71, 0.7)'
  },
  customThemeFonts: {
    script: 'Pinyon Script, Great Vibes, cursive',
    title: 'Outfit, sans-serif',
    transform: 'none',
    letterSpacing: '1px'
  },
  title: 'Walimatulurus',
  tagline: 'UNDANGAN KAMI',
  shortNames: 'Aiman & Sarah',
  targetDate: '2026-12-12T11:00',
  brideName: 'Siti Sarah Binti Ahmad',
  groomName: 'Ahmad Aiman Bin Md Yusuf',
  parents: 'Hj. Ahmad Bin Razali & Hjh. Fatimah Binti Ismail',
  eventDate: 'Sabtu, 12 Disember 2026',
  eventTime: '11:00 Pagi - 4:00 Petang',
  venueName: 'Dewan Serbaguna Putrajaya',
  venueAddress: 'Presint 9, 62250 Wilayah Persekutuan Putrajaya',
  gmaps: 'https://maps.google.com/?q=Dewan+Serbaguna+Putrajaya',
  waze: 'https://waze.com/ul?q=Dewan+Serbaguna+Putrajaya',
  musicUrl: '',
  useSynth: true,
  contacts: [
    { name: 'Hj. Ahmad (Bapa)', phone: '0123456789' },
    { name: 'Aiman (Pengantin)', phone: '0198765432' }
  ],
  wishes: [],
  bridePhoto: '',
  groomPhoto: '',
  galleryPhotos: []
};

// Event Type Default Configurations
const eventDefaults = {
  'perkahwinan': {
    title: 'Walimatulurus',
    tagline: 'UNDANGAN KAMI',
    brideLabel: 'Nama Pengantin Perempuan',
    groomLabel: 'Nama Pengantin Lelaki',
    brideName: 'Siti Sarah Binti Ahmad',
    groomName: 'Ahmad Aiman Bin Md Yusuf',
    parentsLabel: 'Nama Ibu Bapa (Penganjur)',
    parents: 'Hj. Ahmad Bin Razali & Hjh. Fatimah Binti Ismail',
    quote: '"Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu isteri-isteri dari jenismu sendiri, supaya kamu cenderung dan merasa tenteram kepadanya, dan dijadikan-Nya diantaramu rasa kasih dan sayang."',
    quoteAuthor: '(Surah Ar-Rum: 21)',
    layout: 'couple'
  },
  'hari-jadi': {
    title: 'Selamat Hari Lahir',
    tagline: 'MAJLIS HARI JADI',
    brideLabel: 'Nama Penerima/Hari Lahir',
    groomLabel: '',
    brideName: 'Muhammad Harith',
    groomName: '',
    parentsLabel: 'Penganjur / Ibu Bapa',
    parents: 'Dianjurkan oleh Keluarga Encik Haron',
    quote: '"Semoga dipanjangkan umur, dimurahkan rezeki, dikurniakan kesihatan yang baik, dan sentiasa dalam perlindungan serta rahmat Allah SWT di dunia dan di akhirat. Amin."',
    quoteAuthor: '- Doa & Restu Keluarga -',
    layout: 'single'
  },
  'aqiqah': {
    title: 'Majlis Kesyukuran & Aqiqah',
    tagline: 'MAJLIS AQIQAH',
    brideLabel: 'Nama Anak',
    groomLabel: '',
    brideName: 'Ahmad Rayyan Bin Aiman',
    groomName: '',
    parentsLabel: 'Nama Ibu Bapa',
    parents: 'Ahmad Aiman & Siti Sarah',
    quote: '"Ya Allah, jadikanlah anak kami ini anak yang soleh, berbakti kepada kedua orang tuanya, berguna bagi agama, bangsa dan negaranya, serta hiasilah akhlaknya dengan budi pekerti yang mulia."',
    quoteAuthor: '- Doa Ibu & Bapa -',
    layout: 'single'
  },
  'rumah-terbuka': {
    title: 'Rumah Terbuka',
    tagline: 'JEMPUTAN MESRA',
    brideLabel: 'Nama Keluarga / Tuan Rumah',
    groomLabel: '',
    brideName: 'Keluarga Encik Yusuf',
    groomName: '',
    parentsLabel: 'Kata Aluan',
    parents: 'Kami sekeluarga dengan segala hormatnya menjemput anda',
    quote: '"Kehadiran tuan-tuan dan puan-puan sekalian amatlah kami hargai bagi memeriahkan lagi majlis silaturahim rumah terbuka kami. Semoga diberkati Allah SWT."',
    quoteAuthor: '- Tuan Rumah -',
    layout: 'single'
  }
};

// Synth Audio and Audio Player references
const synthPiano = new PianoSynth();
const customAudio = new Audio();
customAudio.loop = true;

let countdownInterval = null;
let currentActiveView = 'editor'; // For mobile layout ('editor' or 'preview')

// Seed default wishes if localStorage is empty
function seedWishes() {
  const stored = localStorage.getItem('ecard_wishes');
  if (stored) {
    appState.wishes = JSON.parse(stored);
  } else {
    appState.wishes = [
      { name: 'Khairul Azman', status: 'hadir', message: 'Selamat pengantin baru Aiman & Sarah! Semoga berkekalan hingga ke anak cucu.', timestamp: Date.now() - 36000000 },
      { name: 'Fatin Nadiah', status: 'hadir', message: 'Tahniah Sarah! Cantik sangat kad digital korang. InsyaAllah kami datang nanti.', timestamp: Date.now() - 18000000 },
      { name: 'Ahmad Daniel', status: 'tidak', message: 'Tahniah bro! Maaf tak dapat hadir sebab outstation. Semoga dipermudahkan urusan majlis.', timestamp: Date.now() - 5000000 }
    ];
    localStorage.setItem('ecard_wishes', JSON.stringify(appState.wishes));
  }
}

// Extract Name Initials (e.g. "Siti Sarah" -> "S", "Ahmad Aiman" -> "A")
function getInitials(fullname) {
  if (!fullname) return '';
  // Skip titles like Siti, Hj, Hjh, Ahmad (if used as title)
  let cleanName = fullname.replace(/(Siti|Hj|Hjh|Ahmad|Bin|Binti)\.?\s+/gi, '');
  if (!cleanName) cleanName = fullname; // Fallback
  
  const words = cleanName.trim().split(/\s+/);
  return words[0] ? words[0].charAt(0).toUpperCase() : fullname.charAt(0).toUpperCase();
}

// Set up Databinding Inputs -> State -> UI elements
function initBindings() {
  const bindInput = (inputId, stateKey, callback) => {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    // Init value from state
    if (input.type === 'datetime-local') {
      input.value = appState[stateKey];
    } else if (input.tagName === 'TEXTAREA') {
      input.value = appState[stateKey];
    } else {
      input.value = appState[stateKey];
    }

    input.addEventListener('input', (e) => {
      appState[stateKey] = e.target.value;
      if (callback) callback(e.target.value);
      updatePreview();
    });
  };

  // Bindings setup
  bindInput('inputTitle', 'title', (val) => {
    document.getElementById('coverTitle').textContent = val;
  });
  bindInput('inputTagline', 'tagline');
  bindInput('inputShortNames', 'shortNames', (val) => {
    document.getElementById('coverShortNames').textContent = val;
  });
  bindInput('inputTargetDate', 'targetDate', () => {
    startCountdown();
  });
  bindInput('inputBrideName', 'brideName');
  bindInput('inputGroomName', 'groomName');
  bindInput('inputParents', 'parents');
  bindInput('inputEventDate', 'eventDate');
  bindInput('inputEventTime', 'eventTime');
  bindInput('inputVenueName', 'venueName');
  bindInput('inputVenueAddress', 'venueAddress');
  bindInput('inputGmaps', 'gmaps');
  bindInput('inputWaze', 'waze');

  // Event Type Select Binding
  const eventTypeSelect = document.getElementById('inputEventType');
  if (eventTypeSelect) {
    eventTypeSelect.value = appState.eventType;
    eventTypeSelect.addEventListener('change', (e) => {
      const type = e.target.value;
      appState.eventType = type;
      
      const defaults = eventDefaults[type];
      if (defaults) {
        // Update state
        appState.title = defaults.title;
        appState.tagline = defaults.tagline;
        appState.brideName = defaults.brideName;
        appState.groomName = defaults.groomName;
        appState.parents = defaults.parents;
        
        // Update input element values in editor
        document.getElementById('inputTitle').value = defaults.title;
        document.getElementById('inputTagline').value = defaults.tagline;
        document.getElementById('inputBrideName').value = defaults.brideName;
        document.getElementById('inputGroomName').value = defaults.groomName;
        document.getElementById('inputParents').value = defaults.parents;
        
        // Update labels
        document.getElementById('lblBrideName').textContent = defaults.brideLabel;
        document.getElementById('lblGroomName').textContent = defaults.groomLabel;
        document.getElementById('lblParents').textContent = defaults.parentsLabel;
        
        // Update quotes text automatically on layout change
        document.getElementById('previewQuote').textContent = defaults.quote;
        document.getElementById('previewQuoteAuthor').textContent = defaults.quoteAuthor;

        // Toggle groom input visibility
        const groomGroup = document.getElementById('groomFormGroup');
        const cardContainer = document.getElementById('cardContainer');
        
        if (defaults.layout === 'single') {
          groomGroup.style.display = 'none';
          cardContainer.classList.add('single-host-layout');
        } else {
          groomGroup.style.display = 'block';
          cardContainer.classList.remove('single-host-layout');
        }
        
        updatePreview();
      }
    });
    
    // Trigger initial settings layout configuration
    setTimeout(() => {
      eventTypeSelect.dispatchEvent(new Event('change'));
    }, 10);
  }

  // Contact inputs binding
  const bindContact = (num) => {
    const nameInput = document.getElementById(`contactName${num}`);
    const phoneInput = document.getElementById(`contactPhone${num}`);
    
    const updateState = () => {
      appState.contacts[num-1].name = nameInput.value;
      appState.contacts[num-1].phone = phoneInput.value;
      updatePreview();
    };
    
    nameInput.addEventListener('input', updateState);
    phoneInput.addEventListener('input', updateState);
  };
  bindContact(1);
  bindContact(2);

  // Custom audio input
  const musicInput = document.getElementById('inputMusicUrl');
  musicInput.addEventListener('input', (e) => {
    appState.musicUrl = e.target.value;
    appState.useSynth = (e.target.value.trim() === '');
    
    // Toggle active class on synth button
    const synthBtn = document.getElementById('btnToggleSynthMusic');
    if (appState.useSynth) {
      synthBtn.classList.add('active');
    } else {
      synthBtn.classList.remove('active');
    }
    
    // Apply musical adjustments immediately if already playing
    if (musicState.isPlaying) {
      playMusic(true); // Restart audio with new configuration
    }
  });

  // Built-in Synth Piano button click toggle
  document.getElementById('btnToggleSynthMusic').addEventListener('click', () => {
    appState.useSynth = true;
    appState.musicUrl = '';
    document.getElementById('inputMusicUrl').value = '';
    document.getElementById('btnToggleSynthMusic').classList.add('active');
    
    if (musicState.isPlaying) {
      playMusic(true);
    }
  });

  // Bride Photo Upload
  const bridePhotoInput = document.getElementById('uploadBridePhoto');
  if (bridePhotoInput) {
    bridePhotoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          appState.bridePhoto = event.target.result;
          updatePreview();
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Groom Photo Upload
  const groomPhotoInput = document.getElementById('uploadGroomPhoto');
  if (groomPhotoInput) {
    groomPhotoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          appState.groomPhoto = event.target.result;
          updatePreview();
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Gallery Photos Upload
  const galleryPhotosInput = document.getElementById('uploadGalleryPhotos');
  if (galleryPhotosInput) {
    galleryPhotosInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files).slice(0, 4); // Max 4
      if (files.length > 0) {
        const promises = files.map(file => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.readAsDataURL(file);
          });
        });
        
        Promise.all(promises).then(results => {
          appState.galleryPhotos = results;
          updatePreview();
        });
      }
    });
  }
}

// Update all preview display elements with state values
function updatePreview() {
  // Titles & taglines
  document.getElementById('coverTitle').textContent = appState.title;
  document.getElementById('coverShortNames').textContent = appState.shortNames;
  
  document.getElementById('previewTagline').textContent = appState.tagline;
  document.getElementById('previewShortNames').textContent = appState.shortNames;
  document.getElementById('previewEventDate').textContent = appState.eventDate;
  
  // Parents & Couples
  document.getElementById('previewParents').innerHTML = appState.parents.replace(/\n/g, '<br>');
  document.getElementById('previewBrideName').textContent = appState.brideName;
  document.getElementById('previewGroomName').textContent = appState.groomName;
  
  // Avatar initials or photos/SVGs update
  const avatars = document.querySelectorAll('.avatar-circle');
  if (avatars.length >= 2) {
    // 1. Bride Avatar
    if (appState.bridePhoto) {
      avatars[0].innerHTML = `<img src="${appState.bridePhoto}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    } else {
      if (appState.theme === 'mario') {
        avatars[0].innerHTML = `
          <svg viewBox="0 0 100 100" style="width: 75%; height: 75%; fill: #e52521;">
            <path d="M 50 15 C 30 15 20 30 20 50 C 20 60 25 65 30 65 C 35 65 38 60 40 55 C 43 55 45 60 45 65 C 45 75 35 85 50 85 C 65 85 55 75 55 65 C 55 60 57 55 60 55 C 62 60 65 65 70 65 C 75 65 80 60 80 50 C 80 30 70 15 50 15 Z" />
            <circle cx="35" cy="35" r="8" fill="white" />
            <circle cx="65" cy="35" r="8" fill="white" />
            <circle cx="50" cy="50" r="7" fill="white" />
          </svg>
        `;
      } else if (appState.theme === 'spiderman') {
        avatars[0].innerHTML = `
          <svg viewBox="0 0 100 100" style="width: 80%; height: 80%; fill: #e53e3e;">
            <path d="M50,15 C30,15 22,35 22,55 C22,75 38,90 50,90 C62,90 78,75 78,55 C78,35 70,15 50,15 Z" />
            <path d="M50,15 L50,90 M22,55 L78,55 M28,30 L72,70 M28,70 L72,30" stroke="black" stroke-width="1.5" />
            <path d="M28,45 C28,45 35,62 50,55 C45,52 35,45 28,45 Z" fill="white" stroke="black" stroke-width="3" />
            <path d="M72,45 C72,45 65,62 50,55 C55,52 65,45 72,45 Z" fill="white" stroke="black" stroke-width="3" />
          </svg>
        `;
      } else if (appState.theme === 'barbie') {
        avatars[0].innerHTML = `
          <svg viewBox="0 0 100 100" style="width: 80%; height: 80%; fill: #e91e63;">
            <path d="M15,75 L85,75 L90,35 L70,50 L50,20 L30,50 L10,35 Z" />
            <circle cx="50" cy="20" r="4" fill="#ffeb3b" />
            <circle cx="10" cy="35" r="4" fill="#ffeb3b" />
            <circle cx="90" cy="35" r="4" fill="#ffeb3b" />
            <rect x="25" y="70" width="50" height="5" fill="#f48fb1" />
          </svg>
        `;
      } else {
        avatars[0].textContent = getInitials(appState.brideName);
      }
    }
    
    // 2. Groom Avatar
    if (appState.groomPhoto) {
      avatars[1].innerHTML = `<img src="${appState.groomPhoto}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    } else {
      if (appState.theme === 'mario') {
        avatars[1].innerHTML = `
          <svg viewBox="0 0 100 100" style="width: 75%; height: 75%; fill: #4caf50;">
            <path d="M 50 15 C 30 15 20 30 20 50 C 20 60 25 65 30 65 C 35 65 38 60 40 55 C 43 55 45 60 45 65 C 45 75 35 85 50 85 C 65 85 55 75 55 65 C 55 60 57 55 60 55 C 62 60 65 65 70 65 C 75 65 80 60 80 50 C 80 30 70 15 50 15 Z" />
            <circle cx="35" cy="35" r="8" fill="white" />
            <circle cx="65" cy="35" r="8" fill="white" />
            <circle cx="50" cy="50" r="7" fill="white" />
          </svg>
        `;
      } else if (appState.theme === 'spiderman') {
        avatars[1].innerHTML = `
          <svg viewBox="0 0 100 100" style="width: 70%; height: 70%; stroke: #1e3a8a; stroke-width: 5; fill: none;">
            <circle cx="50" cy="50" r="10" fill="#1e3a8a" />
            <path d="M 50 35 L 50 65 M 35 25 Q 40 45 50 45 M 65 25 Q 60 45 50 45 M 30 50 L 50 50 M 70 50 L 50 50 M 35 75 Q 40 55 50 55 M 65 75 Q 60 55 50 55" />
          </svg>
        `;
      } else if (appState.theme === 'barbie') {
        avatars[1].innerHTML = `
          <svg viewBox="0 0 100 100" style="width: 80%; height: 80%; fill: #e91e63;">
            <path d="M12,25 C1,12 18,-2 35,11 C52,-2 69,12 58,25 L35,46 Z" transform="translate(15,18) scale(1.1)"/>
          </svg>
        `;
      } else {
        avatars[1].textContent = getInitials(appState.groomName);
      }
    }
  }

  // Photo Gallery Slider update
  const gallerySection = document.getElementById('previewGallerySection');
  const gallerySlider = document.getElementById('previewGallerySlider');
  if (gallerySection && gallerySlider) {
    if (appState.galleryPhotos && appState.galleryPhotos.length > 0) {
      gallerySection.style.display = 'block';
      gallerySlider.innerHTML = '';
      appState.galleryPhotos.forEach(photo => {
        const wrapper = document.createElement('div');
        wrapper.classList.add('gallery-img-wrapper');
        wrapper.innerHTML = `<img src="${photo}">`;
        gallerySlider.appendChild(wrapper);
      });
    } else {
      gallerySection.style.display = 'none';
      gallerySlider.innerHTML = '';
    }
  }
  
  // Handle single vs couple layout classes on container
  const cardContainer = document.getElementById('cardContainer');
  const defaults = eventDefaults[appState.eventType];
  if (defaults && defaults.layout === 'single') {
    cardContainer.classList.add('single-host-layout');
  } else {
    cardContainer.classList.remove('single-host-layout');
  }

  // Detail card
  document.getElementById('previewEventDateCard').textContent = appState.eventDate;
  document.getElementById('previewEventTimeCard').textContent = appState.eventTime;
  document.getElementById('previewVenueNameCard').textContent = appState.venueName;
  document.getElementById('previewVenueAddressCard').textContent = appState.venueAddress;
  
  // Map Anchors
  document.getElementById('btnGmaps').href = appState.gmaps;
  document.getElementById('btnWaze').href = appState.waze;
  
  // Contact section
  document.getElementById('previewContactName1').textContent = appState.contacts[0].name;
  document.getElementById('callLink1').href = `tel:${appState.contacts[0].phone}`;
  document.getElementById('waLink1').href = `https://wa.me/60${appState.contacts[0].phone.replace(/^60|^0/, '')}`;
  
  document.getElementById('previewContactName2').textContent = appState.contacts[1].name;
  document.getElementById('callLink2').href = `tel:${appState.contacts[1].phone}`;
  document.getElementById('waLink2').href = `https://wa.me/60${appState.contacts[1].phone.replace(/^60|^0/, '')}`;
  
  // Render animated dynamic main illustrations
  renderMainIllustration();
  if (appState.customThemeActive) {
    applyCustomTheme();
  }
}

// Countdown timer execution
function startCountdown() {
  if (countdownInterval) clearInterval(countdownInterval);
  
  const updateTimer = () => {
    const target = new Date(appState.targetDate).getTime();
    const now = new Date().getTime();
    const difference = target - now;
    
    if (difference <= 0) {
      document.getElementById('daysBox').textContent = '00';
      document.getElementById('hoursBox').textContent = '00';
      document.getElementById('minsBox').textContent = '00';
      document.getElementById('secsBox').textContent = '00';
      clearInterval(countdownInterval);
      return;
    }
    
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);
    
    const pad = (num) => String(num).padStart(2, '0');
    
    document.getElementById('daysBox').textContent = pad(days);
    document.getElementById('hoursBox').textContent = pad(hours);
    document.getElementById('minsBox').textContent = pad(minutes);
    document.getElementById('secsBox').textContent = pad(seconds);
  };
  
  updateTimer();
  countdownInterval = setInterval(updateTimer, 1000);
}

// Floating Particle Generator (Leaf/Gold dust effects)
function createParticles(containerId, count = 12) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '';
  
  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    
    // Randomized positions, timings and dimensions
    const size = Math.random() * 8 + 4; // 4px to 12px
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDelay = `${Math.random() * 8}s`;
    particle.style.animationDuration = `${Math.random() * 6 + 7}s`; // 7s to 13s
    
    // Theme-based overrides
    if (appState.theme === 'mario') {
      particle.style.backgroundColor = '#f8d818';
      particle.style.borderRadius = '50%';
      particle.style.border = '1px solid #000';
      particle.style.boxShadow = 'inset -1.5px -1.5px 0px rgba(0,0,0,0.5)';
      particle.style.animationName = 'mario-coin';
    } else if (appState.theme === 'marvel') {
      particle.style.backgroundColor = '#f97316'; // orange ember spark
      particle.style.borderRadius = '2px';
      particle.style.boxShadow = '0 0 6px #ef4444';
      particle.style.animationName = 'marvel-ember';
    } else if (appState.theme === 'rose-gold') {
      particle.style.backgroundColor = '#f472b6'; // rose pink petal
      particle.style.borderRadius = '50% 0 50% 50%';
      particle.style.animationName = 'fall';
    } else {
      // Default: Emerald gold dust
      particle.style.backgroundColor = 'var(--particle-color)';
      particle.style.borderRadius = '50%';
      particle.style.animationName = 'fall';
    }
    
    container.appendChild(particle);
  }
}

// Theme controller picker
function initThemePicker() {
  const buttons = document.querySelectorAll('.theme-picker .theme-btn');
  const cardContainer = document.getElementById('cardContainer');
  const defaultWreath = document.getElementById('defaultCoverWreath');
  const customWreath = document.getElementById('customCoverWreath');
  const interactiveContainer = document.getElementById('customThemeInteractiveContainer');
  
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Toggle active states on controls
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const newTheme = btn.dataset.theme;
      
      if (newTheme === 'mario' || newTheme === 'marvel') {
        const promptInput = document.getElementById('inputCustomTheme');
        if (promptInput) promptInput.value = (newTheme === 'marvel') ? 'spiderman' : 'mario';
        
        const theme = generateCustomTheme((newTheme === 'marvel') ? 'spiderman' : 'mario');
        appState.theme = theme.themeName;
        appState.customThemeActive = true;
        appState.customThemeColors = theme.colors;
        appState.customThemeFonts = theme.fonts;
        appState.customThemeClass = theme.customClass;
        appState.customThemeCoverSvg = theme.coverSvg;
        appState.customThemeInteractiveHtml = theme.interactiveHtml;
        appState.customThemeParticleType = theme.particleType;
        
        applyCustomTheme();
      } else {
        appState.theme = newTheme;
        appState.customThemeActive = false;
        cardContainer.removeAttribute('style'); // Clear all inline style variables
        defaultWreath.style.display = 'block';
        customWreath.style.display = 'none';
        customWreath.innerHTML = '';
        interactiveContainer.innerHTML = '';
        
        cardContainer.setAttribute('data-card-theme', newTheme);
        renderMainIllustration();
        updatePreview();
      }
      
      // Refresh particles
      createParticles('coverParticles', 10);
    });
  });
}

// Background Music Toggle Controllers
const musicState = {
  isPlaying: false
};

function playMusic(forcePlay = false) {
  if (forcePlay) {
    musicState.isPlaying = false;
  }
  
  const floatingBtn = document.getElementById('cardFloatingMusic');
  
  if (!musicState.isPlaying) {
    // Start playback
    if (appState.useSynth) {
      customAudio.pause();
      synthPiano.start();
    } else {
      synthPiano.stop();
      if (customAudio.src !== appState.musicUrl) {
        customAudio.src = appState.musicUrl;
      }
      customAudio.play().catch(err => {
        console.warn('Audio playback failed: ', err);
      });
    }
    musicState.isPlaying = true;
    floatingBtn.classList.add('playing');
    floatingBtn.innerHTML = '<i class="fa-solid fa-compact-disc"></i>';
  } else {
    // Stop playback
    synthPiano.stop();
    customAudio.pause();
    musicState.isPlaying = false;
    floatingBtn.classList.remove('playing');
    floatingBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
  }
}

// Set up Guest Name from URL parameter (?to=Nama+Tetamu)
function initGuestName() {
  const urlParams = new URLSearchParams(window.location.search);
  const guestName = urlParams.get('to');
  const guestBox = document.getElementById('coverGuestName');
  const rsvpName = document.getElementById('rsvpName');
  
  if (guestName) {
    const formattedName = decodeURIComponent(guestName.replace(/\+/g, ' '));
    guestBox.textContent = formattedName;
    rsvpName.value = formattedName;
  } else {
    guestBox.textContent = 'Tetamu Kehormat';
  }
}

// Render wishes guestbook wall list
function renderWishes() {
  const container = document.getElementById('wishesList');
  if (!container) return;
  
  container.innerHTML = '';
  
  // Sort descending by timestamp
  const sortedWishes = [...appState.wishes].sort((a, b) => b.timestamp - a.timestamp);
  
  if (sortedWishes.length === 0) {
    container.innerHTML = '<div style="text-align: center; font-size: 0.8rem; color: var(--card-text-muted); font-style: italic; padding: 1rem;">Tiada ucapan lagi. Jadilah yang pertama!</div>';
    return;
  }
  
  sortedWishes.forEach(wish => {
    const item = document.createElement('div');
    item.classList.add('wish-item');
    
    const isAttending = wish.status === 'hadir';
    const statusText = isAttending ? 'Hadir' : 'Tidak Hadir';
    const statusClass = isAttending ? 'status-attending' : 'status-declined';
    
    item.innerHTML = `
      <div class="wish-header">
        <span class="wish-name">${escapeHtml(wish.name)}</span>
        <span class="wish-status ${statusClass}">${statusText}</span>
      </div>
      <p class="wish-message">"${escapeHtml(wish.message || 'Hadir meriahkan majlis!')}"</p>
    `;
    container.appendChild(item);
  });
}

// Helper to escape HTML to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}

// Initialize RSVP Form submission listener
function initRsvpForm() {
  const form = document.getElementById('rsvpForm');
  if (!form) return;

  // Toggle Pax selection depending on attending status
  const attendanceRadios = form.querySelectorAll('input[name="attendance"]');
  const paxGroup = document.getElementById('paxGroup');
  
  attendanceRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.value === 'hadir') {
        paxGroup.style.display = 'block';
      } else {
        paxGroup.style.display = 'none';
      }
    });
  });
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('rsvpName').value.trim();
    const attendance = form.querySelector('input[name="attendance"]:checked').value;
    const pax = attendance === 'hadir' ? parseInt(document.getElementById('rsvpPax').value) : 0;
    const message = document.getElementById('rsvpMessage').value.trim();
    
    if (!name) return;
    
    const newWish = {
      name,
      status: attendance,
      pax,
      message,
      timestamp: Date.now()
    };
    
    appState.wishes.push(newWish);
    localStorage.setItem('ecard_wishes', JSON.stringify(appState.wishes));
    
    renderWishes();
    
    // Trigger Celebratory Confetti Blast!
    if (typeof triggerThemeConfetti === 'function') {
      triggerThemeConfetti();
    }
    
    // Reset RSVP form details but keep name if URL supplied
    form.reset();
    initGuestName();
    
    alert(`Terima kasih ${name}! Pengesahan RSVP anda telah berjaya disimpan.`);
  });
}

// Setup Add to Google Calendar generator Link
function initCalendarGenerator() {
  const btn = document.getElementById('btnAddCalendar');
  if (!btn) return;
  
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    
    // Parse target Date
    const startDateObj = new Date(appState.targetDate);
    const endDateObj = new Date(startDateObj.getTime() + 5 * 60 * 60 * 1000); // Default duration 5 hours
    
    const formatCalDate = (date) => {
      return date.toISOString().replace(/-|:|\.\d\d\d/g, '');
    };
    
    const startStr = formatCalDate(startDateObj);
    const endStr = formatCalDate(endDateObj);
    
    const calTitle = encodeURIComponent(`Majlis Kesyukuran & Perkahwinan ${appState.shortNames}`);
    const calDetails = encodeURIComponent(`Anda dijemput ke majlis kami!\nVenue: ${appState.venueName}\nAlamat: ${appState.venueAddress}`);
    const calLocation = encodeURIComponent(`${appState.venueName}, ${appState.venueAddress}`);
    
    const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${calTitle}&dates=${startStr}/${endStr}&details=${calDetails}&location=${calLocation}`;
    
    window.open(gCalUrl, '_blank');
  });
}

// Reset settings to default values
function initResetButton() {
  const btn = document.getElementById('btnResetSettings');
  if (!btn) return;
  
  btn.addEventListener('click', () => {
    if (confirm('Adakah anda mahu mengembalikan maklumat e-kad kepada butiran asal?')) {
      localStorage.removeItem('ecard_wishes');
      window.location.reload();
    }
  });
}

// Mobile view switcher (toggle between Editor inputs and Mobile preview mock screen)
function initMobileViewSwitcher() {
  const btn = document.getElementById('btnMobileViewToggle');
  const editor = document.getElementById('editorPanel');
  const preview = document.getElementById('previewPanel');
  
  if (!btn || !editor || !preview) return;
  
  btn.addEventListener('click', () => {
    if (currentActiveView === 'editor') {
      editor.classList.remove('active-view');
      preview.classList.add('active-view');
      btn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Maklumat';
      btn.style.backgroundColor = '#3b82f6'; // Change color to blue for edit mode
      currentActiveView = 'preview';
    } else {
      preview.classList.remove('active-view');
      editor.classList.add('active-view');
      btn.innerHTML = '<i class="fa-solid fa-mobile-screen-button"></i> Preview Kad';
      btn.style.backgroundColor = '#10b981'; // Back to green
      currentActiveView = 'editor';
    }
  });
}

// Core Envelope Opening Action trigger
function initEnvelopeOpener() {
  const btn = document.getElementById('btnOpenCard');
  const waxSeal = document.getElementById('envelopeWaxSeal');
  const cover = document.getElementById('envelopeCover');
  const content = document.getElementById('mainCardContent');
  
  if (!cover || !content) return;

  const openCardAction = () => {
    // 1. Fade/slide envelope cover out
    cover.classList.add('opened');
    
    // 2. Play background music automatically & sync vinyl player
    setTimeout(() => {
      if (!musicState.isPlaying) {
        playMusic();
        const vinylWidget = document.getElementById('cardVinylPlayer');
        if (vinylWidget) vinylWidget.classList.add('playing');
      }
    }, 500);
    
    // 3. Trigger custom theme open-effects & Cinematic Storyboard!
    try { playThemeSoundscape(); } catch(e) {}
    try { triggerCinematicStoryboard(); } catch(e) {}
    if (appState.customThemeActive) {
      if (appState.theme === 'spiderman') {
        triggerSpiderwebShoot();
      } else if (appState.theme === 'barbie') {
        triggerBarbiePulse();
      } else if (appState.theme === 'mario') {
        setTimeout(triggerMarioJump, 300);
      }
    }
    
    // 4. Render content block and start scroll reveal checks
    setTimeout(() => {
      cover.style.display = 'none';
      content.style.display = 'block';
      // Recalculate particle falling zones
      createParticles('mainParticles', 16);
    }, 1200);
  };
  
  if (btn) btn.addEventListener('click', openCardAction);
  if (waxSeal) waxSeal.addEventListener('click', openCardAction);

  // Sync initials on wax seal
  const syncWaxSeal = () => {
    const waxInitialsEl = document.getElementById('waxSealInitials');
    if (waxInitialsEl && appState.shortNames) {
      const names = appState.shortNames.split(/&|\+|\s+/).filter(n => n.length > 0);
      if (names.length >= 2) {
        waxInitialsEl.textContent = `${names[0].charAt(0).toUpperCase()} & ${names[1].charAt(0).toUpperCase()}`;
      } else {
        waxInitialsEl.textContent = appState.shortNames.substring(0, 3).toUpperCase();
      }
    }
  };
  syncWaxSeal();

  // Re-sync wax seal when shortNames changes
  const shortNamesInput = document.getElementById('inputShortNames');
  if (shortNamesInput) shortNamesInput.addEventListener('input', syncWaxSeal);
}

// Generate the fully single-page self-contained standalone HTML E-card file
function initHtmlExporter() {
  const btn = document.getElementById('btnDownloadHtml');
  if (!btn) return;
  
  btn.addEventListener('click', () => {
    // Fetch style.css and this app.js files content dynamically via AJAX,
    // merge them inline inside templates, pre-config state variables, and output index.html
    
    // Set fallback files in case running on local file system (CORS block on fetch)
    const exportFile = () => {
      // Let's build a clean standalone HTML content
      const standaloneHtml = `<!DOCTYPE html>
<html lang="ms">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kad Undangan Digital - ${escapeHtml(appState.shortNames)}</title>
  <meta name="description" content="Kad Jemputan Digital ${escapeHtml(appState.title)} ${escapeHtml(appState.shortNames)}. Sila sahkan kehadiran anda.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Montserrat:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    /* Inlined CSS Style */
    ${inlinedCss}
    
    /* Reset app framework wrapper for standalone viewing */
    body {
      overflow: auto;
      background-color: #0c0f17;
    }
    .phone-frame {
      width: 100%;
      max-width: 480px;
      height: 100vh;
      min-height: 100vh;
      border: none;
      border-radius: 0;
      box-shadow: none;
      margin: 0 auto;
    }
    .phone-notch {
      display: none;
    }
  </style>
</head>
<body>
  
  <div class="phone-frame">
    <div class="phone-screen" id="cardContainer" data-card-theme="${appState.theme}">
      
      <!-- Floating Music Player -->
      <div class="floating-music" id="cardFloatingMusic" title="Main/Senyap Lagu">
        <i class="fa-solid fa-music"></i>
      </div>
      
      <!-- Envelope Cover -->
      <div class="envelope-cover" id="envelopeCover">
        <div class="particles-container" id="coverParticles"></div>
        <div class="envelope-card">
          <svg class="wreath-icon" viewBox="0 0 100 100">
            <path d="M 50 15 C 30 15 15 35 15 55 C 15 70 25 82 40 85 M 50 15 C 70 15 85 35 85 55 C 85 70 75 82 60 85" />
            <path d="M 30 25 L 35 23 M 22 38 L 28 35 M 18 52 L 25 50 M 22 66 L 28 62 M 32 78 L 36 72" />
            <path d="M 70 25 L 65 23 M 78 38 L 72 35 M 82 52 L 75 50 M 78 66 L 72 62 M 72 78 L 68 72" />
            <path d="M 46 22 L 54 22 M 48 83 L 52 83" />
          </svg>
          <div class="font-script couple-names" id="coverShortNames">${escapeHtml(appState.shortNames)}</div>
          <div class="wedding-tagline" id="coverTitle">${escapeHtml(appState.title)}</div>
          <div class="invitation-to">Undangan Khas Ke Majlis:</div>
          <div class="guest-name-box" id="coverGuestName">Tetamu Kehormat</div>
          <button class="btn-open-card" id="btnOpenCard">
            <i class="fa-solid fa-envelope-open"></i> Buka Undangan
          </button>
        </div>
      </div>
      
      <!-- Main Content -->
      <div class="card-content" style="display: none;" id="mainCardContent">
        <div class="particles-container" id="mainParticles"></div>
        
        <section class="card-section hero-section">
          <span class="wedding-tagline">${escapeHtml(appState.tagline)}</span>
          <h2 class="font-script hero-names">${escapeHtml(appState.shortNames)}</h2>
          <svg class="divider-ornament" viewBox="0 0 100 10">
            <path d="M 0 5 Q 25 1 50 5 T 100 5" fill="none" stroke="currentColor" stroke-width="1.5" />
            <circle cx="50" cy="5" r="3" fill="currentColor" />
          </svg>
          <p class="hero-date">${escapeHtml(appState.eventDate)}</p>
        </section>
        
        <section class="card-section quote-section">
          <p class="quote-text">"Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu isteri-isteri dari jenismu sendiri, supaya kamu cenderung dan merasa tenteram kepadanya, dan dijadikan-Nya diantaramu rasa kasih dan sayang."</p>
          <p class="quote-author">(Surah Ar-Rum: 21)</p>
        </section>
        
        <section class="card-section profile-section">
          <span class="profile-title">Dengan penuh kesyukuran menjemput ke majlis</span>
          <div class="parent-intro">${appState.parents.replace(/\n/g, '<br>')}</div>
          <div class="and-divider">Untuk menghadiri majlis perkahwinan anakanda kesayangan kami:</div>
          <div class="couple-avatars">
            <div class="avatar-wrapper">
              <div class="avatar-circle">${getInitials(appState.brideName)}</div>
              <div class="avatar-name">${escapeHtml(appState.brideName)}</div>
            </div>
            <div class="and-divider">&</div>
            <div class="avatar-wrapper">
              <div class="avatar-circle">${getInitials(appState.groomName)}</div>
              <div class="avatar-name">${escapeHtml(appState.groomName)}</div>
            </div>
          </div>
        </section>
        
        <section class="card-section countdown-section">
          <span class="detail-title">KAUNTER UNDUR MAJLIS</span>
          <div class="countdown-grid">
            <div class="countdown-box"><span class="countdown-num" id="daysBox">00</span><span class="countdown-label">Hari</span></div>
            <div class="countdown-box"><span class="countdown-num" id="hoursBox">00</span><span class="countdown-label">Jam</span></div>
            <div class="countdown-box"><span class="countdown-num" id="minsBox">00</span><span class="countdown-label">Minit</span></div>
            <div class="countdown-box"><span class="countdown-num" id="secsBox">00</span><span class="countdown-label">Saat</span></div>
          </div>
        </section>
        
        <section class="card-section details-section">
          <div class="event-card">
            <div class="detail-row">
              <i class="fa-regular fa-calendar detail-icon"></i>
              <span class="detail-title">Tarikh Majlis</span>
              <span class="detail-value-large">${escapeHtml(appState.eventDate)}</span>
            </div>
            <div class="detail-row">
              <i class="fa-regular fa-clock detail-icon"></i>
              <span class="detail-title">Masa Majlis</span>
              <span class="detail-value">${escapeHtml(appState.eventTime)}</span>
            </div>
            <div class="detail-row">
              <i class="fa-solid fa-location-dot detail-icon"></i>
              <span class="detail-title">Tempat</span>
              <span class="detail-value" style="font-weight: 700;">${escapeHtml(appState.venueName)}</span>
              <span class="detail-value" style="font-size: 0.8rem; text-align: center; color: var(--card-text-muted);">${escapeHtml(appState.venueAddress)}</span>
            </div>
            <div class="button-group">
              <a href="${escapeHtml(appState.gmaps)}" class="btn-card btn-card-outline" target="_blank"><i class="fa-solid fa-map-location-dot"></i> Google Maps</a>
              <a href="${escapeHtml(appState.waze)}" class="btn-card btn-card-outline" target="_blank"><i class="fa-solid fa-car-side"></i> Waze</a>
            </div>
            <button class="btn-card btn-card-solid" id="btnAddCalendar" style="margin-top: 0.75rem; width: 100%;"><i class="fa-regular fa-calendar-plus"></i> Simpan Tarikh (Calendar)</button>
          </div>
        </section>
        
        <section class="card-section contact-section">
          <span class="detail-title">HUBUNGI KAMI</span>
          <div class="contact-row">
            <div class="contact-info">
              <div class="contact-name">${escapeHtml(appState.contacts[0].name)}</div>
              <div class="contact-relation">Hubungi untuk pertanyaan</div>
            </div>
            <div class="contact-actions">
              <a href="tel:${escapeHtml(appState.contacts[0].phone)}" class="btn-icon"><i class="fa-solid fa-phone"></i></a>
              <a href="https://wa.me/60${escapeHtml(appState.contacts[0].phone.replace(/^60|^0/, ''))}" class="btn-icon" target="_blank"><i class="fa-brands fa-whatsapp"></i></a>
            </div>
          </div>
          <div class="contact-row">
            <div class="contact-info">
              <div class="contact-name">${escapeHtml(appState.contacts[1].name)}</div>
              <div class="contact-relation">Hubungi untuk pertanyaan</div>
            </div>
            <div class="contact-actions">
              <a href="tel:${escapeHtml(appState.contacts[1].phone)}" class="btn-icon"><i class="fa-solid fa-phone"></i></a>
              <a href="https://wa.me/60${escapeHtml(appState.contacts[1].phone.replace(/^60|^0/, ''))}" class="btn-icon" target="_blank"><i class="fa-brands fa-whatsapp"></i></a>
            </div>
          </div>
        </section>
        
        <section class="card-section rsvp-section">
          <span class="detail-title">RSVP & UCAPAN KASIH</span>
          <form class="rsvp-form" id="rsvpForm">
            <div>
              <label for="rsvpName">Nama Tetamu</label>
              <input type="text" id="rsvpName" class="rsvp-input" required placeholder="Sila masukkan nama anda">
            </div>
            <div>
              <label>Kehadiran</label>
              <div class="rsvp-radio-group">
                <label class="rsvp-radio-label"><input type="radio" name="attendance" value="hadir" checked> Hadir</label>
                <label class="rsvp-radio-label"><input type="radio" name="attendance" value="tidak"> Tidak Hadir</label>
              </div>
            </div>
            <div id="paxGroup">
              <label for="rsvpPax">Jumlah Tetamu (Termasuk Anda)</label>
              <select id="rsvpPax" class="rsvp-input">
                <option value="1">1 Orang</option>
                <option value="2" selected>2 Orang</option>
                <option value="3">3 Orang</option>
                <option value="4">4 Orang</option>
                <option value="5">5 Orang</option>
              </select>
            </div>
            <div>
              <label for="rsvpMessage">Ucapan / Doa Restu</label>
              <textarea id="rsvpMessage" class="rsvp-input" placeholder="Tuliskan ucapan tahniah atau doa anda di sini..." style="min-height: 70px; resize: none;"></textarea>
            </div>
            <button type="submit" class="btn-card btn-card-solid" style="width: 100%; border: none;">Hantar Pengesahan</button>
          </form>
          
          <div class="wishes-wall">
            <h4 class="wishes-title">Ucapan Tetamu</h4>
            <div class="wishes-container" id="wishesList"></div>
          </div>
        </section>
        
        <section class="card-section footer-section">
          <span class="watermark">E-Kad Jemputan Digital &copy; 2026. <br>Hubungi tuan rumah untuk maklumat lanjut.</span>
        </section>
      </div>
    </div>
  </div>

  <script>
    /* Inlined JS Script */
    const appState = ${JSON.stringify(appState)};
    ${inlinedJsStandalone}
  </script>
</body>
</html>`;

      const blob = new Blob([standaloneHtml], { type: 'text/html;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `kad-undangan-${appState.shortNames.toLowerCase().replace(/\s+&\s+/g, '-').replace(/\s+/g, '_')}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Show Share & Live Link Modal Prompt
      const liveUrl = 'https://suhaimimahaditrade.github.io/ecard/';
      const waMsg = `Assalamu'alaikum & Salam Sejahtera! 💌 Kami berbesar hati menjemput anda ke majlis kami. Sila buka e-kad interaktif kami di pautan: ${liveUrl}`;

      if (navigator.clipboard) {
        navigator.clipboard.writeText(waMsg).catch(() => {});
      }

      alert(`✅ KAD BERJAYA DISIMPAN & DIMUAT TURUN!\n\n1. Fail kad (.html) telah disimpan ke komputer anda.\n2. Pautan WhatsApp rasmi telah disalin ke papatanda (clipboard):\n\n"${waMsg}"\n\nAnda boleh terus 'Paste' mesej ini di WhatsApp/Telegram untuk dihantar kepada tetamu!`);
    };

    // Attempt to dynamically fetch css and js content, or fallback to bundling
    Promise.all([
      fetch('style.css').then(r => r.text()).catch(() => ''),
      fetch('app.js').then(r => r.text()).catch(() => '')
    ]).then(([cssText, jsText]) => {
      // If fetching fails or empty, use static fallback strings
      if (cssText) inlinedCss = cssText;
      
      // Inject correct JS logic for standalone client (without studio bindings)
      inlinedJsStandalone = `
        // Inlined variables
        const synthPiano = new (${PianoSynth.toString()})();
        const customAudio = new Audio();
        customAudio.loop = true;
        let countdownInterval = null;

        // Sound effects synthesizers inside standalone exported card
        function playJumpSound() {
          try {
            const ctx = synthPiano.ctx || new (window.AudioContext || window.webkitAudioContext)();
            if (!synthPiano.ctx) synthPiano.ctx = ctx;
            if (ctx.state === 'suspended') ctx.resume();
            const time = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, time);
            osc.frequency.exponentialRampToValueAtTime(750, time + 0.18);
            gain.gain.setValueAtTime(0.15, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(time);
            osc.stop(time + 0.2);
          } catch(e) {}
        }

        function playWebSound() {
          try {
            const ctx = synthPiano.ctx || new (window.AudioContext || window.webkitAudioContext)();
            if (!synthPiano.ctx) synthPiano.ctx = ctx;
            if (ctx.state === 'suspended') ctx.resume();
            const time = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(3000, time);
            osc.frequency.exponentialRampToValueAtTime(120, time + 0.12);
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, time);
            gain.gain.setValueAtTime(0.18, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            osc.start(time);
            osc.stop(time + 0.14);
          } catch(e) {}
        }

        function playSweetBellSound() {
          try {
            const ctx = synthPiano.ctx || new (window.AudioContext || window.webkitAudioContext)();
            if (!synthPiano.ctx) synthPiano.ctx = ctx;
            if (ctx.state === 'suspended') ctx.resume();
            const time = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, time);
            gain.gain.setValueAtTime(0.2, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.6);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(time);
            osc.stop(time + 0.62);
          } catch(e) {}
        }

        // Apply Custom Theme details dynamically
        function applyCustomTheme() {
          if (!appState.customThemeActive) return;
          const cardContainer = document.getElementById('cardContainer');
          const defaultWreath = document.getElementById('defaultCoverWreath');
          const customWreath = document.getElementById('customCoverWreath');
          const interactiveContainer = document.getElementById('customThemeInteractiveContainer');
          
          cardContainer.setAttribute('data-card-theme', appState.theme);
          
          const colors = appState.customThemeColors;
          cardContainer.style.setProperty('--card-bg', colors.bg);
          cardContainer.style.setProperty('--card-bg-gradient', colors.bgGradient);
          cardContainer.style.setProperty('--card-text', colors.text);
          cardContainer.style.setProperty('--card-text-muted', colors.textMuted);
          cardContainer.style.setProperty('--card-accent', colors.accent);
          cardContainer.style.setProperty('--card-accent-rgb', colors.accentRgb);
          cardContainer.style.setProperty('--card-border', colors.border);
          cardContainer.style.setProperty('--card-soft-bg', colors.softBg);
          cardContainer.style.setProperty('--particle-color', colors.particleColor);

          const fonts = appState.customThemeFonts;
          cardContainer.style.setProperty('--theme-script-font', fonts.script);
          cardContainer.style.setProperty('--theme-title-font', fonts.title);
          cardContainer.style.setProperty('--theme-text-transform', fonts.transform);
          cardContainer.style.setProperty('--theme-letter-spacing', fonts.letterSpacing);
          
          if (appState.customThemeCoverSvg) {
            defaultWreath.style.display = 'none';
            customWreath.style.display = 'block';
            customWreath.innerHTML = appState.customThemeCoverSvg;
          }
          if (appState.customThemeInteractiveHtml) {
            interactiveContainer.innerHTML = appState.customThemeInteractiveHtml;
            
            // Re-bind interactive Mario jumping click handler
            const mario = document.getElementById('marioCharacter');
            if (mario) {
              mario.addEventListener('click', () => {
                if (!mario.classList.contains('jump')) {
                  mario.classList.add('jump');
                  playJumpSound();
                  setTimeout(() => mario.classList.remove('jump'), 500);
                }
              });
            }
          }
          
          renderMainIllustration();
        }

        // Dynamic Main Illustration inside standalone exported card
        function renderMainIllustration() {
          const container = document.getElementById('customThemeMainIllustration');
          if (!container) return;
          const theme = appState.theme;
          if (theme === 'mario') {
            container.innerHTML =
              '<div class="theme-illustration-container">' +
                '<div class="mario-scene-box">' +
                  '<svg viewBox="0 0 100 100" style="position: absolute; top: 10px; left: 10px; width: 40px; fill: white; opacity: 0.8;">' +
                    '<path d="M20,50 C20,40 30,35 40,40 C45,30 65,30 70,40 C80,40 85,50 80,60 C75,65 25,65 20,50 Z"/>' +
                  '</svg>' +
                  '<div class="mario-scene-lawn"></div>' +
                  '<div class="mario-scene-pipe">' +
                    '<svg viewBox="0 0 100 100" style="position: absolute; top: -16px; left: 2px; width: 25px; fill: #e52521; animation: plantPeek 2.5s infinite ease-in-out;">' +
                      '<path d="M50,10 C30,10 20,25 20,45 L80,45 C80,25 70,10 50,10 Z" />' +
                      '<path d="M20,45 L80,45 L50,75 Z" fill="#ffffff" />' +
                    '</svg>' +
                  '</div>' +
                  '<div class="mario-scene-block">' +
                    '<svg viewBox="0 0 100 100" style="fill: #f8d818; stroke: #000; stroke-width: 6;">' +
                      '<rect x="5" y="5" width="90" height="90"/>' +
                      '<text x="30" y="70" font-family="Courier New" font-size="70" font-weight="900" fill="#000">?</text>' +
                    '</svg>' +
                  '</div>' +
                '</div>' +
              '</div>';
          } else if (theme === 'spiderman') {
            container.innerHTML =
              '<div class="theme-illustration-container">' +
                '<div class="spiderman-scene-box">' +
                  '<div style="position: absolute; top: 0; left: 50%; width: 1.5px; height: 50px; background-color: #fff; opacity: 0.7;"></div>' +
                  '<div class="spiderman-hanging">' +
                    '<svg viewBox="0 0 100 150" style="width: 100%; height: 100%;">' +
                      '<circle cx="50" cy="55" r="14" fill="#1e3a8a" />' +
                      '<circle cx="50" cy="30" r="12" fill="#e53e3e" />' +
                      '<path d="M50,10 C38,10 32,22 32,32 C32,45 42,50 50,50 C58,50 68,45 68,32 C68,22 62,10 50,10 Z" fill="#e53e3e" transform="rotate(180, 50, 30)" />' +
                      '<path d="M40,32 C40,32 45,22 50,26 C48,28 42,32 40,32 Z M60,32 C60,32 55,22 50,26 C52,28 58,32 60,32 Z" fill="white" stroke="black" stroke-width="1.5" />' +
                      '<path d="M36,65 L25,40 L45,45 M64,65 L75,40 L55,45" stroke="#e53e3e" stroke-width="4" fill="none" />' +
                    '</svg>' +
                  '</div>' +
                '</div>' +
              '</div>';
          } else if (theme === 'barbie') {
            container.innerHTML =
              '<div class="theme-illustration-container">' +
                '<div class="barbie-scene-box">' +
                  '<svg class="barbie-diamond" viewBox="0 0 100 100">' +
                    '<path d="M50,10 L85,40 L50,90 L15,40 Z M25,40 L50,80 L75,40 L50,20 Z" />' +
                  '</svg>' +
                '</div>' +
              '</div>';
          } else if (theme === 'magic') {
            container.innerHTML =
              '<div class="theme-illustration-container">' +
                '<div class="magic-scene-box">' +
                  '<div class="golden-snitch">' +
                    '<div class="snitch-wing left"></div>' +
                    '<div class="snitch-wing right"></div>' +
                  '</div>' +
                '</div>' +
              '</div>';
          } else {
            container.innerHTML =
              '<div class="theme-illustration-container">' +
                '<div class="heartbeat-scene-box">' +
                  '<svg class="beating-heart" viewBox="0 0 100 100">' +
                    '<path d="M12,30 C1,15 22,-5 50,25 C78,-5 99,15 88,30 L50,85 Z" />' +
                  '</svg>' +
                  '<svg class="beating-heart" viewBox="0 0 100 100">' +
                    '<path d="M12,30 C1,15 22,-5 50,25 C78,-5 99,15 88,30 L50,85 Z" />' +
                  '</svg>' +
                '</div>' +
              '</div>';
          }
        }

        // Extract initials
        function getInitials(fullname) {
          if (!fullname) return '';
          let cleanName = fullname.replace(/(Siti|Hj|Hjh|Ahmad|Bin|Binti)\.?\\s+/gi, '');
          if (!cleanName) cleanName = fullname;
          const words = cleanName.trim().split(/\\s+/);
          return words[0] ? words[0].charAt(0).toUpperCase() : fullname.charAt(0).toUpperCase();
        }
        
        // Escape HTML
        function escapeHtml(str) {
          if (!str) return '';
          return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
        }

        // Music player logic
        const musicState = { isPlaying: false };
        function playMusic(forcePlay = false) {
          if (forcePlay) musicState.isPlaying = false;
          const floatingBtn = document.getElementById('cardFloatingMusic');
          if (!musicState.isPlaying) {
            if (appState.useSynth) {
              customAudio.pause();
              synthPiano.start();
            } else {
              synthPiano.stop();
              customAudio.src = appState.musicUrl;
              customAudio.play().catch(e => console.log(e));
            }
            musicState.isPlaying = true;
            floatingBtn.classList.add('playing');
            floatingBtn.innerHTML = '<i class="fa-solid fa-compact-disc"></i>';
          } else {
            synthPiano.stop();
            customAudio.pause();
            musicState.isPlaying = false;
            floatingBtn.classList.remove('playing');
            floatingBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
          }
        }
        
        // Timer countdown
        function startCountdown() {
          const updateTimer = () => {
            const target = new Date(appState.targetDate).getTime();
            const now = new Date().getTime();
            const difference = target - now;
            if (difference <= 0) {
              document.getElementById('daysBox').textContent = '00';
              document.getElementById('hoursBox').textContent = '00';
              document.getElementById('minsBox').textContent = '00';
              document.getElementById('secsBox').textContent = '00';
              clearInterval(countdownInterval);
              return;
            }
            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);
            const pad = (num) => String(num).padStart(2, '0');
            document.getElementById('daysBox').textContent = pad(days);
            document.getElementById('hoursBox').textContent = pad(hours);
            document.getElementById('minsBox').textContent = pad(minutes);
            document.getElementById('secsBox').textContent = pad(seconds);
          };
          updateTimer();
          countdownInterval = setInterval(updateTimer, 1000);
        }

        // Particle generator
        function createParticles(containerId, count = 12) {
          const container = document.getElementById(containerId);
          if (!container) return;
          for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');
            const size = Math.random() * 8 + 4;
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';
            particle.style.left = (Math.random() * 100) + '%';
            particle.style.animationDelay = (Math.random() * 8) + 's';
            particle.style.animationDuration = (Math.random() * 6 + 7) + 's';
            
            if (appState.theme === 'mario') {
              particle.style.backgroundColor = '#f8d818';
              particle.style.borderRadius = '50%';
              particle.style.border = '1px solid #000';
              particle.style.boxShadow = 'inset -1.5px -1.5px 0px rgba(0,0,0,0.5)';
              particle.style.animationName = 'mario-coin';
            } else if (appState.theme === 'marvel') {
              particle.style.backgroundColor = '#f97316';
              particle.style.borderRadius = '2px';
              particle.style.boxShadow = '0 0 6px #ef4444';
              particle.style.animationName = 'marvel-ember';
            } else if (appState.theme === 'rose-gold') {
              particle.style.backgroundColor = '#f472b6';
              particle.style.borderRadius = '50% 0 50% 50%';
              particle.style.animationName = 'fall';
            } else {
              particle.style.backgroundColor = 'var(--particle-color)';
              particle.style.borderRadius = '50%';
              particle.style.animationName = 'fall';
            }
            container.appendChild(particle);
          }
        }

        // Guest name check
        function initGuestName() {
          const urlParams = new URLSearchParams(window.location.search);
          const guestName = urlParams.get('to');
          const guestBox = document.getElementById('coverGuestName');
          const rsvpName = document.getElementById('rsvpName');
          if (guestName) {
            const formattedName = decodeURIComponent(guestName.replace(/\\+/g, ' '));
            guestBox.textContent = formattedName;
            if (rsvpName) rsvpName.value = formattedName;
          }
        }

        // Wishes guestbook
        function renderWishes() {
          const container = document.getElementById('wishesList');
          if (!container) return;
          container.innerHTML = '';
          const sorted = [...appState.wishes].sort((a,b) => b.timestamp - a.timestamp);
          if (sorted.length === 0) {
            container.innerHTML = '<div style="text-align: center; font-size: 0.8rem; color: var(--card-text-muted); font-style: italic; padding: 1rem;">Tiada ucapan lagi.</div>';
            return;
          }
          sorted.forEach(w => {
            const item = document.createElement('div');
            item.classList.add('wish-item');
            const isAttending = w.status === 'hadir';
            item.innerHTML = \`
              <div class="wish-header">
                <span class="wish-name">\${escapeHtml(w.name)}</span>
                <span class="wish-status \${isAttending ? 'status-attending' : 'status-declined'}">\${isAttending ? 'Hadir' : 'Tidak Hadir'}</span>
              </div>
              <p class="wish-message">"\${escapeHtml(w.message || 'Hadir meriahkan majlis!')}"</p>
            \`;
            container.appendChild(item);
          });
        }

        // Load initialization
        window.addEventListener('DOMContentLoaded', () => {
          applyCustomTheme();
          renderMainIllustration();
          initGuestName();
          startCountdown();
          createParticles('coverParticles', 10);
          
          // Seed local state wishes
          const stored = localStorage.getItem('standalone_wishes_' + appState.shortNames.replace(/\s+/g, ''));
          if (stored) {
            appState.wishes = JSON.parse(stored);
          } else {
            appState.wishes = ${JSON.stringify(appState.wishes)};
          }
          renderWishes();

          // Initialize Next-Level Interactive Features in Standalone Export
          try { init3DTiltEngine(); } catch(e) {}
          try { initInteractiveCanvasEngine(); } catch(e) {}
          try { initVinylAudioPlayer(); } catch(e) {}
          try { initTimelineEngine(); } catch(e) {}

          // Envelope action
          document.getElementById('btnOpenCard').addEventListener('click', () => {
            document.getElementById('envelopeCover').classList.add('opened');
            setTimeout(() => { playMusic(); }, 500);
            
            // Custom theme animation triggers
            if (appState.customThemeActive) {
              if (appState.theme === 'spiderman') {
                const web = document.getElementById('spiderWebAnimation');
                if (web) { web.classList.add('shoot'); playWebSound(); setTimeout(() => web.classList.remove('shoot'), 1200); }
              } else if (appState.theme === 'barbie') {
                const heart = document.getElementById('pinkHeartPulse');
                if (heart) { heart.classList.add('pulse'); playSweetBellSound(); setTimeout(() => heart.classList.remove('pulse'), 1100); }
              } else if (appState.theme === 'mario') {
                const mario = document.getElementById('marioCharacter');
                if (mario) { setTimeout(() => { mario.classList.add('jump'); playJumpSound(); setTimeout(() => mario.classList.remove('jump'), 500); }, 300); }
              }
            }

            setTimeout(() => {
              document.getElementById('envelopeCover').style.display = 'none';
              document.getElementById('mainCardContent').style.display = 'block';
              createParticles('mainParticles', 16);
            }, 1200);
          });

          // Music toggle
          const floatMusic = document.getElementById('cardFloatingMusic');
          if (floatMusic) floatMusic.addEventListener('click', () => playMusic());

          // RSVP handler with Confetti Blast
          const form = document.getElementById('rsvpForm');
          const pGroup = document.getElementById('paxGroup');
          if (form) {
            form.querySelectorAll('input[name="attendance"]').forEach(r => {
              r.addEventListener('change', () => {
                pGroup.style.display = r.value === 'hadir' ? 'block' : 'none';
              });
            });
            
            form.addEventListener('submit', (e) => {
              e.preventDefault();
              const name = document.getElementById('rsvpName').value.trim();
              const attendance = form.querySelector('input[name="attendance"]:checked').value;
              const pax = attendance === 'hadir' ? parseInt(document.getElementById('rsvpPax').value) : 0;
              const message = document.getElementById('rsvpMessage').value.trim();
              if (!name) return;
              
              const newWish = { name, status: attendance, pax, message, timestamp: Date.now() };
              appState.wishes.push(newWish);
              localStorage.setItem('standalone_wishes_' + appState.shortNames.replace(/\s+/g, ''), JSON.stringify(appState.wishes));
              renderWishes();
              form.reset();
              initGuestName();
              try { triggerThemeConfetti(); } catch(e) {}
              alert('Terima kasih! RSVP anda telah dihantar.');
            });
          }

          // Calendar
          const calBtn = document.getElementById('btnAddCalendar');
          if (calBtn) {
            calBtn.addEventListener('click', (e) => {
              e.preventDefault();
              const start = new Date(appState.targetDate);
              const end = new Date(start.getTime() + 5*60*60*1000);
              const format = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
              const title = encodeURIComponent('Majlis Perkahwinan ' + appState.shortNames);
              const detail = encodeURIComponent('Venue: ' + appState.venueName + '\nAlamat: ' + appState.venueAddress);
              const loc = encodeURIComponent(appState.venueName + ', ' + appState.venueAddress);
              const url = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + title + '&dates=' + format(start) + '/' + format(end) + '&details=' + detail + '&location=' + loc;
              window.open(url, '_blank');
            });
          }
        });
      `;
      exportFile();
    });
  });
}

// Dynamic Procedural Theme Generator (Natural Language Parser)
function generateCustomTheme(promptText) {
  const prompt = promptText.toLowerCase().trim();
  
  let themeName = 'custom';
  let colors = {
    bg: '#0f172a',
    bgGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    text: '#ffffff',
    textMuted: '#94a3b8',
    accent: '#10b981',
    accentRgb: '16, 185, 129',
    border: '1.5px solid rgba(16, 185, 129, 0.3)',
    softBg: 'rgba(16, 185, 129, 0.08)',
    particleColor: 'rgba(16, 185, 129, 0.4)'
  };
  let fonts = {
    script: 'Great Vibes, cursive',
    title: 'Playfair Display, serif',
    transform: 'none',
    letterSpacing: 'normal'
  };
  let customClass = '';
  let particleType = 'fall';
  let coverSvg = '';
  let interactiveHtml = '';

  if (prompt.includes('spiderman') || prompt.includes('spider-man') || prompt.includes('spider') || prompt.includes('marvel') || prompt.includes('avengers') || prompt.includes('hero') || prompt.includes('superhero')) {
    themeName = 'spiderman';
    colors = {
      bg: '#090d16',
      bgGradient: 'linear-gradient(135deg, #060910 0%, #0e1e38 100%)',
      text: '#ffffff',
      textMuted: '#8da2bb',
      accent: '#e53e3e',
      accentRgb: '229, 62, 62',
      border: '2px solid #e53e3e',
      softBg: 'rgba(229, 62, 62, 0.12)',
      particleColor: 'rgba(229, 62, 62, 0.5)'
    };
    fonts = {
      script: 'Impact, sans-serif',
      title: 'Impact, sans-serif',
      transform: 'uppercase',
      letterSpacing: '1.5px'
    };
    coverSvg = `
      <div class="theme-illustration-container" style="padding: 0; margin: 0 auto; height: 70px;">
        <div class="spiderman-scene-box" style="height: 70px;">
          <div style="position: absolute; top: 0; left: 50%; width: 1.5px; height: 25px; background-color: #fff; opacity: 0.7;"></div>
          <div class="spiderman-hanging" style="height: 50px;">
            <svg viewBox="0 0 100 150" style="width: 100%; height: 100%;">
              <circle cx="50" cy="55" r="14" fill="#1e3a8a" />
              <circle cx="50" cy="30" r="12" fill="#e53e3e" />
              <path d="M50,10 C38,10 32,22 32,32 C32,45 42,50 50,50 C58,50 68,45 68,32 C68,22 62,10 50,10 Z" fill="#e53e3e" transform="rotate(180, 50, 30)" />
              <path d="M40,32 C40,32 45,22 50,26 C48,28 42,32 40,32 Z M60,32 C60,32 55,22 50,26 C52,28 58,32 60,32 Z" fill="white" stroke="black" stroke-width="1.5" />
            </svg>
          </div>
        </div>
      </div>
    `;
    interactiveHtml = `
      <div id="spiderWebAnimation" class="spider-web-overlay"></div>
    `;
    customClass = 'theme-spiderman';
    
  } else if (prompt.includes('mario') || prompt.includes('nintendo') || prompt.includes('luigi') || prompt.includes('game') || prompt.includes('arcade')) {
    themeName = 'mario';
    colors = {
      bg: '#5c94fc',
      bgGradient: 'linear-gradient(135deg, #5c94fc 0%, #2040c0 100%)',
      text: '#ffffff',
      textMuted: '#fef08a',
      accent: '#f8d818',
      accentRgb: '248, 216, 24',
      border: '4px solid #f8d818',
      softBg: 'rgba(0, 0, 0, 0.25)',
      particleColor: 'rgba(253, 224, 71, 0.8)'
    };
    fonts = {
      script: '"Courier New", monospace',
      title: '"Courier New", monospace',
      transform: 'uppercase',
      letterSpacing: 'normal'
    };
    coverSvg = `
      <div class="theme-illustration-container" style="padding: 0; margin: 0 auto; height: 60px;">
        <div class="mario-scene-block" style="position: relative; top: 0; left: 0; transform: none; animation: blockBump 1.5s infinite ease-in-out;">
          <svg viewBox="0 0 100 100" style="fill: #f8d818; stroke: #000; stroke-width: 6; width: 45px; height: 45px;">
            <rect x="5" y="5" width="90" height="90"/>
            <text x="30" y="70" font-family="Courier New" font-size="70" font-weight="900" fill="#000">?</text>
          </svg>
        </div>
      </div>
    `;
    interactiveHtml = `
      <div id="marioCharacter" class="mario-character" title="Klik saya!">
        <div class="mario-coin-pop"></div>
        <div class="mario-sprite"></div>
      </div>
    `;
    customClass = 'theme-mario';
    
  } else if (prompt.includes('barbie') || prompt.includes('pink') || prompt.includes('princess') || prompt.includes('bunga') || prompt.includes('puteri') || prompt.includes('cute')) {
    themeName = 'barbie';
    colors = {
      bg: '#fff0f6',
      bgGradient: 'linear-gradient(135deg, #fff0f6 0%, #ffdeeb 100%)',
      text: '#c2185b',
      textMuted: '#f06292',
      accent: '#e91e63',
      accentRgb: '233, 30, 99',
      border: '2px solid #e91e63',
      softBg: 'rgba(233, 30, 99, 0.08)',
      particleColor: 'rgba(244, 114, 182, 0.6)'
    };
    fonts = {
      script: 'Great Vibes, cursive',
      title: 'Montserrat, sans-serif',
      transform: 'none',
      letterSpacing: '0.5px'
    };
    coverSvg = `
      <div class="theme-illustration-container" style="padding: 0; margin: 0 auto; height: 60px;">
        <svg class="barbie-diamond" viewBox="0 0 100 100" style="width: 45px; height: 45px;">
          <path d="M50,10 L85,40 L50,90 L15,40 Z M25,40 L50,80 L75,40 L50,20 Z" />
        </svg>
      </div>
    `;
    interactiveHtml = `
      <div id="pinkHeartPulse" class="heart-pulse-overlay"></div>
    `;
    customClass = 'theme-barbie';
    
  } else if (prompt.includes('fantasy') || prompt.includes('khayalan') || prompt.includes('fairytale') || prompt.includes('enchanted') || prompt.includes('realm')) {
    themeName = 'fantasy';
    colors = {
      bg: '#0f0a1c',
      bgGradient: 'linear-gradient(135deg, #0f0a1c 0%, #1c1038 50%, #2e1654 100%)',
      text: '#f8fafc',
      textMuted: '#cbd5e1',
      accent: '#fbbf24',
      accentRgb: '251, 191, 36',
      border: '2px solid #fbbf24',
      softBg: 'rgba(251, 191, 36, 0.12)',
      particleColor: 'rgba(192, 132, 252, 0.6)'
    };
    fonts = {
      script: 'Great Vibes, cursive',
      title: 'Playfair Display, serif',
      transform: 'none',
      letterSpacing: '1px'
    };
    coverSvg = `
      <div class="theme-illustration-container" style="padding: 0; margin: 0 auto; height: 65px;">
        <svg viewBox="0 0 100 100" style="width: 55px; height: 55px; fill: none; stroke: #fbbf24; stroke-width: 2;">
          <!-- Fantasy Castle SVG -->
          <path d="M20,80 L20,40 L30,40 L30,80 M40,80 L40,25 L50,15 L60,25 L60,80 M70,80 L70,40 L80,40 L80,80 M15,80 L85,80" />
          <path d="M45,55 L55,55 L55,80 L45,80 Z" fill="#fbbf24" opacity="0.3" />
          <circle cx="50" cy="15" r="4" fill="#c084fc" />
          <circle cx="20" cy="20" r="2" fill="#fff" />
          <circle cx="80" cy="25" r="2.5" fill="#fff" />
        </svg>
      </div>
    `;
    interactiveHtml = `
      <div id="pinkHeartPulse" class="heart-pulse-overlay" style="background-color: rgba(192,132,252,0.4)"></div>
    `;
  } else if (prompt.includes('duck') || prompt.includes('motorcycle') || prompt.includes('birthday') || prompt.includes('cake') || prompt.includes('sparkler')) {
    themeName = 'duck-birthday';
    colors = {
      bg: '#0f1a10',
      bgGradient: 'linear-gradient(135deg, #0f1a10 0%, #1c2e1b 50%, #3b1d1b 100%)',
      text: '#ffffff',
      textMuted: '#fde047',
      accent: '#fde047',
      accentRgb: '253, 224, 71',
      border: '2px solid #fde047',
      softBg: 'rgba(253, 224, 71, 0.15)',
      particleColor: 'rgba(253, 224, 71, 0.7)'
    };
    fonts = {
      script: 'Pinyon Script, Great Vibes, cursive',
      title: 'Outfit, sans-serif',
      transform: 'none',
      letterSpacing: '1px'
    };
    coverSvg = `
      <div class="theme-illustration-container" style="padding: 0; margin: 0 auto; height: 65px;">
        <svg viewBox="0 0 100 100" style="width: 55px; height: 55px; fill: #fde047;">
          <!-- 3D Birthday Cake & Sparkler SVG -->
          <path d="M20,60 L80,60 L80,85 L20,85 Z M15,55 L85,55 L85,60 L15,60 Z M30,35 L70,35 L70,55 L30,55 Z M48,15 L52,15 L52,35 L48,35 Z" />
          <circle cx="50" cy="10" r="4" fill="#f43f5e" />
        </svg>
      </div>
    `;
    customClass = 'theme-duck-birthday';

  } else if (prompt.includes('jurassic') || prompt.includes('dino') || prompt.includes('dinosaur') || prompt.includes('jungle') || prompt.includes('prehistoric')) {
    themeName = 'jurassic';
    colors = {
      bg: '#051408',
      bgGradient: 'linear-gradient(135deg, #051408 0%, #0d2814 50%, #1a3d1f 100%)',
      text: '#f8fafc',
      textMuted: '#a3e635',
      accent: '#f59e0b',
      accentRgb: '245, 158, 11',
      border: '2px solid #f59e0b',
      softBg: 'rgba(245, 158, 11, 0.12)',
      particleColor: 'rgba(132, 204, 22, 0.6)'
    };
    fonts = {
      script: 'Cinzel Decorative, Cormorant Garamond, serif',
      title: 'Montserrat, sans-serif',
      transform: 'uppercase',
      letterSpacing: '3px'
    };
    coverSvg = `
      <div class="theme-illustration-container" style="padding: 0; margin: 0 auto; height: 65px;">
        <svg viewBox="0 0 100 100" style="width: 55px; height: 55px; fill: #f59e0b;">
          <!-- T-Rex Dinosaur Footprint SVG -->
          <path d="M50,15 C45,15 42,25 45,35 L40,55 C35,45 25,40 18,48 C12,54 18,65 25,65 L42,65 L50,90 L58,65 L75,65 C82,65 88,54 82,48 C75,40 65,45 60,55 L55,35 C58,25 55,15 50,15 Z" />
        </svg>
      </div>
    `;
    customClass = 'theme-jurassic';

  } else if (prompt.includes('cyberpunk') || prompt.includes('neon') || prompt.includes('futuristic') || prompt.includes('tech')) {
    themeName = 'cyberpunk';
    colors = {
      bg: '#050814',
      bgGradient: 'linear-gradient(135deg, #050814 0%, #0c122c 50%, #1a0b2e 100%)',
      text: '#ffffff',
      textMuted: '#94a3b8',
      accent: '#00f0ff',
      accentRgb: '0, 240, 255',
      border: '2px solid #00f0ff',
      softBg: 'rgba(0, 240, 255, 0.12)',
      particleColor: 'rgba(255, 0, 127, 0.6)'
    };
    fonts = {
      script: '"Courier New", monospace',
      title: 'Montserrat, sans-serif',
      transform: 'uppercase',
      letterSpacing: '2px'
    };
    coverSvg = `
      <div class="theme-illustration-container" style="padding: 0; margin: 0 auto; height: 60px;">
        <svg viewBox="0 0 100 100" style="width: 50px; height: 50px; fill: none; stroke: #00f0ff; stroke-width: 2.5;">
          <polygon points="50,10 90,32 90,78 50,100 10,78 10,32" />
          <circle cx="50" cy="55" r="15" stroke="#ff007f" stroke-width="2" />
        </svg>
      </div>
    `;
    customClass = 'theme-cyberpunk';

  } else if (prompt.includes('galaxy') || prompt.includes('space') || prompt.includes('cosmic') || prompt.includes('star') || prompt.includes('bintang')) {
    themeName = 'galaxy';
    colors = {
      bg: '#02020a',
      bgGradient: 'linear-gradient(135deg, #02020a 0%, #090924 50%, #161238 100%)',
      text: '#f8fafc',
      textMuted: '#94a3b8',
      accent: '#fcd34d',
      accentRgb: '252, 211, 77',
      border: '1.5px solid #fcd34d',
      softBg: 'rgba(252, 211, 77, 0.1)',
      particleColor: 'rgba(56, 189, 248, 0.6)'
    };
    fonts = {
      script: 'Great Vibes, cursive',
      title: 'Playfair Display, serif',
      transform: 'none',
      letterSpacing: '1px'
    };
    coverSvg = `
      <div class="theme-illustration-container" style="padding: 0; margin: 0 auto; height: 60px;">
        <svg viewBox="0 0 100 100" style="width: 50px; height: 50px; fill: none;">
          <ellipse cx="50" cy="50" rx="35" ry="12" stroke="#38bdf8" stroke-width="2" transform="rotate(-20, 50, 50)" />
          <circle cx="50" cy="50" r="16" fill="#fcd34d" />
        </svg>
      </div>
    `;
    customClass = 'theme-galaxy';

  } else if (prompt.includes('magic') || prompt.includes('harry') || prompt.includes('potter') || prompt.includes('wizard') || prompt.includes('sihir')) {
    themeName = 'magic';
    colors = {
      bg: '#0a0813',
      bgGradient: 'linear-gradient(135deg, #0a0813 0%, #1a1527 100%)',
      text: '#e2e8f0',
      textMuted: '#a78bfa',
      accent: '#c084fc',
      accentRgb: '192, 132, 252',
      border: '1.5px double #c084fc',
      softBg: 'rgba(192, 132, 252, 0.1)',
      particleColor: 'rgba(192, 132, 252, 0.5)'
    };
    fonts = {
      script: 'Great Vibes, cursive',
      title: 'Playfair Display, serif',
      transform: 'none',
      letterSpacing: '1px'
    };
    coverSvg = `
      <div class="theme-illustration-container" style="padding: 0; margin: 0 auto; height: 60px;">
        <div class="magic-scene-box" style="height: 60px;">
          <div class="golden-snitch">
            <div class="snitch-wing left"></div>
            <div class="snitch-wing right"></div>
          </div>
        </div>
      </div>
    `;
    interactiveHtml = `
      <div id="pinkHeartPulse" class="heart-pulse-overlay" style="background-color: var(--card-accent)"></div>
    `;
    customClass = 'theme-magic';
    
  } else {
    // Dynamic Procedural Theme (HSL)
    let hue = 160;
    let sat = 65;
    let light = 10;
    let isDark = true;
    
    if (prompt.includes('biru') || prompt.includes('blue') || prompt.includes('laut') || prompt.includes('ocean')) {
      hue = 210;
    } else if (prompt.includes('merah') || prompt.includes('red') || prompt.includes('api') || prompt.includes('fire')) {
      hue = 0;
    } else if (prompt.includes('hijau') || prompt.includes('green') || prompt.includes('forest') || prompt.includes('daun') || prompt.includes('hutan')) {
      hue = 120;
    } else if (prompt.includes('kuning') || prompt.includes('yellow') || prompt.includes('emas') || prompt.includes('gold') || prompt.includes('mewah')) {
      hue = 45;
    } else if (prompt.includes('purple') || prompt.includes('ungu') || prompt.includes('galaxy') || prompt.includes('gelap') || prompt.includes('batman') || prompt.includes('dark')) {
      hue = 275;
    } else if (prompt.includes('putih') || prompt.includes('white') || prompt.includes('minimal')) {
      hue = 200;
      sat = 5;
      isDark = false;
    }
    
    if (isDark) {
      colors.bg = `hsl(${hue}, ${sat}%, 8%)`;
      colors.bgGradient = `linear-gradient(135deg, hsl(${hue}, ${sat}%, 8%) 0%, hsl(${hue}, ${sat}%, 16%) 100%)`;
      colors.text = '#ffffff';
      colors.textMuted = `hsl(${hue}, 15%, 75%)`;
      colors.accent = `hsl(${hue}, 80%, 60%)`;
      colors.accentRgb = hexToRgb(hslToHex(hue, 80, 60));
      colors.border = `1.5px solid rgba(${colors.accentRgb}, 0.35)`;
      colors.softBg = `rgba(${colors.accentRgb}, 0.08)`;
      colors.particleColor = `rgba(${colors.accentRgb}, 0.45)`;
    } else {
      colors.bg = `hsl(${hue}, ${sat}%, 97%)`;
      colors.bgGradient = `linear-gradient(135deg, hsl(${hue}, ${sat}%, 97%) 0%, hsl(${hue}, ${sat}%, 91%) 100%)`;
      colors.text = '#1e293b';
      colors.textMuted = `hsl(${hue}, 15%, 45%)`;
      colors.accent = `hsl(${hue}, 70%, 42%)`;
      colors.accentRgb = hexToRgb(hslToHex(hue, 70, 42));
      colors.border = `1.5px solid rgba(${colors.accentRgb}, 0.25)`;
      colors.softBg = `rgba(${colors.accentRgb}, 0.06)`;
      colors.particleColor = `rgba(${colors.accentRgb}, 0.3)`;
    }

    coverSvg = `
      <div class="theme-illustration-container" style="padding: 0; margin: 0 auto; height: 60px;">
        <svg viewBox="0 0 100 100" style="width: 55px; height: 55px; fill: none; stroke: ${colors.accent}; stroke-width: 2;">
          <polygon points="50,5 64,36 98,36 70,57 81,91 50,70 19,91 30,57 2,36 36,36" fill="${colors.softBg}" />
          <circle cx="50" cy="50" r="10" fill="${colors.accent}" />
        </svg>
      </div>
    `;
  }

  return { themeName, colors, fonts, customClass, particleType, coverSvg, interactiveHtml };
}

function hslToHex(h, s, l) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '16, 185, 129';
}

function playDinoRoarSound() {
  try {
    const ctx = synthPiano.ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (!synthPiano.ctx) synthPiano.ctx = ctx;
    if (ctx.state === 'suspended') ctx.resume();
    const time = ctx.currentTime;
    
    // Low Frequency Roar Oscillator
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.8);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, time);
    filter.frequency.exponentialRampToValueAtTime(100, time + 0.8);
    
    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.85);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(time);
    osc.stop(time + 0.9);
  } catch(e) {}
}

function playThemeSoundscape() {
  const theme = appState.theme;
  if (theme === 'jurassic') {
    playDinoRoarSound();
  } else if (theme === 'spiderman') {
    playWebSound();
  } else if (theme === 'mario') {
    playJumpSound();
  } else if (theme === 'barbie' || theme === 'magic' || theme === 'fantasy') {
    playSweetBellSound();
  }
}

function playSweetBellSound() {
  try {
    const ctx = synthPiano.ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (!synthPiano.ctx) synthPiano.ctx = ctx;
    if (ctx.state === 'suspended') ctx.resume();
    const time = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, time);
    
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.6);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(time);
    osc.stop(time + 0.62);
  } catch(e) {}
}

// OpenRouter Free AI API Theme Generator
async function generateCustomThemeWithOpenRouter(promptText, apiKey) {
  const endpoint = 'https://openrouter.ai/api/v1/chat/completions';
  
  const systemPrompt = `You are a world-class UI designer generating a theme JSON for invitation card prompt "${promptText}".
Output ONLY valid JSON matching this exact structure:
{
  "themeName": "custom",
  "colors": {
    "bg": "#0f0a1c",
    "bgGradient": "linear-gradient(135deg, #0f0a1c 0%, #1c1038 100%)",
    "text": "#ffffff",
    "textMuted": "#94a3b8",
    "accent": "#fbbf24",
    "accentRgb": "251, 191, 36",
    "border": "1.5px solid #fbbf24",
    "softBg": "rgba(251, 191, 36, 0.1)",
    "particleColor": "rgba(251, 191, 36, 0.5)"
  },
  "fonts": {
    "script": "Great Vibes, cursive",
    "title": "Playfair Display, serif",
    "transform": "none",
    "letterSpacing": "1px"
  },
  "particleType": "spark"
}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'HTTP-Referer': 'https://suhaimimahaditrade.github.io/ecard/',
        'X-Title': 'E-Card Studio',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openrouter/free',
        messages: [
          { role: 'user', content: systemPrompt }
        ]
      })
    });

    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
      let rawText = data.choices[0].message.content.trim();
      
      // Try to find JSON block in output
      const jsonMatch = rawText.match(/\{[\s\S]*"colors"[\s\S]*\}/);
      if (jsonMatch) {
        rawText = jsonMatch[0];
      }
      
      const parsed = JSON.parse(rawText);
      const semantic = generateCustomTheme(promptText);
      
      return {
        themeName: semantic.themeName !== 'custom' ? semantic.themeName : (parsed.themeName || 'custom'),
        colors: semantic.themeName !== 'custom' ? semantic.colors : (parsed.colors || semantic.colors),
        fonts: semantic.themeName !== 'custom' ? semantic.fonts : (parsed.fonts || semantic.fonts),
        particleType: semantic.particleType || parsed.particleType || 'spark',
        coverSvg: semantic.coverSvg,
        interactiveHtml: semantic.interactiveHtml,
        customClass: semantic.customClass
      };
    }
  } catch (e) {
    console.warn('[OPENROUTER PARSE FALLBACK]', e);
  }

  // Graceful fallback to Semantic AI
  return generateCustomTheme(promptText);
}

// Gemini API Theme Generator
async function generateCustomThemeWithGemini(promptText, apiKey) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const systemPrompt = `You are a world-class UI designer generating a custom theme for a digital invitation card based on user prompt: "${promptText}".
Return ONLY a valid JSON object without any markdown wrapping or formatting. The JSON must match this structure:
{
  "themeName": "custom",
  "colors": {
    "bg": "#hex",
    "bgGradient": "linear-gradient(135deg, #hex 0%, #hex 100%)",
    "text": "#hex",
    "textMuted": "#hex",
    "accent": "#hex",
    "accentRgb": "r, g, b",
    "border": "1.5px solid rgba(...)",
    "softBg": "rgba(...)",
    "particleColor": "rgba(...)"
  },
  "fonts": {
    "script": "Great Vibes, cursive",
    "title": "Playfair Display, serif",
    "transform": "none",
    "letterSpacing": "1px"
  },
  "particleType": "spark",
  "coverSvg": "<div class=\\"theme-illustration-container\\"><svg viewBox=\\"0 0 100 100\\" style=\\"width: 55px; height: 55px;\\">...</svg></div>"
}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: systemPrompt }] }]
    })
  });

  const data = await response.json();
  if (data.candidates && data.candidates[0].content.parts[0].text) {
    let rawText = data.candidates[0].content.parts[0].text.trim();
    rawText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(rawText);
  }
  throw new Error('Respons Gemini API tidak sah.');
}

// Instant 0ms Theme Application for Prompt Chips
window.applyPresetThemeDirectly = function(promptText) {
  const promptInput = document.getElementById('inputCustomTheme');
  if (promptInput) promptInput.value = promptText;

  const theme = generateCustomTheme(promptText);
  appState.theme = theme.themeName;
  appState.customThemeActive = true;
  appState.customThemePrompt = promptText;
  appState.customThemeColors = theme.colors;
  appState.customThemeFonts = theme.fonts;
  appState.customThemeClass = theme.customClass || 'theme-custom';
  appState.customThemeCoverSvg = theme.coverSvg;
  appState.customThemeInteractiveHtml = theme.interactiveHtml || '';
  appState.customThemeParticleType = theme.particleType || 'circle';

  applyCustomTheme();
  renderMainIllustration();
  try { triggerCinematicStoryboard(); } catch(e) {}
};

// Custom Theme Generator Controller (Supports OpenRouter API, Gemini API & Semantic Local AI Engine)
function initCustomThemeGenerator() {
  const btn = document.getElementById('btnGenerateTheme');
  const promptInput = document.getElementById('inputCustomTheme');
  const engineSelect = document.getElementById('selectAiEngine');
  const openRouterGroup = document.getElementById('openRouterApiKeyGroup');
  const openRouterInput = document.getElementById('inputOpenRouterApiKey');
  const geminiGroup = document.getElementById('geminiApiKeyGroup');
  const geminiInput = document.getElementById('inputGeminiApiKey');
  const statusBox = document.getElementById('aiGenerationStatus');
  const statusText = document.getElementById('aiStatusText');

  if (!btn || !promptInput) return;

  // Load saved API keys from localStorage
  const savedOpenRouterKey = localStorage.getItem('ecard_openrouter_api_key') || '';
  const savedGeminiKey = localStorage.getItem('ecard_gemini_api_key') || '';

  if (openRouterInput) {
    openRouterInput.value = savedOpenRouterKey;
    openRouterInput.addEventListener('input', () => {
      localStorage.setItem('ecard_openrouter_api_key', openRouterInput.value.trim());
    });
  }

  if (geminiInput) {
    geminiInput.value = savedGeminiKey;
    geminiInput.addEventListener('input', () => {
      localStorage.setItem('ecard_gemini_api_key', geminiInput.value.trim());
    });
  }

  const updateApiKeyGroupVisibility = () => {
    if (!engineSelect) return;
    const mode = engineSelect.value;
    if (openRouterGroup) openRouterGroup.style.display = mode === 'openrouter-api' ? 'block' : 'none';
    if (geminiGroup) geminiGroup.style.display = mode === 'gemini-api' ? 'block' : 'none';
  };

  if (engineSelect) {
    engineSelect.addEventListener('change', updateApiKeyGroupVisibility);
    updateApiKeyGroupVisibility();
  }

  const triggerGeneration = async () => {
    const promptText = promptInput.value.trim();
    if (!promptText) {
      alert('Sila taipkan sesuatu pada arahan tema (prompt).');
      return;
    }

    if (statusBox && statusText) {
      statusBox.style.display = 'block';
      statusText.textContent = '🤖 AI sedang menguraikan konsep & mereka tema...';
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Merencana...';

    // Deactivate standard theme buttons active state
    const themeButtons = document.querySelectorAll('.theme-picker .theme-btn');
    themeButtons.forEach(b => b.classList.remove('active'));

    try {
      let theme = null;
      const engineMode = engineSelect ? engineSelect.value : 'openrouter-api';
      const openRouterKey = openRouterInput ? openRouterInput.value.trim() : '';
      const geminiKey = geminiInput ? geminiInput.value.trim() : '';

      if (engineMode === 'openrouter-api' && openRouterKey) {
        if (statusText) statusText.textContent = '🌐 Menghubungi OpenRouter AI API (Free Model)...';
        theme = await generateCustomThemeWithOpenRouter(promptText, openRouterKey);
      } else if (engineMode === 'gemini-api' && geminiKey) {
        if (statusText) statusText.textContent = '⚡ Menghubungi Google Gemini API...';
        theme = await generateCustomThemeWithGemini(promptText, geminiKey);
      } else {
        if (statusText) statusText.textContent = '✨ Generasi Semantik AI Dalaman...';
        theme = generateCustomTheme(promptText);
      }

      // Save generated theme into appState
      appState.theme = theme.themeName || 'custom';
      appState.customThemeActive = true;
      appState.customThemePrompt = promptText;
      appState.customThemeColors = theme.colors;
      appState.customThemeFonts = theme.fonts;
      appState.customThemeClass = theme.customClass || 'theme-custom';
      appState.customThemeCoverSvg = theme.coverSvg;
      appState.customThemeInteractiveHtml = theme.interactiveHtml || '';
      appState.customThemeParticleType = theme.particleType || 'circle';

      applyCustomTheme();
      renderMainIllustration();

      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Tema Berjaya Dijana!';
      btn.style.background = '#10b981';

      if (statusBox) {
        statusBox.style.display = 'none';
      }

      setTimeout(() => {
        btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Jana Tema Dengan AI';
        btn.style.background = '';
      }, 2500);

    } catch (e) {
      console.error('[AI THEME ERROR]', e);
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Gagal (Guna Local AI)';
      btn.style.background = '#ef4444';

      if (statusText) statusText.textContent = '❌ Gagal. Menggunakan Enjin Semantik...';

      // Fallback to local semantic theme generator
      const fallbackTheme = generateCustomTheme(promptText);
      appState.theme = fallbackTheme.themeName;
      appState.customThemeActive = true;
      appState.customThemePrompt = promptText;
      appState.customThemeColors = fallbackTheme.colors;
      appState.customThemeFonts = fallbackTheme.fonts;
      appState.customThemeClass = fallbackTheme.customClass;
      appState.customThemeCoverSvg = fallbackTheme.coverSvg;
      appState.customThemeInteractiveHtml = fallbackTheme.interactiveHtml;
      appState.customThemeParticleType = fallbackTheme.particleType;

      applyCustomTheme();
      renderMainIllustration();

      setTimeout(() => {
        btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Jana Tema Dengan AI';
        btn.style.background = '';
        if (statusBox) statusBox.style.display = 'none';
      }, 2500);
    }
  };

  btn.addEventListener('click', triggerGeneration);

  // Auto-trigger on Enter keypress inside prompt textarea
  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      triggerGeneration();
    }
  });
}

function applyCustomTheme() {
  if (!appState.customThemeActive) return;

  const colors = appState.customThemeColors;
  const fonts = appState.customThemeFonts;

  // Select 1080p 60FPS Motion Video Background URL
  let videoUrl = 'https://assets.mixkit.co/videos/preview/mixkit-glowing-gold-particles-moving-in-a-loop-41589-large.mp4';
  const promptLower = (appState.customThemePrompt || '').toLowerCase();
  
  if (appState.theme === 'jurassic' || promptLower.includes('jungle') || promptLower.includes('dino') || promptLower.includes('jurassic')) {
    videoUrl = 'https://assets.mixkit.co/videos/preview/mixkit-dramatic-mysterious-forest-in-a-foggy-day-42868-large.mp4';
  } else if (appState.theme === 'duck-birthday' || promptLower.includes('birthday') || promptLower.includes('sparkler') || promptLower.includes('cake')) {
    videoUrl = 'https://assets.mixkit.co/videos/preview/mixkit-sparkler-fireworks-burning-in-the-dark-41584-large.mp4';
  } else if (appState.theme === 'cyberpunk' || promptLower.includes('cyberpunk') || promptLower.includes('neon')) {
    videoUrl = 'https://assets.mixkit.co/videos/preview/mixkit-neon-lights-in-a-dark-tunnel-41588-large.mp4';
  } else if (appState.theme === 'rose-gold' || promptLower.includes('rose') || promptLower.includes('sakura') || promptLower.includes('flower')) {
    videoUrl = 'https://assets.mixkit.co/videos/preview/mixkit-pink-petals-falling-slowly-in-the-wind-41587-large.mp4';
  }

  // Inject Video Background Element into Card Containers
  const injectVideo = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    let videoEl = container.querySelector('.bg-motion-video');
    if (!videoEl) {
      videoEl = document.createElement('video');
      videoEl.className = 'bg-motion-video';
      videoEl.autoplay = true;
      videoEl.loop = true;
      videoEl.muted = true;
      videoEl.playsInline = true;
      container.insertBefore(videoEl, container.firstChild);
    }
    if (videoEl.src !== videoUrl) {
      videoEl.src = videoUrl;
      videoEl.load();
      videoEl.play().catch(e => {});
    }
  };

  try { injectVideo('envelopeCover'); } catch(e) {}
  try { injectVideo('cardContainer'); } catch(e) {}

  let bgStyle = colors.bgGradient || 'linear-gradient(135deg, #051408 0%, #1a3d1f 100%)';
  if (appState.customThemePrompt) {
    const enrichedPrompt = appState.customThemePrompt + ', cinematic 8k unreal engine 5 render, epic atmospheric lighting, fantasy masterpiece, photorealistic';
    const aiImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enrichedPrompt)}&width=800&height=1400&nologo=true&seed=88`;
    bgStyle = `linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(5,20,8,0.7) 40%, rgba(5,20,8,0.95) 100%), url('${aiImageUrl}'), ${colors.bgGradient}`;
  }

  // ✅ NUCLEAR OPTION: Inject a <style> tag with !important rules
  // This bypasses ALL CSS specificity, inline style conflicts, and inheritance issues
  let styleTag = document.getElementById('customThemeStyleTag');
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'customThemeStyleTag';
    document.head.appendChild(styleTag);
  }

  styleTag.textContent = `
    /* === CCO MASTER AI THEME OVERRIDE (v${Date.now()}) === */
    #envelopeCover {
      background: ${bgStyle} !important;
      background-size: cover !important;
      background-position: center !important;
      color: ${colors.text} !important;
    }
    #cardContainer, .phone-screen {
      background: ${bgStyle} !important;
      background-size: cover !important;
      background-position: center !important;
      color: ${colors.text} !important;
    }
    .card-content {
      background: ${bgStyle} !important;
      background-size: cover !important;
      background-position: center !important;
      color: ${colors.text} !important;
    }
    .card-section, .event-card, .timeline-card {
      background: rgba(0, 0, 0, 0.55) !important;
      backdrop-filter: blur(12px) !important;
      -webkit-backdrop-filter: blur(12px) !important;
      border: 1px solid rgba(${colors.accentRgb}, 0.35) !important;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.1) !important;
    }
    .envelope-card {
      border-color: ${colors.accent} !important;
      background-color: ${colors.softBg || 'rgba(0,0,0,0.3)'} !important;
      box-shadow: 0 10px 30px rgba(${colors.accentRgb}, 0.35) !important;
    }
    .envelope-card::before {
      border-color: rgba(${colors.accentRgb}, 0.3) !important;
    }
    #btnOpenCard {
      background-color: ${colors.accent} !important;
      color: ${colors.bg.startsWith('linear') ? '#ffffff' : colors.text} !important;
      font-family: ${fonts.title || 'Montserrat, sans-serif'} !important;
    }
    #coverShortNames, .font-script, .hero-names {
      background: linear-gradient(135deg, #bf953f 0%, #fcf6ba 25%, #b38728 50%, #fbf5b7 75%, #aa771c 100%) !important;
      -webkit-background-clip: text !important;
      background-clip: text !important;
      color: transparent !important;
      font-family: ${fonts.script || 'Cinzel Decorative, Pinyon Script, serif'} !important;
      font-size: 2.8rem !important;
      font-weight: 700 !important;
      letter-spacing: ${fonts.letterSpacing || '2px'} !important;
      filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.9)) !important;
      padding: 0.2rem 0 !important;
    }
    #coverTitle, .wedding-tagline, #previewTagline {
      color: ${colors.accent || '#fde047'} !important;
      font-family: ${fonts.title || 'Montserrat, sans-serif'} !important;
      text-transform: ${fonts.transform || 'uppercase'} !important;
      letter-spacing: ${fonts.letterSpacing || '3px'} !important;
      font-size: 0.85rem !important;
      font-weight: 700 !important;
    }
    .card-content {
      background: ${colors.bgGradient} !important;
      color: ${colors.text} !important;
    }
    .card-section {
      color: ${colors.text} !important;
    }
    .hero-date, .card-text, p {
      color: ${colors.textMuted} !important;
    }
    .divider-ornament {
      color: ${colors.accent} !important;
    }
    .event-card {
      border-color: rgba(${colors.accentRgb}, 0.35) !important;
      background-color: ${colors.softBg} !important;
    }
    .event-info .event-label {
      color: ${colors.accent} !important;
    }
    .avatar-circle {
      border-color: ${colors.accent} !important;
      background: rgba(${colors.accentRgb}, 0.15) !important;
    }
    .avatar-name {
      color: ${colors.accent} !important;
    }
    .couple-section .couple-connector {
      color: ${colors.accent} !important;
    }
    .guest-name-box {
      color: ${colors.accent} !important;
      background-color: rgba(${colors.accentRgb}, 0.1) !important;
      border-color: rgba(${colors.accentRgb}, 0.25) !important;
    }
    .particle {
      background-color: ${colors.particleColor} !important;
    }
    .btn-nav {
      background: rgba(${colors.accentRgb}, 0.15) !important;
      border-color: rgba(${colors.accentRgb}, 0.3) !important;
      color: ${colors.accent} !important;
    }
    .countdown-box {
      background: rgba(${colors.accentRgb}, 0.1) !important;
      border-color: rgba(${colors.accentRgb}, 0.25) !important;
    }
    .countdown-box .count-num {
      color: ${colors.accent} !important;
    }
    .countdown-box .count-label {
      color: ${colors.textMuted} !important;
    }
  `;

  // Set data-card-theme attribute
  const cardContainer = document.getElementById('cardContainer');
  if (cardContainer) cardContainer.setAttribute('data-card-theme', appState.theme);

  // Set CSS variables too (belt AND suspenders approach)
  if (cardContainer) {
    cardContainer.style.setProperty('--card-bg', colors.bg);
    cardContainer.style.setProperty('--card-bg-gradient', colors.bgGradient);
    cardContainer.style.setProperty('--card-text', colors.text);
    cardContainer.style.setProperty('--card-text-muted', colors.textMuted);
    cardContainer.style.setProperty('--card-accent', colors.accent);
    cardContainer.style.setProperty('--card-accent-rgb', colors.accentRgb);
    cardContainer.style.setProperty('--card-border', colors.border);
    cardContainer.style.setProperty('--card-soft-bg', colors.softBg);
    cardContainer.style.setProperty('--particle-color', colors.particleColor);
    cardContainer.style.setProperty('--theme-script-font', fonts.script);
    cardContainer.style.setProperty('--theme-title-font', fonts.title);
    cardContainer.style.setProperty('--theme-text-transform', fonts.transform);
    cardContainer.style.setProperty('--theme-letter-spacing', fonts.letterSpacing);
  }

  // Inject cover illustration
  const defaultWreath = document.getElementById('defaultCoverWreath');
  const customWreath = document.getElementById('customCoverWreath');
  
  if (appState.customThemePrompt) {
    const aiCoverImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(appState.customThemePrompt + ', 3d cinematic unreal engine 5 render, highly detailed, beautiful lighting, invitation card poster')}&width=800&height=500&nologo=true&seed=88`;
    if (defaultWreath) defaultWreath.style.display = 'none';
    if (customWreath) {
      customWreath.style.display = 'block';
      customWreath.innerHTML = `
        <div class="ai-cover-banner">
          <img src="${aiCoverImageUrl}" class="ai-cover-img" alt="${escapeHtml(appState.customThemePrompt)}" loading="lazy">
        </div>
      `;
    }
  } else if (appState.customThemeCoverSvg) {
    if (defaultWreath) defaultWreath.style.display = 'none';
    if (customWreath) { customWreath.style.display = 'block'; customWreath.innerHTML = appState.customThemeCoverSvg; }
  } else {
    if (defaultWreath) defaultWreath.style.display = 'block';
    if (customWreath) { customWreath.style.display = 'none'; customWreath.innerHTML = ''; }
  }

  // Inject interactive HTML
  const interactiveContainer = document.getElementById('customThemeInteractiveContainer');
  if (interactiveContainer) {
    if (appState.customThemeInteractiveHtml) {
      interactiveContainer.innerHTML = appState.customThemeInteractiveHtml;
      initThemeInteractions();
    } else {
      interactiveContainer.innerHTML = '';
    }
  }

  // Inject animated illustration scene (wrapped in try-catch to prevent crashes)
  try { renderMainIllustration(); } catch(e) { console.warn('renderMainIllustration error:', e); }
  try { createParticles('coverParticles', 10); } catch(e) { console.warn('createParticles error:', e); }

  // Also update avatars to match theme
  const avatars = document.querySelectorAll('.avatar-circle');
  if (avatars.length >= 2) {
    if (!appState.bridePhoto) {
      if (appState.theme === 'mario') {
        avatars[0].innerHTML = `<svg viewBox="0 0 100 100" style="width: 75%; height: 75%; fill: #e52521;"><path d="M 50 15 C 30 15 20 30 20 50 C 20 60 25 65 30 65 C 35 65 38 60 40 55 C 43 55 45 60 45 65 C 45 75 35 85 50 85 C 65 85 55 75 55 65 C 55 60 57 55 60 55 C 62 60 65 65 70 65 C 75 65 80 60 80 50 C 80 30 70 15 50 15 Z" /><circle cx="35" cy="35" r="8" fill="white" /><circle cx="65" cy="35" r="8" fill="white" /><circle cx="50" cy="50" r="7" fill="white" /></svg>`;
      } else if (appState.theme === 'spiderman') {
        avatars[0].innerHTML = `<svg viewBox="0 0 100 100" style="width: 80%; height: 80%; fill: #e53e3e;"><path d="M50,15 C30,15 22,35 22,55 C22,75 38,90 50,90 C62,90 78,75 78,55 C78,35 70,15 50,15 Z" /><path d="M50,15 L50,90 M22,55 L78,55 M28,30 L72,70 M28,70 L72,30" stroke="black" stroke-width="1.5" /><path d="M28,45 C28,45 35,62 50,55 C45,52 35,45 28,45 Z" fill="white" stroke="black" stroke-width="3" /><path d="M72,45 C72,45 65,62 50,55 C55,52 65,45 72,45 Z" fill="white" stroke="black" stroke-width="3" /></svg>`;
      } else if (appState.theme === 'barbie') {
        avatars[0].innerHTML = `<svg viewBox="0 0 100 100" style="width: 80%; height: 80%; fill: #e91e63;"><path d="M15,75 L85,75 L90,35 L70,50 L50,20 L30,50 L10,35 Z" /><circle cx="50" cy="20" r="4" fill="#ffeb3b" /><circle cx="10" cy="35" r="4" fill="#ffeb3b" /><circle cx="90" cy="35" r="4" fill="#ffeb3b" /><rect x="25" y="70" width="50" height="5" fill="#f48fb1" /></svg>`;
      }
    }
    if (!appState.groomPhoto) {
      if (appState.theme === 'mario') {
        avatars[1].innerHTML = `<svg viewBox="0 0 100 100" style="width: 75%; height: 75%; fill: #4caf50;"><path d="M 50 15 C 30 15 20 30 20 50 C 20 60 25 65 30 65 C 35 65 38 60 40 55 C 43 55 45 60 45 65 C 45 75 35 85 50 85 C 65 85 55 75 55 65 C 55 60 57 55 60 55 C 62 60 65 65 70 65 C 75 65 80 60 80 50 C 80 30 70 15 50 15 Z" /><circle cx="35" cy="35" r="8" fill="white" /><circle cx="65" cy="35" r="8" fill="white" /><circle cx="50" cy="50" r="7" fill="white" /></svg>`;
      } else if (appState.theme === 'spiderman') {
        avatars[1].innerHTML = `<svg viewBox="0 0 100 100" style="width: 70%; height: 70%; stroke: #1e3a8a; stroke-width: 5; fill: none;"><circle cx="50" cy="50" r="10" fill="#1e3a8a" /><path d="M 50 35 L 50 65 M 35 25 Q 40 45 50 45 M 65 25 Q 60 45 50 45 M 30 50 L 50 50 M 70 50 L 50 50 M 35 75 Q 40 55 50 55 M 65 75 Q 60 55 50 55" /></svg>`;
      } else if (appState.theme === 'barbie') {
        avatars[1].innerHTML = `<svg viewBox="0 0 100 100" style="width: 80%; height: 80%; fill: #e91e63;"><path d="M12,25 C1,12 18,-2 35,11 C52,-2 69,12 58,25 L35,46 Z" transform="translate(15,18) scale(1.1)"/></svg>`;
      }
    }
  }
}


function triggerCinematicStoryboard() {
  const phoneScreen = document.querySelector('.phone-screen');
  if (!phoneScreen) return;

  // Remove existing stage if any
  const oldStage = document.getElementById('storyboardStage');
  if (oldStage) oldStage.remove();

  const stage = document.createElement('div');
  stage.id = 'storyboardStage';
  stage.className = 'storyboard-stage';

  const namesText = appState.shortNames || 'Aiman & Sarah';
  const dateText = appState.eventDate || '12 Disember 2026';

  // Build Dinosaur Storyboard Narrative Stage
  if (appState.theme === 'jurassic' || appState.customThemePrompt.toLowerCase().includes('dino') || appState.customThemePrompt.toLowerCase().includes('jurassic')) {
    stage.innerHTML = `
      <!-- Scene 1: Raptor Running with Couple Name Plaque -->
      <div class="storyboard-character raptor-run">
        <svg viewBox="0 0 100 100" style="width: 75px; height: 75px; fill: #a3e635; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.8));">
          <path d="M50,20 C40,10 20,20 20,40 L35,40 C40,30 50,30 55,35 L40,65 C30,65 20,80 30,90 C40,90 50,75 55,70 L70,85 L80,85 L70,60 C80,50 90,30 75,20 Z" />
        </svg>
        <div class="storyboard-signboard"><i class="fa-solid fa-heart"></i> ${escapeHtml(namesText)}</div>
      </div>

      <!-- Scene 2: T-Rex Roaring Chase Sequence -->
      <div class="storyboard-character trex-chase">
        <svg viewBox="0 0 100 100" style="width: 105px; height: 105px; fill: #f59e0b; filter: drop-shadow(0 6px 15px rgba(0,0,0,0.9));">
          <path d="M70,10 C50,5 30,20 25,45 C25,60 35,70 30,90 L45,90 C50,75 55,70 65,75 C75,80 85,75 90,60 L70,55 C80,45 85,30 70,10 Z M40,35 A5,5 0 1,1 40,35.1 Z" />
        </svg>
        <div class="storyboard-signboard" style="border-color: #ef4444; color: #ef4444; background: rgba(239,68,68,0.2);"><i class="fa-solid fa-fire"></i> ROAAAR!</div>
      </div>

      <!-- Scene 3: Flying Pterodactyl Carrying Cake & Date Banner -->
      <div class="storyboard-character dino-cake">
        <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; fill: #fde047; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.8));">
          <path d="M10,50 Q50,10 90,50 Q50,40 10,50 Z M50,40 L50,70 L40,85 L60,85 Z" />
        </svg>
        <div class="storyboard-signboard" style="border-color: #fde047; color: #fde047;"><i class="fa-solid fa-cake-candles"></i> ${escapeHtml(dateText)}</div>
      </div>
    `;

    // Trigger Screen Shake camera effect when T-Rex appears
    setTimeout(() => {
      phoneScreen.classList.add('screen-shake');
      try { playDinoRoarSound(); } catch(e) {}
    }, 2500);

    setTimeout(() => {
      phoneScreen.classList.remove('screen-shake');
    }, 4500);

  } else if (appState.theme === 'duck-birthday' || appState.customThemePrompt.toLowerCase().includes('duck')) {
    // Duck Chef Motorcycle & Sparklers Narrative Stage
    stage.innerHTML = `
      <div class="storyboard-character raptor-run" style="bottom: 150px;">
        <svg viewBox="0 0 100 100" style="width: 85px; height: 85px; fill: #fde047; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.8));">
          <circle cx="50" cy="30" r="20" />
          <path d="M30,50 L70,50 L80,80 L20,80 Z" fill="#ffffff" />
          <circle cx="30" cy="85" r="12" fill="#333" />
          <circle cx="70" cy="85" r="12" fill="#333" />
        </svg>
        <div class="storyboard-signboard" style="border-color: #fde047; color: #fde047;"><i class="fa-solid fa-motorcycle"></i> 🐥 ${escapeHtml(namesText)}</div>
      </div>

      <div class="storyboard-character dino-cake" style="bottom: 80px;">
        <div class="storyboard-signboard" style="border-color: #f43f5e; color: #ffffff; background: #f43f5e;"><i class="fa-solid fa-birthday-cake"></i> 🎂 ${escapeHtml(dateText)}</div>
      </div>
    `;
  }

  phoneScreen.appendChild(stage);

  // Clean up stage after full animation completes
  setTimeout(() => {
    if (stage) stage.remove();
  }, 11000);
}

function triggerMarioJump() {
  const mario = document.getElementById('marioCharacter');
  if (!mario || mario.classList.contains('jump')) return;
  
  mario.classList.add('jump');
  playJumpSound();
  
  setTimeout(() => {
    mario.classList.remove('jump');
  }, 500);
}

function triggerSpiderwebShoot() {
  const web = document.getElementById('spiderWebAnimation');
  if (!web) return;
  
  web.classList.add('shoot');
  playWebSound();
  
  setTimeout(() => {
    web.classList.remove('shoot');
  }, 1200);
}

function triggerBarbiePulse() {
  const heart = document.getElementById('pinkHeartPulse');
  if (!heart) return;
  
  heart.classList.add('pulse');
  playSweetBellSound();
  
  setTimeout(() => {
    heart.classList.remove('pulse');
  }, 1100);
}

// Dynamic Main Illustration Renderer
function renderMainIllustration() {
  const container = document.getElementById('customThemeMainIllustration');
  if (!container) return;
  
  const theme = appState.theme;
  
  // If custom AI prompt active, render prominent 3D Motion AI Poster Banner
  if (appState.customThemePrompt) {
    const aiImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(appState.customThemePrompt + ', 3d cinematic unreal engine 5 render, 60fps animation, highly detailed, beautiful lighting, invitation card poster')}&width=800&height=500&nologo=true&seed=88`;
    
    container.innerHTML = `
      <div class="ai-poster-banner-wrapper">
        <img src="${aiImageUrl}" class="ai-poster-img animated-motion" alt="${escapeHtml(appState.customThemePrompt)}" loading="lazy">
        <div class="sparkler-flame-overlay"></div>
        <div class="ai-poster-badge"><i class="fa-solid fa-wand-magic-sparkles"></i> AI 3D ${escapeHtml(appState.customThemePrompt)}</div>
      </div>
    `;
    return;
  }

  if (theme === 'mario') {
    container.innerHTML = `
      <div class="theme-illustration-container">
        <div class="mario-scene-box">
          <svg viewBox="0 0 100 100" style="position: absolute; top: 10px; left: 10px; width: 40px; fill: white; opacity: 0.8;">
            <path d="M20,50 C20,40 30,35 40,40 C45,30 65,30 70,40 C80,40 85,50 80,60 C75,65 25,65 20,50 Z"/>
          </svg>
          <div class="mario-scene-lawn"></div>
          <div class="mario-scene-pipe">
            <svg viewBox="0 0 100 100" style="position: absolute; top: -16px; left: 2px; width: 25px; fill: #e52521; animation: plantPeek 2.5s infinite ease-in-out;">
              <path d="M50,10 C30,10 20,25 20,45 L80,45 C80,25 70,10 50,10 Z" />
              <path d="M20,45 L80,45 L50,75 Z" fill="#ffffff" />
            </svg>
            <style>
              @keyframes plantPeek {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(12px); }
              }
            </style>
          </div>
          <div class="mario-scene-block">
            <svg viewBox="0 0 100 100" style="fill: #f8d818; stroke: #000; stroke-width: 6;">
              <rect x="5" y="5" width="90" height="90"/>
              <text x="30" y="70" font-family="Courier New" font-size="70" font-weight="900" fill="#000">?</text>
            </svg>
          </div>
        </div>
      </div>
    `;
  } else if (theme === 'spiderman') {
    container.innerHTML = `
      <div class="theme-illustration-container">
        <div class="spiderman-scene-box">
          <div style="position: absolute; top: 0; left: 50%; width: 1.5px; height: 50px; background-color: #fff; opacity: 0.7;"></div>
          <div class="spiderman-hanging">
            <svg viewBox="0 0 100 150" style="width: 100%; height: 100%;">
              <circle cx="50" cy="55" r="14" fill="#1e3a8a" />
              <circle cx="50" cy="30" r="12" fill="#e53e3e" />
              <path d="M50,10 C38,10 32,22 32,32 C32,45 42,50 50,50 C58,50 68,45 68,32 C68,22 62,10 50,10 Z" fill="#e53e3e" transform="rotate(180, 50, 30)" />
              <path d="M40,32 C40,32 45,22 50,26 C48,28 42,32 40,32 Z M60,32 C60,32 55,22 50,26 C52,28 58,32 60,32 Z" fill="white" stroke="black" stroke-width="1.5" />
              <path d="M36,65 L25,40 L45,45 M64,65 L75,40 L55,45" stroke="#e53e3e" stroke-width="4" fill="none" />
            </svg>
          </div>
        </div>
      </div>
    `;
  } else if (theme === 'barbie') {
    container.innerHTML = `
      <div class="theme-illustration-container">
        <div class="barbie-scene-box">
          <svg class="barbie-diamond" viewBox="0 0 100 100">
            <path d="M50,10 L85,40 L50,90 L15,40 Z M25,40 L50,80 L75,40 L50,20 Z" />
          </svg>
        </div>
      </div>
    `;
  } else if (theme === 'magic') {
    container.innerHTML = `
      <div class="theme-illustration-container">
        <div class="magic-scene-box">
          <div class="golden-snitch">
            <div class="snitch-wing left"></div>
            <div class="snitch-wing right"></div>
          </div>
        </div>
      </div>
    `;
  } else if (theme === 'jurassic') {
    container.innerHTML = `
      <div class="theme-illustration-container">
        <div style="height: 80px; display: flex; align-items: center; justify-content: center;">
          <svg viewBox="0 0 100 100" style="width: 60px; height: 60px; fill: #f59e0b; filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.6));">
            <path d="M50,15 C45,15 42,25 45,35 L40,55 C35,45 25,40 18,48 C12,54 18,65 25,65 L42,65 L50,90 L58,65 L75,65 C82,65 88,54 82,48 C75,40 65,45 60,55 L55,35 C58,25 55,15 50,15 Z" />
          </svg>
        </div>
      </div>
    `;
  } else if (theme === 'fantasy') {
    container.innerHTML = `
      <div class="theme-illustration-container">
        <div style="height: 80px; display: flex; align-items: center; justify-content: center; position: relative;">
          <svg viewBox="0 0 100 100" style="width: 70px; height: 70px; fill: none; stroke: ${appState.customThemeColors ? appState.customThemeColors.accent : '#fbbf24'}; stroke-width: 2.5; filter: drop-shadow(0 0 8px rgba(192, 132, 252, 0.8));">
            <path d="M20,80 L20,40 L30,40 L30,80 M40,80 L40,25 L50,15 L60,25 L60,80 M70,80 L70,40 L80,40 L80,80 M15,80 L85,80" />
            <path d="M45,55 L55,55 L55,80 L45,80 Z" fill="#fbbf24" opacity="0.4" />
            <circle cx="50" cy="15" r="4" fill="#c084fc" />
          </svg>
        </div>
      </div>
    `;
  } else if (theme === 'cyberpunk') {
    container.innerHTML = `
      <div class="theme-illustration-container">
        <div style="height: 80px; display: flex; align-items: center; justify-content: center;">
          <svg viewBox="0 0 100 100" style="width: 60px; height: 60px; fill: none; stroke: #00f0ff; stroke-width: 3; filter: drop-shadow(0 0 10px #ff007f);">
            <polygon points="50,10 90,32 90,78 50,100 10,78 10,32" />
            <circle cx="50" cy="55" r="15" stroke="#ff007f" stroke-width="2.5" />
          </svg>
        </div>
      </div>
    `;
  } else if (theme === 'galaxy') {
    container.innerHTML = `
      <div class="theme-illustration-container">
        <div style="height: 80px; display: flex; align-items: center; justify-content: center;">
          <svg viewBox="0 0 100 100" style="width: 65px; height: 65px; fill: none; filter: drop-shadow(0 0 12px #38bdf8);">
            <ellipse cx="50" cy="50" rx="38" ry="14" stroke="#38bdf8" stroke-width="2.5" transform="rotate(-20, 50, 50)" />
            <circle cx="50" cy="50" r="18" fill="#fcd34d" />
          </svg>
        </div>
      </div>
    `;
  } else if (appState.customThemeActive && appState.customThemeCoverSvg) {
    container.innerHTML = `
      <div class="theme-illustration-container">
        <div style="height: 80px; display: flex; align-items: center; justify-content: center;">
          ${appState.customThemeCoverSvg}
        </div>
      </div>
    `;
  } else {
    // Default heartbeat scene for weddings
    container.innerHTML = `
      <div class="theme-illustration-container">
        <div class="heartbeat-scene-box">
          <svg class="beating-heart" viewBox="0 0 100 100">
            <path d="M12,30 C1,15 22,-5 50,25 C78,-5 99,15 88,30 L50,85 Z" />
          </svg>
          <svg class="beating-heart" viewBox="0 0 100 100">
            <path d="M12,30 C1,15 22,-5 50,25 C78,-5 99,15 88,30 L50,85 Z" />
          </svg>
        </div>
      </div>
    `;
  }
}

// ==========================================
// NEXT-LEVEL UNMATCHED INTERACTIVE ENGINES
// ==========================================

// 1. 3D Tilt & Holographic Foil Engine
function init3DTiltEngine() {
  const frame = document.getElementById('phone3dFrame');
  const screen = document.getElementById('cardContainer');
  const sheen = document.getElementById('foilSheen');

  if (!frame || !screen) return;

  const handleMove = (e) => {
    const rect = screen.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      resetTilt();
      return;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -12; // Max 12deg tilt
    const rotateY = ((x - centerX) / centerX) * 12;

    frame.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;

    if (sheen) {
      const sheenX = ((x / rect.width) * 100) - 25;
      const sheenY = ((y / rect.height) * 100) - 25;
      sheen.style.transform = `translate(${sheenX}%, ${sheenY}%)`;
    }
  };

  const resetTilt = () => {
    frame.style.transform = 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
  };

  document.addEventListener('mousemove', handleMove);
  document.addEventListener('touchmove', handleMove, { passive: true });
  document.addEventListener('mouseleave', resetTilt);
}

// 2. 60FPS Interactive Touch / Tap Physics Canvas Engine
let canvasParticles = [];
let animFrameId = null;

function initInteractiveCanvasEngine() {
  const canvas = document.getElementById('interactiveCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const resizeCanvas = () => {
    canvas.width = canvas.offsetWidth || 340;
    canvas.height = canvas.offsetHeight || 600;
  };
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const spawnParticles = (x, y, count = 12) => {
    const theme = appState.theme || 'emerald';
    for (let i = 0; i < count; i++) {
      let color = appState.customThemeColors ? appState.customThemeColors.accent : '#d4af37';
      let size = Math.random() * 6 + 3;
      let vx = (Math.random() - 0.5) * 6;
      let vy = (Math.random() - 0.7) * 6;
      let shape = 'circle';
      let rotation = Math.random() * Math.PI * 2;
      let vRot = (Math.random() - 0.5) * 0.1;

      if (theme === 'mario') {
        color = '#f8d818';
        shape = 'coin';
      } else if (theme === 'spiderman') {
        color = Math.random() > 0.5 ? '#e53e3e' : '#3182ce';
        shape = 'spark';
      } else if (theme === 'barbie') {
        color = '#e91e63';
        shape = 'heart';
      } else if (theme === 'rose-gold' || theme === 'rose') {
        color = '#b76e79';
        shape = 'petal';
      }

      canvasParticles.push({
        x, y, vx, vy, size, color, shape,
        alpha: 1, life: 1, rotation, vRot
      });
    }
  };

  const handleTap = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    spawnParticles(x, y, 15);
  };

  canvas.addEventListener('click', handleTap);
  canvas.addEventListener('touchstart', handleTap, { passive: true });

  const renderLoop = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = canvasParticles.length - 1; i >= 0; i--) {
      const p = canvasParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // Gravity
      p.life -= 0.02;
      p.alpha = Math.max(0, p.life);
      p.rotation += p.vRot;

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;

      if (p.shape === 'coin') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (p.shape === 'heart') {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-p.size, -p.size, -p.size * 1.5, p.size / 3, 0, p.size * 1.2);
        ctx.bezierCurveTo(p.size * 1.5, p.size / 3, p.size, -p.size, 0, 0);
        ctx.fill();
      } else if (p.shape === 'petal') {
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      if (p.life <= 0) {
        canvasParticles.splice(i, 1);
      }
    }

    animFrameId = requestAnimationFrame(renderLoop);
  };

  if (animFrameId) cancelAnimationFrame(animFrameId);
  renderLoop();
}

// 3. Vinyl Record Audio Player Controller
function initVinylAudioPlayer() {
  const widget = document.getElementById('cardVinylPlayer');
  if (!widget) return;

  widget.addEventListener('click', () => {
    playMusic();
    if (musicState && musicState.isPlaying) {
      widget.classList.add('playing');
    } else {
      widget.classList.remove('playing');
    }
  });
}

// 4. Interactive Timeline Journey Engine
function initTimelineEngine() {
  const container = document.getElementById('previewTimelineJourney');
  const headerTitle = document.getElementById('previewTimelineHeaderTitle');
  if (!container) return;

  const updateTimeline = () => {
    const titleInput = document.getElementById('inputTimelineTitle');
    const t1Title = document.getElementById('inputTime1Title');
    const t1Date = document.getElementById('inputTime1Date');
    const t1Desc = document.getElementById('inputTime1Desc');
    const t2Title = document.getElementById('inputTime2Title');
    const t2Date = document.getElementById('inputTime2Date');
    const t2Desc = document.getElementById('inputTime2Desc');

    if (headerTitle && titleInput) {
      headerTitle.textContent = (titleInput.value || 'KISAH CINTA KAMI').toUpperCase();
    }

    let html = '';
    
    // Milestone 1
    if (t1Title && t1Title.value.trim()) {
      html += `
        <div class="timeline-item">
          <div class="timeline-dot"></div>
          <div class="timeline-card">
            <div class="timeline-date">${t1Date ? escapeHtml(t1Date.value) : ''}</div>
            <div class="timeline-title-text">${escapeHtml(t1Title.value)}</div>
            <div class="timeline-desc">${t1Desc ? escapeHtml(t1Desc.value) : ''}</div>
            ${appState.time1Photo ? `<img src="${appState.time1Photo}" class="timeline-photo" alt="Momen 1">` : ''}
          </div>
        </div>
      `;
    }

    // Milestone 2
    if (t2Title && t2Title.value.trim()) {
      html += `
        <div class="timeline-item">
          <div class="timeline-dot"></div>
          <div class="timeline-card">
            <div class="timeline-date">${t2Date ? escapeHtml(t2Date.value) : ''}</div>
            <div class="timeline-title-text">${escapeHtml(t2Title.value)}</div>
            <div class="timeline-desc">${t2Desc ? escapeHtml(t2Desc.value) : ''}</div>
            ${appState.time2Photo ? `<img src="${appState.time2Photo}" class="timeline-photo" alt="Momen 2">` : ''}
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  };

  // Bind inputs
  ['inputTimelineTitle', 'inputTime1Title', 'inputTime1Date', 'inputTime1Desc', 'inputTime2Title', 'inputTime2Date', 'inputTime2Desc'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateTimeline);
  });

  // Bind photo uploads
  const up1 = document.getElementById('uploadTime1Photo');
  if (up1) {
    up1.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          appState.time1Photo = evt.target.result;
          updateTimeline();
        };
        reader.readAsDataURL(file);
      }
    });
  }

  const up2 = document.getElementById('uploadTime2Photo');
  if (up2) {
    up2.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          appState.time2Photo = evt.target.result;
          updateTimeline();
        };
        reader.readAsDataURL(file);
      }
    });
  }

  updateTimeline();
}

// 5. Confetti Celebration Blast for RSVP
function triggerThemeConfetti() {
  const canvas = document.getElementById('interactiveCanvas');
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  for (let i = 0; i < 45; i++) {
    const color = ['#f8d818', '#e53e3e', '#e91e63', '#10b981', '#6366f1', '#ffffff'][Math.floor(Math.random() * 6)];
    canvasParticles.push({
      x: centerX,
      y: centerY,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.8) * 14,
      size: Math.random() * 7 + 4,
      color,
      shape: Math.random() > 0.5 ? 'coin' : 'circle',
      alpha: 1,
      life: 1.5,
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.2
    });
  }
  playSweetBellSound();
}

// Global holding variables for compiler export files
let inlinedCss = '';
let inlinedJsStandalone = '';

// Load fallback CSS in script directly in case AJAX fails (offline file protocol)
function loadCssFallbacks() {
  inlinedCss = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Montserrat', sans-serif; height: 100vh; overflow-x: hidden; }
  `;
}

// App Initialization entrypoint
window.addEventListener('DOMContentLoaded', () => {
  seedWishes();
  initBindings();
  initThemePicker();
  initCustomThemeGenerator(); // Setup AI Theme Generator
  applyCustomTheme();
  renderMainIllustration();
  updatePreview();
  startCountdown();
  createParticles('coverParticles', 10);
  initGuestName();
  renderWishes();
  initRsvpForm();
  initCalendarGenerator();
  initResetButton();
  initMobileViewSwitcher();
  initEnvelopeOpener();
  initHtmlExporter();
  loadCssFallbacks();
  
  // Initialize Unmatched Next-Level Features
  init3DTiltEngine();
  initInteractiveCanvasEngine();
  initVinylAudioPlayer();
  initTimelineEngine();
  
  // Floating Music Click listener
  const floatMusic = document.getElementById('cardFloatingMusic');
  if (floatMusic) {
    floatMusic.addEventListener('click', () => {
      playMusic();
    });
  }
  
  // Back to Studio click listener (useful on exported cards preview)
  const backBtn = document.getElementById('backToStudio');
  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('editorPanel').scrollIntoView({ behavior: 'smooth' });
    });
  }
});


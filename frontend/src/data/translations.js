// =====================================================
// Centralized Translations Dictionary — Citizen Emergency Reporting
// Supports English (en) and Telugu (te) with easy extensibility
// =====================================================

export const TRANSLATIONS = {
  en: {
    // Mode toggles
    simpleMode: 'Simple Mode',
    standardMode: 'Standard Mode',
    modeDescription: 'Simple Mode is designed for quick voice, visual, and one-tap reporting.',

    // Header & Meta
    headerTitle: 'Report an Emergency',
    headerSubtitle: 'Tell us what happened. We will help organize the response.',
    systemReady: 'SYSTEM READY',
    back: 'Back to Dashboard',

    // Instructions Audio
    listenInstructions: 'Listen to instructions',
    instructionSpeech: 'Welcome. Select the emergency type, tap the microphone to speak what happened, share your location, and tap Send Emergency Report.',

    // Big Hero Action
    heroBadge: 'EMERGENCY DISPATCH LINK',
    heroTitle: 'Need Immediate Help?',
    heroHelp: 'Follow the simple steps below. You can speak instead of typing.',

    // Types
    typesTitle: '1. What kind of emergency is it?',
    typesSubtitle: 'Tap the card that best matches your situation:',
    types: {
      medical: {
        label: 'Medical',
        sublabel: 'Heart attack, injury, illness',
        spoken: 'Medical emergency',
      },
      road_accident: {
        label: 'Road Accident',
        sublabel: 'Car crash, bike, vehicle hit',
        spoken: 'Road accident',
      },
      fire: {
        label: 'Fire',
        sublabel: 'Flames, smoke, explosion',
        spoken: 'Fire emergency',
      },
      crime: {
        label: 'Crime / Safety',
        sublabel: 'Assault, theft, danger',
        spoken: 'Crime and personal safety',
      },
      natural_disaster: {
        label: 'Flood / Disaster',
        sublabel: 'Heavy flood, storm, collapse',
        spoken: 'Flood or natural disaster',
      },
      other: {
        label: 'Other Help',
        sublabel: 'Any other urgent emergency',
        spoken: 'Other emergency assistance',
      },
    },

    // Voice & Speech
    voiceSectionTitle: '2. Tell us what happened',
    voiceSubtitle: 'Speak naturally or type below if you prefer:',
    tapToSpeak: 'TAP TO SPEAK',
    listening: 'Listening... Please speak now',
    stopListening: 'STOP RECORDING',
    weHeard: 'We heard:',
    useThis: 'Use This',
    speakAgain: 'Speak Again',
    speechUnsupported: 'Voice speech recognition is not supported in this browser. Please type below.',
    speechDenied: 'Microphone permission was denied or timed out. Please type your message below.',

    // Description text input
    descriptionLabel: 'What happened?',
    descriptionPlaceholder: 'Tell us what happened and how many people need help (minimum 10 characters)...',
    charCount: 'characters',
    minCharsNotice: 'Please provide at least 10 characters.',

    // Location
    locationSectionTitle: '3. Where is the emergency?',
    useMyLocation: 'USE MY LOCATION',
    detectingLocation: 'Detecting your GPS location...',
    locationCaptured: 'Location captured successfully',
    locationFailed: 'Location could not be found automatically.',
    enterNearbyLabel: 'Enter nearby place or landmark:',
    enterNearbyPlaceholder: 'e.g., Near Bus Stand, Market Road, or Village Gate',
    locationOptionalNote: 'Your location helps responders reach the right place quickly.',

    // Photo
    photoSectionTitle: '4. Photo (Optional)',
    takePhoto: 'TAKE A PHOTO / ATTACH',
    photoOptional: 'Photo is optional. Skip if you do not have one.',
    photoAttached: 'Photo attached',
    removePhoto: 'Remove photo',

    // Confirmation Summary Card
    reviewTitle: 'Emergency Report Summary',
    reviewSubtitle: 'Review your details before sending:',
    summaryType: 'Emergency Type',
    summaryLocation: 'Location',
    summaryDescription: 'Description',
    summaryPhoto: 'Photo Attached',
    summaryNoPhoto: 'None',
    listenSummary: 'Listen to summary',
    changeDetails: 'Change details',
    sendReport: 'SEND EMERGENCY REPORT',
    submittingReport: 'Sending Report...',

    // Human-in-the-loop
    hitlNotice: 'AI helps understand your report. A human coordinator makes the final response decision.',

    // Validation & Errors
    errSelectType: 'Please select an emergency type above.',
    errDescription: 'Please speak or type what happened (at least 10 characters).',
    errLocation: 'Please capture GPS location or enter a nearby landmark.',
    errGeneral: 'Unable to submit report. Please check your network and try again.',

    // Confirmation screen assistance
    confirmedTitle: 'Emergency Report Received',
    confirmedSubtitle: 'Your information has been sent to the response coordination system.',
    coordinatorReviewing: 'A coordinator will review the report and coordinate the response.',
  },

  te: {
    // Mode toggles
    simpleMode: 'సులభ మోడ్ (Simple)',
    standardMode: 'ప్రామాణిక మోడ్ (Standard)',
    modeDescription: 'సులభ మోడ్ మాట్లాడటం, పెద్ద చిహ్నాలు మరియు ఒకే ట్యాప్ ద్వారా నివేదించడానికి రూపొందించబడింది.',

    // Header & Meta
    headerTitle: 'అత్యవసర పరిస్థితిని నివేదించండి',
    headerSubtitle: 'ఏం జరిగిందో మాకు చెప్పండి. మేము సహాయాన్ని సమన్వయం చేస్తాము.',
    systemReady: 'వ్యవస్థ సిద్ధంగా ఉంది',
    back: 'డాష్‌బోర్డ్‌కు తిరిగి వెళ్లండి',

    // Instructions Audio
    listenInstructions: 'సూచనలను వినండి',
    instructionSpeech: 'నమస్కారం. అత్యవసర రకాన్ని ఎంచుకోండి, మైక్రోఫోన్ నొక్కి ఏం జరిగిందో మాట్లాడండి, మీ స్థానాన్ని నమోదు చేయండి, ఆపై నివేదికను పంపండి.',

    // Big Hero Action
    heroBadge: 'అత్యవసర సహాయ వ్యవస్థ',
    heroTitle: 'తక్షణ సహాయం కావాలా?',
    heroHelp: 'క్రింది సులభమైన దశలను అనుసరించండి. మీరు టైప్ చేయకుండా మాట్లాడవచ్చు.',

    // Types
    typesTitle: '1. ఇది ఎలాంటి అత్యవసర పరిస్థితి?',
    typesSubtitle: 'మీ పరిస్థితికి సరిపోయే కార్డును తాకండి:',
    types: {
      medical: {
        label: 'వైద్య అత్యవసరం',
        sublabel: 'గుండెపోటు, తీవ్ర గాయం, అనారోగ్యం',
        spoken: 'వైద్య అత్యవసరం',
      },
      road_accident: {
        label: 'రోడ్డు ప్రమాదం',
        sublabel: 'వాహన ప్రమాదం, ఢీకొనడం',
        spoken: 'రోడ్డు ప్రమాదం',
      },
      fire: {
        label: 'అగ్ని ప్రమాదం',
        sublabel: 'మంటలు, పొగ, సిలిండర్ పేలుడు',
        spoken: 'అగ్ని ప్రమాదం',
      },
      crime: {
        label: 'నేరం / భద్రత',
        sublabel: 'దాడి, దొంగతనం, ప్రమాదం',
        spoken: 'నేరం మరియు భద్రతా ప్రమాదం',
      },
      natural_disaster: {
        label: 'వరద / విపత్తు',
        sublabel: 'భారీ వరదలు, తుఫాను, కూలిపోవడం',
        spoken: 'వరద లేదా ప్రకృతి విపత్తు',
      },
      other: {
        label: 'ఇతర సహాయం',
        sublabel: 'ఇతర అత్యవసర సహాయం',
        spoken: 'ఇతర అత్యవసర సహాయం',
      },
    },

    // Voice & Speech
    voiceSectionTitle: '2. ఏం జరిగిందో మాట్లాడండి',
    voiceSubtitle: 'సహజంగా మాట్లాడండి లేదా క్రింద రాయండి:',
    tapToSpeak: 'మాట్లాడటానికి నొక్కండి (SPEAK)',
    listening: 'వింటున్నాము... దయచేసి మాట్లాడండి',
    stopListening: 'ఆపండి',
    weHeard: 'మేము విన్నది:',
    useThis: 'దీన్ని ఉపయోగించండి',
    speakAgain: 'మళ్లీ మాట్లాడండి',
    speechUnsupported: 'ఈ బ్రౌజర్‌లో వాయిస్ రికగ్నిషన్ అందుబాటులో లేదు. దయచేసి క్రింద రాయండి.',
    speechDenied: 'మైక్రోఫోన్ అనుమతి రాలేదు. దయచేసి క్రింద రాయండి.',

    // Description text input
    descriptionLabel: 'ఏం జరిగింది?',
    descriptionPlaceholder: 'ఏం జరిగింది మరియు ఎంతమందికి సహాయం కావాలో చెప్పండి (కనీసం 10 అక్షరాలు)...',
    charCount: 'అక్షరాలు',
    minCharsNotice: 'దయచేసి కనీసం 10 అక్షరాలు నమోదు చేయండి.',

    // Location
    locationSectionTitle: '3. ఈ సంఘటన ఎక్కడ జరిగింది?',
    useMyLocation: 'నా స్థానాన్ని గుర్తించండి (GPS)',
    detectingLocation: 'మీ స్థానాన్ని గుర్తిస్తున్నాము...',
    locationCaptured: 'స్థానం విజయవంతంగా గుర్తించబడింది',
    locationFailed: 'స్థానం స్వయంచాలకంగా దొరకలేదు.',
    enterNearbyLabel: 'సమీప ప్రాంతం లేదా ల్యాండ్‌మార్క్ రాయండి:',
    enterNearbyPlaceholder: 'ఉదా: బస్ స్టాండ్ దగ్గర, గాంధీ విగ్రహం, లేదా ఊరి పేరు',
    locationOptionalNote: 'సహాయ బృందం వేగంగా చేరుకోవడానికి స్థానం చాలా ముఖ్యం.',

    // Photo
    photoSectionTitle: '4. ఫోటో (ఐచ్ఛికం)',
    takePhoto: 'ఫోటో తీయండి / అప్‌లోడ్ చేయండి',
    photoOptional: 'ఫోటో తప్పనిసరి కాదు. లేకపోతే వదిలివేయవచ్చు.',
    photoAttached: 'ఫోటో జతచేయబడింది',
    removePhoto: 'ఫోటో తొలగించండి',

    // Confirmation Summary Card
    reviewTitle: 'అత్యవసర నివేదిక సారాంశం',
    reviewSubtitle: 'పంపే ముందు వివరాలను సరిచూసుకోండి:',
    summaryType: 'అత్యవసర రకం',
    summaryLocation: 'స్థానం',
    summaryDescription: 'వివరాలు',
    summaryPhoto: 'ఫోటో',
    summaryNoPhoto: 'లేదు',
    listenSummary: 'సారాంశం వినండి',
    changeDetails: 'సవరించండి',
    sendReport: 'అత్యవసర నివేదిక పంపండి',
    submittingReport: 'నివేదికను పంపుతున్నాము...',

    // Human-in-the-loop
    hitlNotice: 'AI మీ నివేదికను అర్థం చేసుకోవడంలో సహాయపడుతుంది. మానవ కోఆర్డినేటర్ తుది స్పందన నిర్ణయం తీసుకుంటారు.',

    // Validation & Errors
    errSelectType: 'దయచేసి పైన అత్యవసర రకాన్ని ఎంచుకోండి.',
    errDescription: 'దయచేసి ఏం జరిగిందో చెప్పండి లేదా రాయండి (కనీసం 10 అక్షరాలు).',
    errLocation: 'దయచేసి మీ GPS స్థానాన్ని గుర్తించండి లేదా సమీప ప్రాంతాన్ని రాయండి.',
    errGeneral: 'నివేదికను పంపడం సాధ్యపడలేదు. దయచేసి మళ్లీ ప్రయత్నించండి.',

    // Confirmation screen assistance
    confirmedTitle: 'అత్యవసర నివేదిక స్వీకరించబడింది',
    confirmedSubtitle: 'మీ సమాచారం సహాయ సమన్వయ వ్యవస్థకు పంపబడింది.',
    coordinatorReviewing: 'కోఆర్డినేటర్ నివేదికను పరిశీలించి తగిన సహాయాన్ని పంపుతారు.',
  },
};

// Text-to-Speech Helper Function
export function speakText(text, lang = 'en') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95; // Slightly slower for elderly/clear listening
    utterance.pitch = 1.0;

    if (lang === 'te') {
      utterance.lang = 'te-IN';
      // Find a Telugu voice if available
      const voices = window.speechSynthesis.getVoices?.() || [];
      const teVoice = voices.find((v) => v.lang.startsWith('te'));
      if (teVoice) utterance.voice = teVoice;
    } else {
      utterance.lang = 'en-US';
      const voices = window.speechSynthesis.getVoices?.() || [];
      const enVoice = voices.find((v) => v.lang.startsWith('en'));
      if (enVoice) utterance.voice = enVoice;
    }

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn('SpeechSynthesis error:', err);
    return false;
  }
}

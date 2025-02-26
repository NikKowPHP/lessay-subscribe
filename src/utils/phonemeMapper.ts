export const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.startsWith("http")
  ? process.env.NEXT_PUBLIC_BASE_URL
  : "https://lessay-app.vercel.app";

// Comprehensive map of IPA symbols to approximate representations for speech synthesis.
// Note: This is a best-effort approximation.  Web Speech API support for IPA varies.
//       Prioritize using pre-recorded audio files for critical accuracy.
export const ipaToSpeechMap: Record<string, {text: string, lang: string}> = {
    // Vowels (Monophthongs)
    'i': { text: 'ee', lang: 'en-US' },   // beet
    'ɪ': { text: 'i', lang: 'en-US' },    // bit
    'e': { text: 'ay', lang: 'en-US' },   // bait (often a diphthong)
    'ɛ': { text: 'e', lang: 'en-US' },    // bet
    'æ': { text: 'a', lang: 'en-US' },    // bat
    'a': { text: 'a', lang: 'en-US' }, // "a" sound, varies by dialect
    'ɑ': { text: 'ah', lang: 'en-US' },   // father
    'ɒ': { text: 'ah', lang: 'en-GB' },   // lot, cloth (British)
    'ɔ': { text: 'aw', lang: 'en-US' },   // caught, law
    'o': { text: 'oh', lang: 'en-US' },   // boat (often a diphthong)
    'ʊ': { text: 'oo', lang: 'en-US' },   // book, put
    'u': { text: 'oo', lang: 'en-US' },   // boot
    'ʌ': { text: 'uh', lang: 'en-US' },   // cut, but
    'ə': { text: 'uh', lang: 'en-US' },   // about, sofa (schwa)
    'ɝ': { text: 'er', lang: 'en-US' },   // bird (rhotic vowel)
    'ɚ': { text: 'er', lang: 'en-US' },   // butter (rhotic schwa)
    'ɨ': { text: 'ih', lang: 'en-US' },   // roses (close central unrounded)
    'ʉ': { text: 'oo', lang: 'en-US' },   // (close central rounded)
    'ɵ': {text: 'uh', lang: 'en-US'}, // close-mid central rounded vowel
    'ɘ': {text: 'uh', lang: 'en-US'}, // close-mid central unrounded vowel
    'ɜ': { text: 'er', lang: 'en-GB' },   // nurse (non-rhotic)
    'ɤ': {text: 'uh', lang: 'en-US'}, // close-mid back unrounded vowel
    'ɯ': { text: 'oo', lang: 'en-US' },   // (close back unrounded)

    // Vowels (Rounded - Less Common/Language Specific)
    'y': { text: 'ee', lang: 'fr-FR' },   // tu (French)
    'ʏ': { text: 'i', lang: 'de-DE' },   // (near-close near-front rounded, German)
    'ø': { text: 'er', lang: 'de-DE' },   // schön (German)
    'œ': { text: 'er', lang: 'fr-FR' },   // boeuf (French)
    'ɶ': { text: 'a', lang: 'de-DE' },  // (open front rounded, rare)
    'ɞ': {text: 'uh', lang: 'en-US'}, // open-mid central rounded vowel

    // Diphthongs (Common)
    'aɪ': { text: 'eye', lang: 'en-US' }, // bite
    'aʊ': { text: 'ow', lang: 'en-US' }, // bout
    'eɪ': { text: 'ay', lang: 'en-US' }, // bait
    'oʊ': { text: 'oh', lang: 'en-US' }, // boat
    'ɔɪ': { text: 'oy', lang: 'en-US' }, // boy
    'ɪə': { text: 'ear', lang: 'en-GB' },// near (British)
    'eə': { text: 'air', lang: 'en-GB' },// where (British)
    'ʊə': { text: 'oor', lang: 'en-GB' },// cure (British)

    // Consonants (Pulmonic)
    'p': { text: 'p', lang: 'en-US' },   // pen
    'b': { text: 'b', lang: 'en-US' },   // ben
    't': { text: 't', lang: 'en-US' },   // ten
    'd': { text: 'd', lang: 'en-US' },   // den
    'k': { text: 'k', lang: 'en-US' },   // cat
    'ɡ': { text: 'g', lang: 'en-US' },   // get
    'ʔ': { text: '', lang: 'en-US' },    // uh-oh (glottal stop)
    'm': { text: 'm', lang: 'en-US' },   // man
    'n': { text: 'n', lang: 'en-US' },   // no
    'ŋ': { text: 'ng', lang: 'en-US' },  // sing
    'f': { text: 'f', lang: 'en-US' },   // fan
    'v': { text: 'v', lang: 'en-US' },   // van
    'θ': { text: 'th', lang: 'en-US' },  // thin
    'ð': { text: 'th', lang: 'en-US' },  // this
    's': { text: 's', lang: 'en-US' },   // so
    'z': { text: 'z', lang: 'en-US' },   // zoo
    'ʃ': { text: 'sh', lang: 'en-US' },  // shoe
    'ʒ': { text: 'zh', lang: 'fr-FR' },  // measure, vision
    'h': { text: 'h', lang: 'en-US' },   // hat
    'l': { text: 'l', lang: 'en-US' },   // let
    'r': { text: 'r', lang: 'en-US' },   // red (American)
    'j': { text: 'y', lang: 'en-US' },   // yes
    'w': { text: 'w', lang: 'en-US' },   // wet

    // Consonants (Pulmonic - Less Common/Language Specific)
    'ʍ': { text: 'wh', lang: 'en-US' },  // which (some dialects)
    'ɬ': { text: 'thl', lang: 'en-US' }, // Welsh ll (voiceless alveolar lateral fricative)
    'ɮ': { text: 'dl', lang: 'en-US' }, // (voiced alveolar lateral fricative)
    'β': { text: 'v', lang: 'es-ES' },   // (voiced bilabial fricative, Spanish)
    'ɱ': { text: 'm', lang: 'en-US' },   // (labiodental nasal)
    'ɲ': { text: 'ny', lang: 'es-ES' },  // (palatal nasal, Spanish ñ)
    'ɾ': { text: 'r', lang: 'es-ES' },   // (alveolar tap, Spanish pero)
    'ʀ': { text: 'r', lang: 'fr-FR' },   // (uvular trill, French/German)
    'ç': { text: 'ch', lang: 'de-DE' },  // ich (German)
    'ʝ': { text: 'y', lang: 'es-ES' },   // (voiced palatal fricative)
    'x': { text: 'ch', lang: 'de-DE' },  // Bach (German)
    'ɣ': { text: 'gh', lang: 'en-US' }, // voiced velar fricative
    'χ': { text: 'ch', lang: 'de-DE' },  // (voiceless uvular fricative)
    'ʁ': { text: 'r', lang: 'fr-FR' },   // (voiced uvular fricative/approximant, French)
    'ħ': { text: 'h', lang: 'ar-SA' },   // (voiceless pharyngeal fricative)
    'ʕ': { text: 'ah', lang: 'ar-SA' },  // (voiced pharyngeal fricative)
    'ɦ': { text: 'h', lang: 'en-US' }, // breathy h
    'ʋ': { text: 'v', lang: 'en-US'}, // labiodental approximant
    'ɹ': { text: 'r', lang: 'en-US' },   // red (American)
    'ɻ': { text: 'r', lang: 'en-US' }, // retroflex approximant
    'ɰ': { text: 'w', lang: 'en-US' }, // velar approximant
    'ɭ': { text: 'l', lang: 'en-US' }, // retroflex l
    'ʎ': { text: 'ly', lang: 'es-ES' }, // palatal l (Spanish "ll")
    'ʟ': { text: 'l', lang: 'en-US' }, // velar l
    'ɽ': {text: 'rd', lang: 'en-US'}, // retroflex tap
    'ʙ': {text: 'b', lang: 'en-US'}, // trill
    'ⱱ': {text: 'v', lang: 'en-US'}, // labiodental flap

    // Consonants (Retroflex - Less Common)
    'ʈ': { text: 't', lang: 'en-US' },   // (retroflex t)
    'ɖ': { text: 'd', lang: 'en-US' },   // (retroflex d)
    'ʂ': { text: 'sh', lang: 'en-US' },  // (retroflex sh)
    'ʐ': { text: 'zh', lang: 'en-US' },  // (retroflex zh)
    'ɳ': { text: 'n', lang: 'en-US' },   // (retroflex n)

    // Clicks (Very Limited Support - Approximations)
    'ʘ': { text: 'click', lang: 'en-US' },// (bilabial click)
    'ǀ': { text: 'click', lang: 'en-US' },// (dental click)
    'ǃ': { text: 'click', lang: 'en-US' },// (alveolar click)
    'ǂ': { text: 'click', lang: 'en-US' },// (palato-alveolar click)
    'ǁ': { text: 'click', lang: 'en-US' },// (lateral click)
    'ǃ˞': { text: 'click', lang: 'en-US' },// (retroflex click)

    // Other Symbols (Limited/No Support - Use with Caution)
    'ɥ': { text: 'y', lang: 'fr-FR' },   // (labial-palatal approximant)
    'ʜ': { text: 'h', lang: 'en-US' },   // (voiceless epiglottal fricative)
    'ʢ': { text: 'ah', lang: 'ar-SA' },  // (voiced epiglottal fricative)
    'ʡ': { text: '', lang: 'en-US' },    // (epiglottal stop)
    'ʕ̞': {text: 'ah', lang: 'ar-SA'}, // epiglottal fricative

     // Nasalized Vowels (French - Approximations)
    'ɑ̃': { text: 'ah', lang: 'fr-FR' }, // (French an)
    'ɔ̃': { text: 'on', lang: 'fr-FR' }, // (French on)
    'ɛ̃': { text: 'an', lang: 'fr-FR' }, // (French in)
    'œ̃': { text: 'un', lang: 'fr-FR' }, // (French un)
};

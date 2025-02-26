export const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.startsWith("http")
  ? process.env.NEXT_PUBLIC_BASE_URL
  : "https://lessay-app.vercel.app";



  // Map of IPA symbols to approximate representations that speech synthesis can handle
export const ipaToSpeechMap: Record<string, {text: string, lang: string}> = {
  // Vowels
  'æ': {text: 'a', lang: 'en-US'}, // as in "cat"
  'ɑ': {text: 'ah', lang: 'en-US'}, // as in "father"
  'ɒ': {text: 'ah', lang: 'en-US'}, // as in "cot" (British English)
  'ə': {text: 'uh', lang: 'en-US'}, // schwa
  'ɛ': {text: 'e', lang: 'en-US'}, // as in "bed"
  'ɜ': {text: 'er', lang: 'en-US'}, // as in "nurse" (British English)
  'i': {text: 'ee', lang: 'en-US'}, // as in "beet"
  'ɪ': {text: 'i', lang: 'en-US'}, // as in "bit"
  'ɨ': {text: 'i', lang: 'en-US'}, // close central unrounded vowel
  'ʉ': {text: 'oo', lang: 'en-US'}, // close central rounded vowel
  'ɯ': {text: 'oo', lang: 'en-US'}, // close back unrounded vowel
  'ɔ': {text: 'aw', lang: 'en-US'}, // as in "caught"
  'ʊ': {text: 'oo', lang: 'en-US'}, // as in "book"
  'u': {text: 'oo', lang: 'en-US'}, // as in "boot"
  'ʌ': {text: 'uh', lang: 'en-US'}, // as in "but"
  'e': {text: 'ay', lang: 'en-US'}, // as in "say"
  'o': {text: 'oh', lang: 'en-US'},
  'a': {text: 'ah', lang: 'en-US'},
  'ɘ': {text: 'uh', lang: 'en-US'}, // close-mid central unrounded vowel
  'ɵ': {text: 'uh', lang: 'en-US'}, // close-mid central rounded vowel
  'ɤ': {text: 'uh', lang: 'en-US'}, // close-mid back unrounded vowel
  'ø': {text: 'er', lang: 'de-DE'}, // as in German "schön"
  'œ': {text: 'er', lang: 'fr-FR'}, // as in French "boeuf"
  'ɶ': {text: 'er', lang: 'fr-FR'}, // open-mid front rounded vowel
  'ɑ̃': {text: 'ah', lang: 'fr-FR'}, // as in French "chant"
  'ɛ̃': {text: 'eh', lang: 'fr-FR'}, // as in French "vin"
  'ɔ̃': {text: 'oh', lang: 'fr-FR'}, // as in French "bon"
  'œ̃': {text: 'uh', lang: 'fr-FR'}, // as in French "un"

  // Consonants
  'p': {text: 'p', lang: 'en-US'}, // as in "pen"
  'b': {text: 'b', lang: 'en-US'}, // as in "ball"
  't': {text: 't', lang: 'en-US'}, // as in "top"
  'd': {text: 'd', lang: 'en-US'}, // as in "dog"
  'ʈ': {text: 't', lang: 'en-US'}, // retroflex t
  'ɖ': {text: 'd', lang: 'en-US'}, // retroflex d
  'k': {text: 'k', lang: 'en-US'}, // as in "cat"
  'ɡ': {text: 'g', lang: 'en-US'}, // as in "go"
  'q': {text: 'k', lang: 'en-US'}, // voiceless uvular stop
  'ɢ': {text: 'g', lang: 'en-US'}, // voiced uvular stop
  'ʔ': {text: '', lang: 'en-US'}, // glottal stop (uh-oh)
  'm': {text: 'm', lang: 'en-US'}, // as in "man"
  'ɱ': {text: 'm', lang: 'en-US'}, // labiodental nasal
  'n': {text: 'n', lang: 'en-US'}, // as in "no"
  'ɳ': {text: 'n', lang: 'en-US'}, // retroflex n
  'ɲ': {text: 'ny', lang: 'es-ES'}, // palatal nasal (Spanish "ñ")
  'ŋ': {text: 'ng', lang: 'en-US'}, // as in "sing"
  'ɴ': {text: 'ng', lang: 'en-US'}, // uvular nasal
  'f': {text: 'f', lang: 'en-US'}, // as in "fan"
  'v': {text: 'v', lang: 'en-US'}, // as in "van"
  'θ': {text: 'th', lang: 'en-US'}, // as in "think"
  'ð': {text: 'th', lang: 'en-US'}, // as in "this"
  's': {text: 's', lang: 'en-US'}, // as in "sun"
  'z': {text: 'z', lang: 'en-US'}, // as in "zoo"
  'ʃ': {text: 'sh', lang: 'en-US'}, // as in "ship"
  'ʒ': {text: 'zh', lang: 'fr-FR'}, // as in "measure"
  'ʂ': {text: 'sh', lang: 'en-US'}, // retroflex sh
  'ʐ': {text: 'zh', lang: 'en-US'}, // retroflex zh
  'ç': {text: 'ch', lang: 'de-DE'}, // as in German "ich"
  'ʝ': {text: 'j', lang: 'es-ES'}, // palatal fricative
  'x': {text: 'h', lang: 'de-DE'}, // as in German "Bach"
  'ɣ': {text: 'gh', lang: 'en-US'}, // voiced velar fricative
  'χ': {text: 'h', lang: 'en-US'}, // voiceless uvular fricative
  'ʁ': {text: 'r', lang: 'de-DE'}, // German R
  'ħ': {text: 'h', lang: 'ar-SA'}, // pharyngeal fricative
  'ʕ': {text: 'ah', lang: 'ar-SA'}, // voiced pharyngeal fricative
  'h': {text: 'h', lang: 'en-US'}, // as in "hat"
  'ɦ': {text: 'h', lang: 'en-US'}, // breathy h
  'ɬ': {text: 'th', lang: 'en-US'}, // voiceless lateral fricative
  'ɮ': {text: 'dl', lang: 'en-US'}, // voiced lateral fricative
  'ʋ': {text: 'v', lang: 'en-US'}, // labiodental approximant
  'ɹ': {text: 'r', lang: 'en-US'}, // as in "red"
  'ɻ': {text: 'r', lang: 'en-US'}, // retroflex approximant
  'j': {text: 'y', lang: 'en-US'}, // as in "yes"
  'ɰ': {text: 'w', lang: 'en-US'}, // velar approximant
  'l': {text: 'l', lang: 'en-US'}, // as in "lip"
  'ɭ': {text: 'l', lang: 'en-US'}, // retroflex l
  'ʎ': {text: 'ly', lang: 'es-ES'}, // palatal l (Spanish "ll")
  'ʟ': {text: 'l', lang: 'en-US'}, // velar l
  'ɾ': {text: 'r', lang: 'es-ES'}, // tap
  'ɽ': {text: 'rd', lang: 'en-US'}, // retroflex tap
  'ʙ': {text: 'b', lang: 'en-US'}, // trill
  'r': {text: 'r', lang: 'es-ES'}, // Trilled R
  'ⱱ': {text: 'v', lang: 'en-US'}, // labiodental flap
  'ʡ': {text: '', lang: 'en-US'}, // epiglottal plosive
  'ʕ̞': {text: 'ah', lang: 'ar-SA'}, // epiglottal fricative
  'ʜ': {text: 'h', lang: 'en-US'}, // voiceless epiglottal trill
  'ʢ': {text: 'ah', lang: 'ar-SA'}, // voiced epiglottal trill
  'ǀ': {text: 'click', lang: 'en-US'}, // dental click
  'ǁ': {text: 'click', lang: 'en-US'}, // lateral click
  'ǃ': {text: 'click', lang: 'en-US'}, // alveolar click
  'ǂ': {text: 'click', lang: 'en-US'}, // palatal click

  // Diphthongs (examples, adjust as needed)
  'aɪ': {text: 'eye', lang: 'en-US'}, // as in "eye"
  'aʊ': {text: 'ow', lang: 'en-US'}, // as in "cow"
  'eɪ': {text: 'ay', lang: 'en-US'}, // as in "day"
  'oʊ': {text: 'oh', lang: 'en-US'}, // as in "go"
  'ɔɪ': {text: 'oy', lang: 'en-US'}, // as in "boy"
};

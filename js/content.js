// Content: languages, conditions, interview script, everyday-word dictionary and guideline sources.
// Everything a translator or reviewer might need to check lives in this one file.
'use strict';

const LANGS = [
  { id: 'en', label: 'English', speech: 'en-US' },
  { id: 'te', label: 'తెలుగు · Telugu', speech: 'te-IN', roman: true },
  { id: 'hi', label: 'हिन्दी · Hindi', speech: 'hi-IN', roman: true },
  { id: 'es', label: 'Español · Spanish', speech: 'es-US' },
];

const CONDS = [
  { id: 'heart', short: 'Heart', en: 'Heart disease or heart attack', te: 'గుండె జబ్బు / గుండెపోటు', te_r: 'Gunde jabbu / gundepotu', hi: 'दिल की बीमारी / दिल का दौरा', hi_r: 'Dil ki beemaari / dil ka daura', es: 'Enfermedad del corazón o infarto' },
  { id: 'stroke', short: 'Stroke', en: 'Stroke', te: 'పక్షవాతం (స్ట్రోక్)', te_r: 'Pakshavaatam (stroke)', hi: 'लकवा (स्ट्रोक)', hi_r: 'Lakwa (stroke)', es: 'Derrame cerebral' },
  { id: 'bp', short: 'BP', en: 'High blood pressure', te: 'బీపీ (అధిక రక్తపోటు)', te_r: 'BP (adhika raktapotu)', hi: 'हाई बीपी (उच्च रक्तचाप)', hi_r: 'High BP (uchch raktachaap)', es: 'Presión alta' },
  { id: 'chol', short: 'Chol', en: 'High cholesterol', te: 'కొలెస్ట్రాల్ ఎక్కువ', te_r: 'Cholesterol ekkuva', hi: 'हाई कोलेस्ट्रॉल', hi_r: 'High cholesterol', es: 'Colesterol alto' },
  { id: 'diabetes', short: 'Diab', en: 'Diabetes', te: 'షుగర్ (మధుమేహం)', te_r: 'Sugar (madhumeham)', hi: 'शुगर (मधुमेह)', hi_r: 'Sugar (madhumeh)', es: 'Diabetes' },
  { id: 'cancer', short: 'Cancer', en: 'Cancer', te: 'క్యాన్సర్', te_r: 'Cancer', hi: 'कैंसर', hi_r: 'Cancer', es: 'Cáncer' },
  { id: 'kidney', short: 'Kidney', en: 'Kidney disease', te: 'కిడ్నీ జబ్బు', te_r: 'Kidney jabbu', hi: 'गुर्दे (किडनी) की बीमारी', hi_r: 'Gurde (kidney) ki beemaari', es: 'Enfermedad de los riñones' },
  { id: 'thyroid', short: 'Thyroid', en: 'Thyroid problems', te: 'థైరాయిడ్ సమస్య', te_r: 'Thyroid samasya', hi: 'थायरॉइड की समस्या', hi_r: 'Thyroid ki samasya', es: 'Problemas de tiroides' },
  { id: 'asthma', short: 'Asthma', en: 'Asthma', te: 'ఉబ్బసం (ఆస్తమా)', te_r: 'Ubbasam (asthma)', hi: 'दमा (अस्थमा)', hi_r: 'Dama (asthma)', es: 'Asma' },
  { id: 'epilepsy', short: 'Epilepsy', en: 'Epilepsy or seizures ("fits")', te: 'మూర్ఛ (ఫిట్స్)', te_r: 'Moorchha (fits)', hi: 'मिर्गी (दौरे)', hi_r: 'Mirgi (daure)', es: 'Epilepsia o convulsiones' },
  { id: 'dementia', short: 'Dementia', en: 'Memory loss or dementia', te: 'మతిమరుపు వ్యాధి (డిమెన్షియా)', te_r: 'Matimarupu vyaadhi (dementia)', hi: 'भूलने की बीमारी (डिमेंशिया)', hi_r: 'Bhoolne ki beemaari (dementia)', es: 'Pérdida de memoria o demencia' },
  { id: 'mental', short: 'Mental hlth', en: 'Depression or other mental health condition', te: 'డిప్రెషన్ / మానసిక ఆరోగ్య సమస్య', te_r: 'Depression / maanasika aarogya samasya', hi: 'डिप्रेशन या मानसिक स्वास्थ्य समस्या', hi_r: 'Depression ya maanasik swaasthya samasya', es: 'Depresión u otro problema de salud mental' },
  { id: 'blood', short: 'Blood', en: 'Thalassemia, sickle cell, or anemia', te: 'తలసేమియా / సికిల్ సెల్ / రక్తహీనత', te_r: 'Thalassemia / sickle cell / raktaheenata', hi: 'थैलेसीमिया / सिकल सेल / खून की कमी', hi_r: 'Thalassemia / sickle cell / khoon ki kami', es: 'Talasemia, anemia falciforme o anemia' },
];
const COND = Object.fromEntries(CONDS.map(c => [c.id, c]));

// Cancer types. `lynch` marks the cancers counted by the Amsterdam II criteria for Lynch syndrome.
const CANCER_TYPES = [
  { id: 'breast', short: 'Breast ca', en: 'Breast', te: 'రొమ్ము', te_r: 'Rommu', hi: 'स्तन', hi_r: 'Stan', es: 'Mama' },
  { id: 'breast2', short: 'Breast ca (both)', en: 'Breast, both sides', te: 'రెండు రొమ్ములకు', te_r: 'Rendu rommulaku', hi: 'दोनों स्तनों में', hi_r: 'Donon stanon mein', es: 'Ambas mamas' },
  { id: 'ovarian', short: 'Ovarian ca', en: 'Ovary', te: 'అండాశయం', te_r: 'Andaashayam', hi: 'अंडाशय', hi_r: 'Andaashay', es: 'Ovario' },
  { id: 'colorectal', short: 'Colon ca', en: 'Colon or rectum', te: 'పెద్దప్రేగు', te_r: 'Peddapregu', hi: 'आंत (कोलन)', hi_r: 'Aant (colon)', es: 'Colon o recto', lynch: true },
  { id: 'uterine', short: 'Uterine ca', en: 'Uterus (womb)', te: 'గర్భాశయం', te_r: 'Garbhaashayam', hi: 'गर्भाशय', hi_r: 'Garbhaashay', es: 'Útero', lynch: true },
  { id: 'smallbowel', short: 'Sm. bowel ca', en: 'Small intestine', te: 'చిన్నప్రేగు', te_r: 'Chinnapregu', hi: 'छोटी आंत', hi_r: 'Chhoti aant', es: 'Intestino delgado', lynch: true },
  { id: 'urinary', short: 'Ureter ca', en: 'Ureter or kidney lining', te: 'మూత్ర నాళం', te_r: 'Mootra naalam', hi: 'मूत्र नली', hi_r: 'Mootra nali', es: 'Uréter o pelvis renal', lynch: true },
  { id: 'prostate', short: 'Prostate ca', en: 'Prostate', te: 'ప్రోస్టేట్', te_r: 'Prostate', hi: 'प्रोस्टेट', hi_r: 'Prostate', es: 'Próstata' },
  { id: 'pancreatic', short: 'Pancreas ca', en: 'Pancreas', te: 'క్లోమం (ప్యాంక్రియాస్)', te_r: 'Klomam (pancreas)', hi: 'अग्न्याशय (पैंक्रियास)', hi_r: 'Agnyaashay (pancreas)', es: 'Páncreas' },
  { id: 'stomach', short: 'Stomach ca', en: 'Stomach', te: 'జీర్ణాశయం', te_r: 'Jeernaashayam', hi: 'पेट', hi_r: 'Pet', es: 'Estómago' },
  { id: 'lung', short: 'Lung ca', en: 'Lung', te: 'ఊపిరితిత్తులు', te_r: 'Oopiritittulu', hi: 'फेफड़े', hi_r: 'Phephde', es: 'Pulmón' },
  { id: 'bloodca', short: 'Blood ca', en: 'Blood (leukemia, lymphoma)', te: 'రక్త క్యాన్సర్', te_r: 'Rakta cancer', hi: 'ब्लड कैंसर', hi_r: 'Blood cancer', es: 'Leucemia o linfoma' },
  { id: 'skin', short: 'Skin ca', en: 'Skin (melanoma)', te: 'చర్మం', te_r: 'Charmam', hi: 'त्वचा', hi_r: 'Tvachaa', es: 'Piel (melanoma)' },
  { id: 'other', short: 'Cancer', en: 'Another kind', te: 'ఇంకో రకం', te_r: 'Inko rakam', hi: 'कोई और', hi_r: 'Koi aur', es: 'Otro tipo' },
];
const CTYPE = Object.fromEntries(CANCER_TYPES.map(c => [c.id, c]));
const isBreast = t => t === 'breast' || t === 'breast2';
function factName(cond, type) {
  if (cond !== 'cancer') return COND[cond].en;
  if (!type) return 'Cancer, kind unknown';
  if (type === 'other') return 'Cancer, another kind';
  return `${CTYPE[type].en.replace(' (womb)', '')} cancer`;
}
function factShort(cond, type) { return cond === 'cancer' ? (CTYPE[type]?.short || 'Cancer') : COND[cond].short; }

/* ---------- Interview script ---------- */
const Q = {
  intro: {
    en: "I'm making a family health history to show my doctor. Can I ask you some questions about your health and our family? You can skip any question.",
    te: 'నేను మన కుటుంబ ఆరోగ్య చరిత్రను తయారు చేసి నా డాక్టర్‌కి చూపించాలనుకుంటున్నాను. మీ ఆరోగ్యం గురించి, మన కుటుంబం గురించి కొన్ని ప్రశ్నలు అడగవచ్చా? ఏ ప్రశ్నకైనా జవాబు చెప్పడం ఇష్టం లేకపోతే వదిలేయవచ్చు.',
    te_r: 'Nenu mana kutumba aarogya charitranu tayaaru chesi naa doctor-ki choopinchaalanukuntunnaanu. Mee aarogyam gurinchi, mana kutumbam gurinchi konni prashnalu adagavachchaa? Ee prashnakainaa javaabu cheppadam ishtam lekapothe vadileyavachchu.',
    hi: 'मैं अपने डॉक्टर को दिखाने के लिए हमारे परिवार का स्वास्थ्य इतिहास बना रहा/रही हूँ। क्या मैं आपसे आपकी सेहत और परिवार के बारे में कुछ सवाल पूछ सकता/सकती हूँ? आप किसी भी सवाल को छोड़ सकते हैं।',
    hi_r: 'Main apne doctor ko dikhaane ke liye hamaare parivaar ka swaasthya itihaas bana raha/rahi hoon. Kya main aapse aapki sehat aur parivaar ke baare mein kuchh sawaal poochh sakta/sakti hoon? Aap kisi bhi sawaal ko chhod sakte hain.',
    es: 'Estoy haciendo la historia de salud de nuestra familia para mostrársela a mi médico. ¿Le puedo hacer unas preguntas sobre su salud y nuestra familia? Puede saltarse cualquier pregunta.',
  },
  born: {
    en: 'What year were you born?',
    te: 'మీరు ఏ సంవత్సరంలో పుట్టారు?', te_r: 'Meeru ee samvatsaramlo puttaaru?',
    hi: 'आपका जन्म किस साल में हुआ था?', hi_r: 'Aapka janm kis saal mein hua tha?',
    es: '¿En qué año nació?',
  },
  conds_self: {
    en: "Has a doctor ever told you that you have any of these illnesses? I'll read them one at a time. How old were you when you found out?",
    te: 'ఈ జబ్బులలో ఏదైనా మీకు ఉందని డాక్టర్ ఎప్పుడైనా చెప్పారా? నేను ఒక్కొక్కటిగా చదువుతాను. అది మీకు ఏ వయసులో తెలిసింది?',
    te_r: 'Ee jabbulalo edainaa meeku undani doctor eppudainaa cheppaaraa? Nenu okkokkatigaa chaduvutaanu. Adi meeku ee vayasulo telisindi?',
    hi: 'क्या किसी डॉक्टर ने कभी आपको बताया है कि आपको इनमें से कोई बीमारी है? मैं एक-एक करके पढ़ूँगा/पढ़ूँगी। जब पता चला, तब आपकी उम्र कितनी थी?',
    hi_r: 'Kya kisi doctor ne kabhi aapko bataaya hai ki aapko inmein se koi beemaari hai? Main ek-ek karke padhoonga/padhoongi. Jab pata chala, tab aapki umar kitni thi?',
    es: '¿Algún médico le ha dicho alguna vez que tiene alguna de estas enfermedades? Se las voy a leer una por una. ¿Qué edad tenía cuando se enteró?',
  },
  other_self: {
    en: 'Do you have any other health problems, surgeries, or medicines you take every day?',
    te: 'ఇంకా ఏమైనా ఆరోగ్య సమస్యలు, ఆపరేషన్లు, లేదా రోజూ వేసుకునే మందులు ఉన్నాయా?', te_r: 'Inkaa emainaa aarogya samasyalu, operationlu, leda roju vesukune mandulu unnaayaa?',
    hi: 'क्या कोई और स्वास्थ्य समस्या, ऑपरेशन, या रोज़ ली जाने वाली दवाइयाँ हैं?', hi_r: 'Kya koi aur swaasthya samasya, operation, ya roz li jaane waali davaaiyaan hain?',
    es: '¿Tiene otros problemas de salud, operaciones o medicinas que toma todos los días?',
  },
  mother_alive: {
    en: 'Is your mother still living? If not, how old was she when she passed away, and what was the cause?',
    te: 'మీ అమ్మగారు ఇంకా ఉన్నారా? లేకపోతే, ఏ వయసులో కాలం చేశారు, కారణం ఏమిటి?', te_r: 'Mee ammagaaru inkaa unnaaraa? Lekapothe, ee vayasulo kaalam chesaaru, kaaranam emiti?',
    hi: 'क्या आपकी माँ जीवित हैं? अगर नहीं, तो किस उम्र में और किस कारण से उनका देहांत हुआ?', hi_r: 'Kya aapki maa jeevit hain? Agar nahin, to kis umar mein aur kis kaaran se unka dehaant hua?',
    es: '¿Su mamá vive? Si no, ¿a qué edad falleció y de qué?',
  },
  mother_cond: {
    en: 'Did your mother have any of these illnesses? Do you remember how old she was?',
    te: 'మీ అమ్మగారికి ఈ జబ్బులలో ఏదైనా ఉండేదా? అప్పుడు ఆమె వయసు ఎంతో గుర్తుందా?', te_r: 'Mee ammagaariki ee jabbulalo edainaa undedaa? Appudu aame vayasu entho gurtundaa?',
    hi: 'क्या आपकी माँ को इनमें से कोई बीमारी थी? क्या याद है कि तब उनकी उम्र कितनी थी?', hi_r: 'Kya aapki maa ko inmein se koi beemaari thi? Kya yaad hai ki tab unki umar kitni thi?',
    es: '¿Su mamá tuvo alguna de estas enfermedades? ¿Recuerda qué edad tenía?',
  },
  father_alive: {
    en: 'Is your father still living? If not, how old was he when he passed away, and what was the cause?',
    te: 'మీ నాన్నగారు ఇంకా ఉన్నారా? లేకపోతే, ఏ వయసులో కాలం చేశారు, కారణం ఏమిటి?', te_r: 'Mee naannagaaru inkaa unnaaraa? Lekapothe, ee vayasulo kaalam chesaaru, kaaranam emiti?',
    hi: 'क्या आपके पिताजी जीवित हैं? अगर नहीं, तो किस उम्र में और किस कारण से उनका देहांत हुआ?', hi_r: 'Kya aapke pitaaji jeevit hain? Agar nahin, to kis umar mein aur kis kaaran se unka dehaant hua?',
    es: '¿Su papá vive? Si no, ¿a qué edad falleció y de qué?',
  },
  father_cond: {
    en: 'Did your father have any of these illnesses? Do you remember how old he was?',
    te: 'మీ నాన్నగారికి ఈ జబ్బులలో ఏదైనా ఉండేదా? అప్పుడు ఆయన వయసు ఎంతో గుర్తుందా?', te_r: 'Mee naannagaariki ee jabbulalo edainaa undedaa? Appudu aayana vayasu entho gurtundaa?',
    hi: 'क्या आपके पिताजी को इनमें से कोई बीमारी थी? क्या याद है कि तब उनकी उम्र कितनी थी?', hi_r: 'Kya aapke pitaaji ko inmein se koi beemaari thi? Kya yaad hai ki tab unki umar kitni thi?',
    es: '¿Su papá tuvo alguna de estas enfermedades? ¿Recuerda qué edad tenía?',
  },
  siblings: {
    en: 'Did any of your brothers or sisters have serious health problems, or pass away young?',
    te: 'మీ అన్నదమ్ములు, అక్కచెల్లెళ్ళలో ఎవరికైనా పెద్ద ఆరోగ్య సమస్యలు ఉన్నాయా, లేదా ఎవరైనా చిన్న వయసులోనే చనిపోయారా?', te_r: 'Mee annadammulu, akkachellellalo evarikainaa pedda aarogya samasyalu unnaayaa, leda evarainaa chinna vayasulone chanipoyaaraa?',
    hi: 'क्या आपके किसी भाई या बहन को कोई गंभीर स्वास्थ्य समस्या थी, या किसी का कम उम्र में देहांत हुआ?', hi_r: 'Kya aapke kisi bhai ya behen ko koi gambheer swaasthya samasya thi, ya kisi ka kam umar mein dehaant hua?',
    es: '¿Alguno de sus hermanos o hermanas tuvo problemas de salud graves, o falleció joven?',
  },
  closing: {
    en: 'Thank you so much. This will help me and my doctor take care of my health.',
    te: 'చాలా ధన్యవాదాలు. దీనివల్ల నా ఆరోగ్యాన్ని జాగ్రత్తగా చూసుకోవడానికి నాకు, నా డాక్టర్‌కి సహాయం అవుతుంది.', te_r: 'Chaalaa dhanyavaadaalu. Deenivalla naa aarogyaanni jaagrattagaa choosukovadaaniki naaku, naa doctor-ki sahaayam avutundi.',
    hi: 'बहुत-बहुत धन्यवाद। इससे मुझे और मेरे डॉक्टर को मेरी सेहत का ध्यान रखने में मदद मिलेगी।', hi_r: 'Bahut-bahut dhanyavaad. Isse mujhe aur mere doctor ko meri sehat ka dhyaan rakhne mein madad milegi.',
    es: 'Muchas gracias. Esto nos ayudará a mí y a mi médico a cuidar mi salud.',
  },
};

// Follow-up questions the app adds when an answer is incomplete.
const FOLLOW = {
  cancer_type: {
    en: 'What kind of cancer was it? Where in the body did it start?',
    te: 'అది ఏ రకం క్యాన్సర్? శరీరంలో ఎక్కడ మొదలైంది?', te_r: 'Adi ee rakam cancer? Shareeramlo ekkada modalaindi?',
    hi: 'वह किस तरह का कैंसर था? शरीर में कहाँ से शुरू हुआ था?', hi_r: 'Woh kis tarah ka cancer tha? Shareer mein kahaan se shuru hua tha?',
    es: '¿Qué tipo de cáncer era? ¿En qué parte del cuerpo empezó?',
  },
  age_you: {
    en: 'About how old were you when this was found?',
    te: 'ఇది తెలిసినప్పుడు మీ వయసు సుమారు ఎంత?', te_r: 'Idi telisinappudu mee vayasu sumaaru entha?',
    hi: 'जब यह पता चला तब आपकी उम्र लगभग कितनी थी?', hi_r: 'Jab yeh pata chala tab aapki umar lagbhag kitni thi?',
    es: '¿Más o menos qué edad tenía usted cuando se lo encontraron?',
  },
  age_them: {
    en: 'Do you remember about how old they were when this was found?',
    te: 'ఇది తెలిసినప్పుడు వారి వయసు సుమారు ఎంత ఉండేదో గుర్తుందా?', te_r: 'Idi telisinappudu vaari vayasu sumaaru entha undedo gurtundaa?',
    hi: 'क्या याद है, जब यह पता चला तब उनकी उम्र लगभग कितनी थी?', hi_r: 'Kya yaad hai, jab yeh pata chala tab unki umar lagbhag kitni thi?',
    es: '¿Recuerda más o menos qué edad tenía cuando se lo encontraron?',
  },
  death_cause: {
    en: 'Do you know how they passed away? Was it sudden, or after an illness?',
    te: 'వారు ఎలా కాలం చేశారో తెలుసా? అకస్మాత్తుగానా, లేక ఏదైనా జబ్బు వల్లనా?', te_r: 'Vaaru elaa kaalam chesaaro telusaa? Akasmaattugaanaa, leka edainaa jabbu vallanaa?',
    hi: 'क्या आपको पता है उनका देहांत कैसे हुआ? अचानक, या किसी बीमारी के बाद?', hi_r: 'Kya aapko pata hai unka dehaant kaise hua? Achaanak, ya kisi beemaari ke baad?',
    es: '¿Sabe cómo falleció? ¿Fue de repente o después de una enfermedad?',
  },
  death_age: {
    en: 'About how old were they when they passed away?',
    te: 'వారు కాలం చేసినప్పుడు సుమారు ఏ వయసు?', te_r: 'Vaaru kaalam chesinappudu sumaaru ee vayasu?',
    hi: 'देहांत के समय उनकी उम्र लगभग कितनी थी?', hi_r: 'Dehaant ke samay unki umar lagbhag kitni thi?',
    es: '¿Más o menos qué edad tenía cuando falleció?',
  },
};

const STEPS = [
  { k: 'intro', type: 'intro', tip: 'Sit together and ask permission first. Some memories are painful, so it is fine to stop and come back another day.' },
  { k: 'born', type: 'born', who: 'self' },
  { k: 'conds_self', type: 'conds', who: 'self', tip: 'Read each illness out loud and tap the ones they say yes to. Many elders call diabetes "sugar" and high blood pressure "BP".' },
  { k: 'other_self', type: 'notes', who: 'self' },
  { k: 'mother_alive', type: 'vital', who: 'mother' },
  { k: 'mother_cond', type: 'conds', who: 'mother', tip: 'A rough age is fine. "In her forties" is more useful than nothing, so write 45.' },
  { k: 'father_alive', type: 'vital', who: 'father' },
  { k: 'father_cond', type: 'conds', who: 'father' },
  { k: 'siblings', type: 'siblings', who: 'self' },
  { k: 'closing', type: 'closing' },
];

/* ---------- Everyday words → medical terms ----------
   Each entry: the words people actually say, in English, Telugu, Hindi and Spanish
   (native script and romanized), mapped to one condition or cancer type. */
const LEXICON = [
  { cond: 'heart', words: ['heart attack', 'heart disease', 'heart problem', 'heart trouble', 'cardiac', 'bypass', 'stent', 'angioplasty', 'గుండెపోటు', 'గుండె జబ్బు', 'గుండె', 'gundepotu', 'gunde', 'दिल का दौरा', 'दिल की बीमारी', 'हार्ट अटैक', 'दिल', 'dil ka daura', 'heart', 'infarto', 'ataque al corazón', 'corazón'] },
  { cond: 'stroke', words: ['stroke', 'paralysis', 'పక్షవాతం', 'స్ట్రోక్', 'pakshavaatam', 'pakshavatam', 'लकवा', 'लकवे', 'स्ट्रोक', 'lakwa', 'lakva', 'derrame', 'embolia', 'ictus'] },
  { cond: 'bp', words: ['high blood pressure', 'blood pressure', 'hypertension', 'bp', 'బీపీ', 'రక్తపోటు', 'raktapotu', 'बीपी', 'ब्लड प्रेशर', 'रक्तचाप', 'presión alta', 'presion alta', 'hipertensión', 'hipertension'] },
  { cond: 'chol', words: ['cholesterol', 'కొలెస్ట్రాల్', 'कोलेस्ट्रॉल', 'कोलेस्ट्रोल', 'colesterol'] },
  { cond: 'diabetes', words: ['diabetes', 'diabetic', 'sugar', 'insulin', 'షుగర్', 'మధుమేహం', 'చక్కెర వ్యాధి', 'madhumeham', 'शुगर', 'मधुमेह', 'madhumeh', 'azúcar', 'azucar', 'diabético', 'diabética'] },
  { cond: 'cancer', words: ['cancer', 'tumor', 'tumour', 'క్యాన్సర్', 'కేన్సర్', 'కాన్సర్', 'कैंसर', 'कर्करोग', 'cáncer', 'tumor'] },
  { cond: 'kidney', words: ['kidney', 'dialysis', 'కిడ్నీ', 'మూత్రపిండ', 'mootrapinda', 'किडनी', 'गुर्दे', 'gurde', 'riñón', 'riñones', 'diálisis'] },
  { cond: 'thyroid', words: ['thyroid', 'థైరాయిడ్', 'थायरॉइड', 'थायराइड', 'tiroides'] },
  { cond: 'asthma', words: ['asthma', 'wheezing', 'ఉబ్బసం', 'ఆస్తమా', 'ubbasam', 'दमा', 'अस्थमा', 'asma'] },
  { cond: 'epilepsy', words: ['epilepsy', 'seizure', 'seizures', 'fits', 'ఫిట్స్', 'మూర్ఛ', 'moorchha', 'moorcha', 'मिर्गी', 'दौरे', 'mirgi', 'epilepsia', 'convulsiones'] },
  { cond: 'dementia', words: ['dementia', 'alzheimer', "alzheimer's", 'memory loss', 'మతిమరుపు', 'matimarupu', 'डिमेंशिया', 'भूलने की बीमारी', 'demencia', 'alzhéimer'] },
  { cond: 'mental', words: ['depression', 'anxiety', 'bipolar', 'schizophrenia', 'mental illness', 'డిప్రెషన్', 'మానసిక', 'maanasika', 'डिप्रेशन', 'मानसिक', 'depresión', 'ansiedad'] },
  { cond: 'blood', words: ['thalassemia', 'thalassaemia', 'sickle cell', 'anemia', 'anaemia', 'తలసేమియా', 'రక్తహీనత', 'raktaheenata', 'थैलेसीमिया', 'खून की कमी', 'talasemia'] },
];
// Cancer kinds, only matched in a sentence that also mentions cancer.
const CANCER_LEXICON = [
  { type: 'breast', words: ['breast', 'రొమ్ము', 'rommu', 'స్తన', 'स्तन', 'ब्रेस्ट', 'de mama', 'seno'] },
  { type: 'ovarian', words: ['ovary', 'ovarian', 'అండాశయ', 'andaashaya', 'अंडाशय', 'ovario'] },
  { type: 'colorectal', words: ['colon', 'bowel', 'rectal', 'rectum', 'colorectal', 'పెద్దప్రేగు', 'peddapregu', 'आंत', 'कोलन', 'colorrectal', 'recto'] },
  { type: 'uterine', words: ['uterus', 'uterine', 'womb', 'endometrial', 'గర్భాశయ', 'garbhaashaya', 'गर्भाशय', 'útero', 'endometrio'] },
  { type: 'prostate', words: ['prostate', 'ప్రోస్టేట్', 'प्रोस्टेट', 'próstata'] },
  { type: 'pancreatic', words: ['pancreas', 'pancreatic', 'ప్యాంక్రియాస్', 'క్లోమ', 'पैंक्रियास', 'अग्न्याशय', 'páncreas'] },
  { type: 'stomach', words: ['stomach', 'జీర్ణాశయ', 'కడుపు', 'kadupu', 'पेट', 'estómago'] },
  { type: 'lung', words: ['lung', 'ఊపిరితిత్తు', 'oopiritittu', 'फेफड़', 'pulmón'] },
  { type: 'bloodca', words: ['leukemia', 'leukaemia', 'lymphoma', 'blood cancer', 'రక్త క్యాన్సర్', 'ब्लड कैंसर', 'leucemia', 'linfoma'] },
  { type: 'skin', words: ['melanoma', 'skin', 'చర్మ', 'त्वचा', 'piel'] },
];
const DEATH_WORDS = ['died', 'passed away', 'passed on', 'death', 'చనిపోయ', 'కాలం చేశ', 'కాలం చేస', 'పోయారు', 'chanipoy', 'kaalam chesa', 'गुजर', 'देहांत', 'मृत्यु', 'मौत', 'guzar', 'dehaant', 'murió', 'falleció', 'muerte'];
const NEG_WORDS = ['no', 'not', 'never', "didn't", "doesn't", 'లేదు', 'లేవు', 'ledu', 'levu', 'नहीं', 'नही', 'nahin', 'nahi', 'nunca'];
// Words that tell us a sentence is about the speaker's mother or father.
const KIN_WORDS = {
  mother: { stems: ['mother', 'mom', 'mum', 'amma', 'అమ్మ', 'माँ', 'मां', 'माता', 'mamá', 'madre'], not: ['ammamma', 'అమ్మమ్మ', 'అమ్మాయి'] },
  father: { stems: ['father', 'dad', 'nanna', 'naanna', 'నాన్న', 'पिता', 'पापा', 'papá', 'padre'], not: ['nanamma', 'నానమ్మ'] },
};
// Spoken numbers (tens) for ages; "forties" style ranges map to the middle.
const NUM_WORDS = {
  thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  thirties: 35, forties: 45, fifties: 55, sixties: 65, seventies: 75, eighties: 85,
  'ముప్పై': 30, 'నలభై': 40, 'యాభై': 50, 'అరవై': 60, 'డెబ్బై': 70, 'ఎనభై': 80, 'తొంభై': 90,
  muppai: 30, nalabhai: 40, yaabhai: 50, yabhai: 50, aravai: 60, debbai: 70, enabhai: 80,
  'तीस': 30, 'चालीस': 40, 'पचास': 50, 'साठ': 60, 'सत्तर': 70, 'अस्सी': 80, 'नब्बे': 90,
  tees: 30, chaalis: 40, chalis: 40, pachaas: 50, pachas: 50, saath: 60, sattar: 70, assi: 80,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
};

/* ---------- Guideline sources cited in the doctor report ---------- */
const SOURCES = {
  usmstf: { short: 'US Multi-Society Task Force on Colorectal Cancer, 2017', full: 'Rex DK, et al. Colorectal cancer screening: recommendations for physicians and patients from the U.S. Multi-Society Task Force on Colorectal Cancer. Gastroenterology. 2017;153:307-323.', url: 'https://doi.org/10.1053/j.gastro.2017.05.013' },
  uspstfCrc: { short: 'USPSTF colorectal cancer screening, 2021', full: 'US Preventive Services Task Force. Screening for colorectal cancer: recommendation statement. JAMA. 2021;325(19):1965-1977.', url: 'https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/colorectal-cancer-screening' },
  uspstfBrca: { short: 'USPSTF BRCA-related cancer risk assessment, 2019', full: 'US Preventive Services Task Force. Risk assessment, genetic counseling, and genetic testing for BRCA-related cancer. JAMA. 2019;322(7):652-665.', url: 'https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/brca-related-cancer-risk-assessment-genetic-counseling-and-genetic-testing' },
  fhs7: { short: 'Family History Screen 7 (FHS-7)', full: 'Ashton-Prolla P, et al. Development and validation of a simple questionnaire for the identification of hereditary breast cancer in primary care. BMC Cancer. 2009;9:283.', url: 'https://doi.org/10.1186/1471-2407-9-283' },
  amsterdam: { short: 'Amsterdam II criteria for Lynch syndrome', full: 'Vasen HF, Watson P, Mecklin JP, Lynch HT. New clinical criteria for hereditary nonpolyposis colorectal cancer (HNPCC, Lynch syndrome) proposed by the International Collaborative Group on HNPCC. Gastroenterology. 1999;116(6):1453-1456.', url: 'https://doi.org/10.1016/S0016-5085(99)70510-X' },
  nccn: { short: 'NCCN Guidelines: Genetic/Familial High-Risk Assessment', full: 'National Comprehensive Cancer Network. Clinical Practice Guidelines in Oncology: Genetic/Familial High-Risk Assessment (Breast, Ovarian, Pancreatic, and Prostate; and Colorectal). Current version.', url: 'https://www.nccn.org/guidelines/category_2' },
  nhlbi: { short: 'NHLBI pediatric cardiovascular guidelines, 2011', full: 'Expert Panel on Integrated Guidelines for Cardiovascular Health and Risk Reduction in Children and Adolescents. Pediatrics. 2011;128 Suppl 5:S213-S256.', url: 'https://www.nhlbi.nih.gov/health-topics/integrated-guidelines-for-cardiovascular-health-and-risk-reduction-in-children-and-adolescents' },
  accaha: { short: 'AHA/ACC cholesterol guideline, 2018', full: 'Grundy SM, et al. 2018 AHA/ACC guideline on the management of blood cholesterol. Circulation. 2019;139:e1082-e1143.', url: 'https://doi.org/10.1161/CIR.0000000000000625' },
  ada: { short: 'ADA Standards of Care in Diabetes, 2025', full: 'American Diabetes Association Professional Practice Committee. Standards of Care in Diabetes—2025, Sections 2 and 14. Diabetes Care. 2025;48(Suppl 1).', url: 'https://diabetesjournals.org/care/issue/48/Supplement_1' },
  acsProstate: { short: 'American Cancer Society prostate cancer screening', full: 'American Cancer Society. Recommendations for prostate cancer early detection.', url: 'https://www.cancer.org/cancer/types/prostate-cancer/detection-diagnosis-staging/acs-recommendations.html' },
};

/* ---------- Family-history risk levels (My risks tab) ----------
   Which conditions are scored, the age that counts as "early" for each,
   and a short, general tip. Cancers are scored per kind. */
const RISK_TOPICS = [
  { key: 'heart', cond: 'heart', name: 'Heart disease', early: p => p.sex === 'F' ? 65 : 55, tip: 'Ask for a cholesterol check, stay active most days, and skip smoking and vaping.' },
  { key: 'diabetes', cond: 'diabetes', name: 'Type 2 diabetes', early: () => 50, tip: 'Move every day, choose water over sugary drinks, and ask your doctor whether an A1C blood test makes sense.' },
  { key: 'stroke', cond: 'stroke', name: 'Stroke', early: () => 60, tip: 'Keep blood pressure in check: have it measured at checkups, go easy on salty snacks, and stay active.' },
  { key: 'bp', cond: 'bp', name: 'High blood pressure', early: () => 40, tip: 'Have your blood pressure measured at every checkup. Less salt and more activity both help.' },
  { key: 'chol', cond: 'chol', name: 'High cholesterol', early: () => 45, tip: 'Ask for a cholesterol (lipid) test. Fiber-rich foods and exercise help keep it down.' },
  { key: 'breast', cond: 'cancer', types: ['breast', 'breast2'], name: 'Breast cancer', early: () => 50, tip: "Learn what's normal for your body and report changes. Genetic counseling can clarify an inherited risk." },
  { key: 'colorectal', cond: 'cancer', types: ['colorectal'], name: 'Colon cancer', early: () => 50, tip: 'Know the warning signs, like blood in the stool or a lasting change in bowel habits, and start screening at the age your doctor recommends.' },
  { key: 'ovarian', cond: 'cancer', types: ['ovarian'], sex: 'F', name: 'Ovarian cancer', early: () => 50, tip: 'Tell your doctor about this history. Ovarian cancer in a relative is a common reason to see a genetic counselor.' },
  { key: 'uterine', cond: 'cancer', types: ['uterine'], sex: 'F', name: 'Uterine cancer', early: () => 50, tip: 'Tell your doctor, especially if relatives also had colon cancer. Together they can point to Lynch syndrome.' },
  { key: 'prostate', cond: 'cancer', types: ['prostate'], sex: 'M', name: 'Prostate cancer', early: () => 65, tip: 'As an adult, ask about starting PSA screening conversations earlier than usual.' },
  { key: 'pancreatic', cond: 'cancer', types: ['pancreatic'], name: 'Pancreatic cancer', early: () => 50, tip: 'Ask about genetic counseling. Pancreatic cancer in close relatives can be inherited.' },
  { key: 'stomach', cond: 'cancer', types: ['stomach'], name: 'Stomach cancer', early: () => 50, tip: 'Mention it at checkups, along with any lasting stomach pain or heartburn.' },
  { key: 'lung', cond: 'cancer', types: ['lung'], name: 'Lung cancer', early: () => 50, tip: "Don't smoke or vape, and avoid secondhand smoke." },
  { key: 'bloodca', cond: 'cancer', types: ['bloodca'], name: 'Leukemia or lymphoma', early: () => 50, tip: 'Mention it at checkups so your doctor knows the history.' },
  { key: 'skin', cond: 'cancer', types: ['skin'], name: 'Skin cancer', early: () => 50, tip: 'Use sunscreen and get any changing mole checked.' },
  { key: 'kidney', cond: 'kidney', name: 'Kidney disease', early: () => 50, tip: 'Kidney disease often follows diabetes and high blood pressure, so keeping those in check helps.' },
  { key: 'thyroid', cond: 'thyroid', name: 'Thyroid problems', early: () => 30, tip: 'Tell your doctor if you notice lasting tiredness, weight changes, or feeling unusually hot or cold.' },
  { key: 'asthma', cond: 'asthma', name: 'Asthma', early: () => 0, tip: 'Tell your doctor if you wheeze or get short of breath when you exercise.' },
  { key: 'epilepsy', cond: 'epilepsy', name: 'Epilepsy', early: () => 30, tip: 'Mention it to your doctor, especially if you ever have fainting or staring spells.' },
  { key: 'dementia', cond: 'dementia', name: 'Dementia', early: () => 65, tip: 'Staying active, sleeping well and keeping blood pressure healthy all protect the brain.' },
  { key: 'mental', cond: 'mental', name: 'Depression and mental health', early: () => 30, tip: "Mental health conditions can run in families. If you're struggling, talk to someone you trust or a doctor. You're not alone." },
  { key: 'blood', cond: 'blood', name: 'Thalassemia, sickle cell or anemia', early: () => 30, tip: 'Ask whether a blood test for thalassemia or sickle cell trait makes sense for you.' },
];
SOURCES.scheuner = { short: 'Scheuner et al., family history risk method, 1997', full: 'Scheuner MT, Wang SJ, Raffel LJ, Larabell SK, Rotter JI. Family history: a comprehensive genetic risk assessment method for the chronic conditions of adulthood. Am J Med Genet. 1997;71(3):315-324.', url: 'https://pubmed.ncbi.nlm.nih.gov/9268102/' };
SOURCES.healthware = { short: 'CDC Family Healthware, 2009', full: 'Yoon PW, Scheuner MT, Jorgensen C, Khoury MJ. Developing Family Healthware, a family history screening tool to prevent common chronic diseases. Prev Chronic Dis. 2009;6(1):A33.', url: 'https://www.cdc.gov/pcd/issues/2009/jan/08_0046.htm' };

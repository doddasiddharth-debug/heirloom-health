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
  { id: 'polyps', short: 'Polyps', en: 'Colon polyps (growths found at a colonoscopy)', te: 'పెద్దప్రేగులో పాలిప్స్ (కొలనోస్కోపీలో కనిపించే చిన్న గడ్డలు)', te_r: 'Peddapregulo polyps (colonoscopy-lo kanipinche chinna gaddalu)', hi: 'आंत में पॉलिप (कोलोनोस्कोपी में मिली छोटी गांठें)', hi_r: 'Aant mein polyp (colonoscopy mein mili chhoti gaanthein)', es: 'Pólipos en el colon (bultos que se encuentran en una colonoscopia)' },
  { id: 'kidney', short: 'Kidney', en: 'Kidney disease', te: 'కిడ్నీ జబ్బు', te_r: 'Kidney jabbu', hi: 'गुर्दे (किडनी) की बीमारी', hi_r: 'Gurde (kidney) ki beemaari', es: 'Enfermedad de los riñones' },
  { id: 'thyroid', short: 'Thyroid', en: 'Thyroid problems', te: 'థైరాయిడ్ సమస్య', te_r: 'Thyroid samasya', hi: 'थायरॉइड की समस्या', hi_r: 'Thyroid ki samasya', es: 'Problemas de tiroides' },
  { id: 'asthma', short: 'Asthma', en: 'Asthma', te: 'ఉబ్బసం (ఆస్తమా)', te_r: 'Ubbasam (asthma)', hi: 'दमा (अस्थमा)', hi_r: 'Dama (asthma)', es: 'Asma' },
  { id: 'epilepsy', short: 'Epilepsy', en: 'Epilepsy or seizures ("fits")', te: 'మూర్ఛ (ఫిట్స్)', te_r: 'Moorchha (fits)', hi: 'मिर्गी (दौरे)', hi_r: 'Mirgi (daure)', es: 'Epilepsia o convulsiones' },
  { id: 'dementia', short: 'Dementia', en: 'Memory loss or dementia', te: 'మతిమరుపు వ్యాధి (డిమెన్షియా)', te_r: 'Matimarupu vyaadhi (dementia)', hi: 'भूलने की बीमारी (डिमेंशिया)', hi_r: 'Bhoolne ki beemaari (dementia)', es: 'Pérdida de memoria o demencia' },
  { id: 'mental', short: 'Mental hlth', en: 'Depression or other mental health condition', te: 'డిప్రెషన్ / మానసిక ఆరోగ్య సమస్య', te_r: 'Depression / maanasika aarogya samasya', hi: 'डिप्रेशन या मानसिक स्वास्थ्य समस्या', hi_r: 'Depression ya maanasik swaasthya samasya', es: 'Depresión u otro problema de salud mental' },
  { id: 'blood', short: 'Blood', en: 'Thalassemia, sickle cell, or anemia', te: 'తలసేమియా / సికిల్ సెల్ / రక్తహీనత', te_r: 'Thalassemia / sickle cell / raktaheenata', hi: 'थैलेसीमिया / सिकल सेल / खून की कमी', hi_r: 'Thalassemia / sickle cell / khoon ki kami', es: 'Talasemia, anemia falciforme o anemia' },
  // Less common, but they change what a doctor checks. Shown together under "Less common" (and on one screen in large mode).
  { id: 'liver', more: true, short: 'Liver', en: 'Hepatitis B or C, or another liver disease', te: 'హెపటైటిస్ బి లేదా సి, లేదా ఇంకో లివర్ (కాలేయం) జబ్బు', te_r: 'Hepatitis B leda C, leda inko liver (kaaleyam) jabbu', hi: 'हेपेटाइटिस बी या सी, या लिवर (जिगर) की कोई और बीमारी', hi_r: 'Hepatitis B ya C, ya liver (jigar) ki koi aur beemaari', es: 'Hepatitis B o C, u otra enfermedad del hígado' },
  { id: 'clots', more: true, short: 'Clots', en: 'Blood clots in the legs or lungs', te: 'కాళ్ళలో లేదా ఊపిరితిత్తులలో రక్తం గడ్డకట్టడం', te_r: 'Kaallalo leda oopiritittulalo raktam gaddakattadam', hi: 'पैरों या फेफड़ों में खून का थक्का', hi_r: 'Pairon ya phephdon mein khoon ka thakka', es: 'Coágulos de sangre en las piernas o los pulmones' },
  { id: 'ibd', more: true, short: 'IBD', en: "Crohn's disease or ulcerative colitis", te: 'క్రోన్స్ వ్యాధి లేదా అల్సరేటివ్ కొలైటిస్ (పేగుల్లో పుండ్లు)', te_r: "Crohn's vyaadhi leda ulcerative colitis (pegullo pundlu)", hi: 'क्रोन रोग या अल्सरेटिव कोलाइटिस (आंतों में सूजन और छाले)', hi_r: 'Crohn rog ya ulcerative colitis (aanton mein soojan aur chhaale)', es: 'Enfermedad de Crohn o colitis ulcerosa' },
  { id: 'celiac', more: true, short: 'Celiac', en: 'Celiac disease (cannot eat wheat or gluten)', te: 'సీలియాక్ వ్యాధి (గోధుమలు / గ్లూటెన్ తినలేరు)', te_r: 'Celiac vyaadhi (godhumalu / gluten tinaleru)', hi: 'सीलिएक रोग (गेहूँ या ग्लूटेन नहीं खा सकते)', hi_r: 'Celiac rog (gehoon ya gluten nahin kha sakte)', es: 'Enfermedad celíaca (no puede comer trigo ni gluten)' },
  { id: 'glaucoma', more: true, short: 'Glaucoma', en: 'Glaucoma (high eye pressure)', te: 'గ్లకోమా (కంటిలో ఒత్తిడి ఎక్కువ)', te_r: 'Glaucoma (kantilo ottidi ekkuva)', hi: 'काला मोतिया / ग्लूकोमा (आँख का दबाव ज़्यादा)', hi_r: 'Kaala motiya / glaucoma (aankh ka dabaav zyaada)', es: 'Glaucoma (presión alta en el ojo)' },
  { id: 'osteo', more: true, short: 'Bones', en: 'Weak bones (osteoporosis) or a broken hip', te: 'ఎముకలు బలహీనం (ఆస్టియోపొరోసిస్) లేదా తుంటి ఎముక విరగడం', te_r: 'Emukalu balaheenam (osteoporosis) leda tunti emuka viragadam', hi: 'कमज़ोर हड्डियाँ (ऑस्टियोपोरोसिस) या कूल्हे की हड्डी टूटना', hi_r: 'Kamzor haddiyaan (osteoporosis) ya koolhe ki haddi tootna', es: 'Huesos débiles (osteoporosis) o fractura de cadera' },
  { id: 'autoimmune', more: true, short: 'Autoimmune', en: 'Lupus, rheumatoid arthritis, or another autoimmune disease', te: 'లూపస్, రుమటాయిడ్ ఆర్థరైటిస్ (కీళ్ళ వాతం), లేదా ఇంకో ఆటోఇమ్యూన్ వ్యాధి', te_r: 'Lupus, rheumatoid arthritis (keella vaatam), leda inko autoimmune vyaadhi', hi: 'ल्यूपस, रूमेटॉइड आर्थराइटिस (गठिया), या कोई और ऑटोइम्यून बीमारी', hi_r: 'Lupus, rheumatoid arthritis (gathiya), ya koi aur autoimmune beemaari', es: 'Lupus, artritis reumatoide u otra enfermedad autoinmune' },
  { id: 'substance', more: true, short: 'Addiction', en: 'Alcohol or drug addiction', te: 'మద్యం (తాగుడు) లేదా మత్తుమందుల వ్యసనం', te_r: 'Madyam (taagudu) leda mattumandula vyasanam', hi: 'शराब या नशे की लत', hi_r: 'Sharaab ya nashe ki lat', es: 'Adicción al alcohol o a las drogas' },
  { id: 'hearing', more: true, short: 'Hearing', en: 'Hearing loss that started young', te: 'చిన్న వయసులోనే వినికిడి తగ్గడం (చెవుడు)', te_r: 'Chinna vayasulone vinikidi taggadam (chevudu)', hi: 'कम उम्र से ही कम सुनाई देना (बहरापन)', hi_r: 'Kam umar se hi kam sunaai dena (behraapan)', es: 'Pérdida de audición que empezó de joven' },
];
const COND = Object.fromEntries(CONDS.map(c => [c.id, c]));

// Cancer types. `lynch` marks the cancers counted by the Amsterdam II criteria for Lynch syndrome.
const CANCER_TYPES = [
  { id: 'breast', short: 'Breast ca', en: 'Breast (in a woman or a man)', name: 'Breast cancer', te: 'రొమ్ము (ఆడవారికైనా, మగవారికైనా)', te_r: 'Rommu (aadavaarikainaa, magavaarikainaa)', hi: 'स्तन (महिला या पुरुष में)', hi_r: 'Stan (mahila ya purush mein)', es: 'Mama (en una mujer o en un hombre)' },
  { id: 'breast2', short: 'Breast ca (both)', en: 'Breast, both sides', te: 'రెండు రొమ్ములకు', te_r: 'Rendu rommulaku', hi: 'दोनों स्तनों में', hi_r: 'Donon stanon mein', es: 'Ambas mamas' },
  { id: 'ovarian', short: 'Ovarian ca', en: 'Ovary', te: 'అండాశయం', te_r: 'Andaashayam', hi: 'अंडाशय', hi_r: 'Andaashay', es: 'Ovario' },
  { id: 'colorectal', short: 'Colon ca', en: 'Colon or rectum', te: 'పెద్దప్రేగు', te_r: 'Peddapregu', hi: 'आंत (कोलन)', hi_r: 'Aant (colon)', es: 'Colon o recto', lynch: true },
  { id: 'uterine', short: 'Uterine ca', en: 'Uterus (womb)', name: 'Uterine cancer', te: 'గర్భాశయం', te_r: 'Garbhaashayam', hi: 'गर्भाशय', hi_r: 'Garbhaashay', es: 'Útero', lynch: true },
  { id: 'smallbowel', short: 'Sm. bowel ca', en: 'Small intestine', te: 'చిన్నప్రేగు', te_r: 'Chinnapregu', hi: 'छोटी आंत', hi_r: 'Chhoti aant', es: 'Intestino delgado', lynch: true },
  { id: 'urinary', short: 'Ureter ca', en: 'Ureter or kidney lining', te: 'మూత్ర నాళం', te_r: 'Mootra naalam', hi: 'मूत्र नली', hi_r: 'Mootra nali', es: 'Uréter o pelvis renal', lynch: true },
  { id: 'prostate', short: 'Prostate ca', en: 'Prostate', te: 'ప్రోస్టేట్', te_r: 'Prostate', hi: 'प्रोस्टेट', hi_r: 'Prostate', es: 'Próstata' },
  { id: 'pancreatic', short: 'Pancreas ca', en: 'Pancreas', te: 'క్లోమం (ప్యాంక్రియాస్)', te_r: 'Klomam (pancreas)', hi: 'अग्न्याशय (पैंक्रियास)', hi_r: 'Agnyaashay (pancreas)', es: 'Páncreas' },
  { id: 'stomach', short: 'Stomach ca', en: 'Stomach', te: 'జీర్ణాశయం', te_r: 'Jeernaashayam', hi: 'पेट', hi_r: 'Pet', es: 'Estómago' },
  { id: 'lung', short: 'Lung ca', en: 'Lung', te: 'ఊపిరితిత్తులు', te_r: 'Oopiritittulu', hi: 'फेफड़े', hi_r: 'Phephde', es: 'Pulmón' },
  { id: 'bloodca', short: 'Blood ca', en: 'Blood (leukemia, lymphoma)', name: 'Blood cancer (leukemia or lymphoma)', te: 'రక్త క్యాన్సర్', te_r: 'Rakta cancer', hi: 'ब्लड कैंसर', hi_r: 'Blood cancer', es: 'Leucemia o linfoma' },
  { id: 'skin', short: 'Skin ca', en: 'Skin (melanoma)', name: 'Skin cancer (melanoma)', te: 'చర్మం', te_r: 'Charmam', hi: 'त्वचा', hi_r: 'Tvachaa', es: 'Piel (melanoma)' },
  { id: 'thyroidca', short: 'Thyroid ca', en: 'Thyroid', name: 'Thyroid cancer', te: 'థైరాయిడ్', te_r: 'Thyroid', hi: 'थायरॉइड', hi_r: 'Thyroid', es: 'Tiroides' },
  { id: 'kidneyca', short: 'Kidney ca', en: 'Kidney', name: 'Kidney cancer', te: 'కిడ్నీ (మూత్రపిండం)', te_r: 'Kidney (mootrapindam)', hi: 'गुर्दा (किडनी)', hi_r: 'Gurda (kidney)', es: 'Riñón' },
  { id: 'liverca', short: 'Liver ca', en: 'Liver', name: 'Liver cancer', te: 'కాలేయం (లివర్)', te_r: 'Kaaleyam (liver)', hi: 'लिवर (जिगर)', hi_r: 'Liver (jigar)', es: 'Hígado' },
  { id: 'cervical', short: 'Cervix ca', en: 'Cervix', name: 'Cervical cancer', te: 'గర్భాశయ ముఖద్వారం (సర్విక్స్)', te_r: 'Garbhaashaya mukhadvaaram (cervix)', hi: 'बच्चेदानी का मुँह (सर्विक्स)', hi_r: 'Bachchedaani ka munh (cervix)', es: 'Cuello del útero' },
  { id: 'headneck', short: 'Mouth ca', en: 'Mouth, tongue or throat', name: 'Mouth or throat cancer', te: 'నోరు, నాలుక లేదా గొంతు', te_r: 'Noru, naaluka leda gontu', hi: 'मुँह, जीभ या गला', hi_r: 'Munh, jeebh ya gala', es: 'Boca, lengua o garganta' },
  { id: 'esophagus', short: 'Esoph. ca', en: 'Food pipe (esophagus)', name: 'Esophagus cancer', te: 'అన్నవాహిక (ఆహార నాళం)', te_r: 'Annavaahika (aahaara naalam)', hi: 'खाने की नली (ग्रासनली)', hi_r: 'Khaane ki nali (graasnali)', es: 'Esófago' },
  { id: 'bladder', short: 'Bladder ca', en: 'Bladder', name: 'Bladder cancer', te: 'మూత్రాశయం', te_r: 'Mootraashayam', hi: 'मूत्राशय (पेशाब की थैली)', hi_r: 'Mootraashay (peshaab ki thaili)', es: 'Vejiga' },
  { id: 'brain', short: 'Brain ca', en: 'Brain', name: 'Brain cancer or tumor', te: 'మెదడు', te_r: 'Medadu', hi: 'दिमाग़ (मस्तिष्क)', hi_r: 'Dimaag (mastishk)', es: 'Cerebro' },
  { id: 'testicular', short: 'Testis ca', en: 'Testicle', name: 'Testicular cancer', te: 'వృషణం', te_r: 'Vrushanam', hi: 'अंडकोष', hi_r: 'Andkosh', es: 'Testículo' },
  { id: 'sarcoma', short: 'Sarcoma', en: 'Bone or muscle (sarcoma)', name: 'Sarcoma (bone or soft-tissue cancer)', te: 'ఎముక లేదా కండరం (సార్కోమా)', te_r: 'Emuka leda kandaram (sarcoma)', hi: 'हड्डी या मांसपेशी (सारकोमा)', hi_r: 'Haddi ya maanspeshi (sarcoma)', es: 'Hueso o músculo (sarcoma)' },
  { id: 'other', short: 'Cancer', en: 'Another kind', te: 'ఇంకో రకం', te_r: 'Inko rakam', hi: 'कोई और', hi_r: 'Koi aur', es: 'Otro tipo' },
];
const CTYPE = Object.fromEntries(CANCER_TYPES.map(c => [c.id, c]));
const isBreast = t => t === 'breast' || t === 'breast2';
// Kinds for other conditions. Picking a kind is optional; it sharpens the rules (type 1 and type 2 diabetes
// mean different things, and so do a heart attack and a heart rhythm problem).
const SUBTYPES = {
  cancer: CANCER_TYPES,
  diabetes: [
    { id: 't2', short: 'T2 diab', en: 'Type 2 (usually starts as an adult)', name: 'Type 2 diabetes', te: 'టైప్ 2 (సాధారణంగా పెద్దయ్యాక వచ్చే షుగర్)', te_r: 'Type 2 (saadhaaranangaa peddayyaaka vachche sugar)', hi: 'टाइप 2 (अक्सर बड़ी उम्र में होने वाली शुगर)', hi_r: 'Type 2 (aksar badi umar mein hone waali sugar)', es: 'Tipo 2 (casi siempre empieza de adulto)' },
    { id: 't1', short: 'T1 diab', en: 'Type 1 (needs insulin from a young age)', name: 'Type 1 diabetes', te: 'టైప్ 1 (చిన్నప్పటి నుంచే ఇన్సులిన్ కావాలి)', te_r: 'Type 1 (chinnappati nunche insulin kaavaali)', hi: 'टाइप 1 (कम उम्र से ही इंसुलिन चाहिए)', hi_r: 'Type 1 (kam umar se hi insulin chaahiye)', es: 'Tipo 1 (necesita insulina desde joven)' },
    { id: 'gest', short: 'Preg. diab', en: 'Only during pregnancy (gestational)', name: 'Diabetes during pregnancy', te: 'గర్భంతో ఉన్నప్పుడు మాత్రమే', te_r: 'Garbhamto unnappudu maatrame', hi: 'सिर्फ़ गर्भावस्था में', hi_r: 'Sirf garbhaavastha mein', es: 'Solo durante el embarazo (gestacional)' },
  ],
  heart: [
    { id: 'attack', short: 'Heart att', en: 'Heart attack, blocked arteries, bypass or stent', name: 'Heart attack or blocked arteries', te: 'గుండెపోటు, గుండె నరాలు మూసుకుపోవడం, బైపాస్ లేదా స్టెంట్', te_r: 'Gundepotu, gunde naraalu moosukupovadam, bypass leda stent', hi: 'दिल का दौरा, नसों में रुकावट (ब्लॉकेज), बाईपास या स्टेंट', hi_r: 'Dil ka daura, nason mein rukaavat (blockage), bypass ya stent', es: 'Infarto, arterias tapadas, bypass o stent' },
    { id: 'muscle', short: 'Cardiomyop', en: 'Weak or thick heart muscle (cardiomyopathy)', name: 'Cardiomyopathy (heart muscle disease)', te: 'గుండె కండరం బలహీనం లేదా మందం (కార్డియోమయోపతి)', te_r: 'Gunde kandaram balaheenam leda mandam (cardiomyopathy)', hi: 'दिल की मांसपेशी कमज़ोर या मोटी (कार्डियोमायोपैथी)', hi_r: 'Dil ki maanspeshi kamzor ya moti (cardiomyopathy)', es: 'Músculo del corazón débil o grueso (miocardiopatía)' },
    { id: 'rhythm', short: 'Rhythm', en: 'Heart rhythm problem or pacemaker', name: 'Heart rhythm problem', te: 'గుండె కొట్టుకోవడంలో తేడా లేదా పేస్‌మేకర్', te_r: 'Gunde kottukovadamlo tedaa leda pacemaker', hi: 'धड़कन की गड़बड़ी या पेसमेकर', hi_r: 'Dhadkan ki gadbadi ya pacemaker', es: 'Problema del ritmo del corazón o marcapasos' },
    { id: 'failure', short: 'Heart fail', en: 'Heart failure', name: 'Heart failure', te: 'గుండె బలహీనపడటం (హార్ట్ ఫెయిల్యూర్)', te_r: 'Gunde balaheenapadatam (heart failure)', hi: 'हार्ट फ़ेलियर (दिल का कमज़ोर होना)', hi_r: 'Heart failure (dil ka kamzor hona)', es: 'Insuficiencia cardíaca' },
    { id: 'birth', short: 'Cong. heart', en: 'Heart problem from birth', name: 'Heart problem from birth', te: 'పుట్టుకతో వచ్చిన గుండె సమస్య', te_r: 'Puttukato vachchina gunde samasya', hi: 'जन्म से दिल की समस्या', hi_r: 'Janm se dil ki samasya', es: 'Problema del corazón de nacimiento' },
  ],
  kidney: [
    { id: 'failure', short: 'Kidney fail', en: 'Kidney failure or dialysis', name: 'Kidney failure', te: 'కిడ్నీలు ఫెయిల్ అవడం లేదా డయాలసిస్', te_r: 'Kidneylu fail avadam leda dialysis', hi: 'किडनी फ़ेल होना या डायलिसिस', hi_r: 'Kidney fail hona ya dialysis', es: 'Falla de los riñones o diálisis' },
    { id: 'pkd', short: 'PKD', en: 'Polycystic kidneys (cysts)', name: 'Polycystic kidney disease', te: 'కిడ్నీలలో నీటి తిత్తులు (పాలిసిస్టిక్)', te_r: 'Kidneylalo neeti tittulu (polycystic)', hi: 'किडनी में पानी की थैलियाँ (पॉलीसिस्टिक किडनी)', hi_r: 'Kidney mein paani ki thailiyaan (polycystic kidney)', es: 'Riñones poliquísticos (quistes)' },
    { id: 'stones', short: 'Stones', en: 'Kidney stones', name: 'Kidney stones', te: 'కిడ్నీలో రాళ్ళు', te_r: 'Kidneylo raallu', hi: 'पथरी (गुर्दे की पथरी)', hi_r: 'Pathri (gurde ki pathri)', es: 'Piedras en los riñones' },
  ],
  mental: [
    { id: 'mood', short: 'Depression', en: 'Depression or anxiety', name: 'Depression or anxiety', te: 'డిప్రెషన్ (కుంగుబాటు) లేదా ఆందోళన', te_r: 'Depression (kungubaatu) leda aandolana', hi: 'डिप्रेशन या घबराहट (एंग्ज़ायटी)', hi_r: 'Depression ya ghabraahat (anxiety)', es: 'Depresión o ansiedad' },
    { id: 'bipolar', short: 'Bipolar', en: 'Bipolar disorder', name: 'Bipolar disorder', te: 'బైపోలార్ (మూడ్ బాగా మారిపోవడం)', te_r: 'Bipolar (mood baagaa maaripovadam)', hi: 'बाइपोलर (मूड बहुत ऊपर-नीचे होना)', hi_r: 'Bipolar (mood bahut oopar-neeche hona)', es: 'Trastorno bipolar' },
    { id: 'psychosis', short: 'Psychosis', en: 'Schizophrenia or psychosis', name: 'Schizophrenia or psychosis', te: 'స్కిజోఫ్రీనియా లేదా సైకోసిస్', te_r: 'Schizophrenia leda psychosis', hi: 'सिज़ोफ्रेनिया या साइकोसिस', hi_r: 'Schizophrenia ya psychosis', es: 'Esquizofrenia o psicosis' },
    { id: 'suicide', short: 'Suicide', en: 'Died by suicide or attempted it', name: 'Suicide or suicide attempt', te: 'ఆత్మహత్య చేసుకున్నారు లేదా ప్రయత్నించారు', te_r: 'Aatmahatya chesukunnaaru leda prayatninchaaru', hi: 'आत्महत्या की या कोशिश की', hi_r: 'Aatmahatya ki ya koshish ki', es: 'Se quitó la vida o lo intentó' },
    { id: 'neuro', short: 'Autism/ADHD', en: 'Autism or ADHD', name: 'Autism or ADHD', te: 'ఆటిజం లేదా ADHD', te_r: 'Autism leda ADHD', hi: 'ऑटिज़्म या ADHD', hi_r: 'Autism ya ADHD', es: 'Autismo o TDAH' },
  ],
  blood: [
    { id: 'thal', short: 'Thalass.', en: 'Thalassemia', name: 'Thalassemia', te: 'తలసేమియా', te_r: 'Thalassemia', hi: 'थैलेसीमिया', hi_r: 'Thalassemia', es: 'Talasemia' },
    { id: 'sickle', short: 'Sickle', en: 'Sickle cell disease or trait', name: 'Sickle cell disease or trait', te: 'సికిల్ సెల్ వ్యాధి లేదా లక్షణం (ట్రెయిట్)', te_r: 'Sickle cell vyaadhi leda lakshanam (trait)', hi: 'सिकल सेल बीमारी या ट्रेट (वाहक)', hi_r: 'Sickle cell beemaari ya trait (vaahak)', es: 'Anemia falciforme o rasgo falciforme' },
    { id: 'g6pd', short: 'G6PD', en: 'G6PD deficiency', name: 'G6PD deficiency', te: 'G6PD లోపం', te_r: 'G6PD lopam', hi: 'G6PD की कमी', hi_r: 'G6PD ki kami', es: 'Deficiencia de G6PD' },
    { id: 'anemia', short: 'Anemia', en: 'Anemia (low blood)', name: 'Anemia', te: 'రక్తహీనత (రక్తం తక్కువ)', te_r: 'Raktaheenata (raktam takkuva)', hi: 'खून की कमी (एनीमिया)', hi_r: 'Khoon ki kami (anemia)', es: 'Anemia (sangre baja)' },
    { id: 'bleeding', short: 'Bleeding', en: 'Bleeding disorder (hemophilia, von Willebrand)', name: 'Bleeding disorder', te: 'రక్తం గడ్డకట్టని జబ్బు (హీమోఫీలియా, వాన్ విల్లెబ్రాండ్)', te_r: 'Raktam gaddakattani jabbu (hemophilia, von Willebrand)', hi: 'खून न रुकने की बीमारी (हीमोफ़ीलिया, वॉन विलेब्रांड)', hi_r: 'Khoon na rukne ki beemaari (hemophilia, von Willebrand)', es: 'Trastorno de sangrado (hemofilia, von Willebrand)' },
  ],
  liver: [
    { id: 'hepb', short: 'Hep B', en: 'Hepatitis B', name: 'Hepatitis B', te: 'హెపటైటిస్ బి', te_r: 'Hepatitis B', hi: 'हेपेटाइटिस बी', hi_r: 'Hepatitis B', es: 'Hepatitis B' },
    { id: 'hepc', short: 'Hep C', en: 'Hepatitis C', name: 'Hepatitis C', te: 'హెపటైటిస్ సి', te_r: 'Hepatitis C', hi: 'हेपेटाइटिस सी', hi_r: 'Hepatitis C', es: 'Hepatitis C' },
    { id: 'fatty', short: 'Fatty liver', en: 'Fatty liver', name: 'Fatty liver disease', te: 'ఫ్యాటీ లివర్ (కాలేయంలో కొవ్వు)', te_r: 'Fatty liver (kaaleyamlo kovvu)', hi: 'फैटी लिवर (जिगर में चर्बी)', hi_r: 'Fatty liver (jigar mein charbi)', es: 'Hígado graso' },
    { id: 'cirrhosis', short: 'Cirrhosis', en: 'Cirrhosis or liver failure', name: 'Cirrhosis', te: 'లివర్ సిరోసిస్ లేదా లివర్ ఫెయిల్ అవడం', te_r: 'Liver cirrhosis leda liver fail avadam', hi: 'सिरोसिस या लिवर फ़ेल होना', hi_r: 'Cirrhosis ya liver fail hona', es: 'Cirrosis o falla del hígado' },
    { id: 'iron', short: 'Iron', en: 'Too much iron (hemochromatosis)', name: 'Hemochromatosis', te: 'శరీరంలో ఐరన్ ఎక్కువ (హీమోక్రోమాటోసిస్)', te_r: 'Shareeramlo iron ekkuva (hemochromatosis)', hi: 'शरीर में आयरन ज़्यादा (हीमोक्रोमैटोसिस)', hi_r: 'Shareer mein iron zyaada (hemochromatosis)', es: 'Demasiado hierro (hemocromatosis)' },
  ],
};
const subtypeOf = (cond, type) => type && SUBTYPES[cond]?.find(t => t.id === type);
function factName(cond, type) {
  const t = subtypeOf(cond, type);
  if (cond !== 'cancer') return t ? t.name : COND[cond].en;
  if (!type) return 'Cancer, kind unknown';
  if (type === 'other') return 'Cancer, another kind';
  return t ? t.name || `${t.en.replace(' (womb)', '')} cancer` : 'Cancer';
}
function factShort(cond, type) { return subtypeOf(cond, type)?.short || (cond === 'cancer' ? 'Cancer' : COND[cond].short); }

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
  children: {
    en: 'Tell me about your children. Did any of them have serious health problems, or pass away young?',
    te: 'మీ పిల్లల గురించి చెప్పండి. వాళ్ళలో ఎవరికైనా పెద్ద ఆరోగ్య సమస్యలు ఉన్నాయా, లేదా ఎవరైనా చిన్న వయసులోనే చనిపోయారా?',
    te_r: 'Mee pillala gurinchi cheppandi. Vaallalo evarikainaa pedda aarogya samasyalu unnaayaa, leda evarainaa chinna vayasulone chanipoyaaraa?',
    hi: 'मुझे अपने बच्चों के बारे में बताइए। क्या उनमें से किसी को कोई गंभीर स्वास्थ्य समस्या थी, या किसी का कम उम्र में देहांत हुआ?',
    hi_r: 'Mujhe apne bachchon ke baare mein bataaiye. Kya unmein se kisi ko koi gambheer swaasthya samasya thi, ya kisi ka kam umar mein dehaant hua?',
    es: 'Cuénteme de sus hijos. ¿Alguno tuvo problemas de salud graves, o falleció joven?',
  },
  genetic: {
    en: 'Has anyone in the family had a genetic test, for example for BRCA or Lynch syndrome? Who was it, and what did it find?',
    te: 'మన కుటుంబంలో ఎవరైనా జన్యు పరీక్ష (జెనెటిక్ టెస్ట్) చేయించుకున్నారా? ఉదాహరణకు BRCA లేదా లించ్ సిండ్రోమ్ కోసం. ఎవరు, అందులో ఏం తెలిసింది?',
    te_r: 'Mana kutumbamlo evarainaa janyu pareeksha (genetic test) cheyinchukunnaaraa? Udaaharanaku BRCA leda Lynch syndrome kosam. Evaru, andulo em telisindi?',
    hi: 'क्या परिवार में किसी ने जेनेटिक टेस्ट (आनुवंशिक जाँच) करवाया है, जैसे BRCA या लिंच सिंड्रोम के लिए? वह कौन था, और उसमें क्या निकला?',
    hi_r: 'Kya parivaar mein kisi ne genetic test (aanuvanshik jaanch) karvaaya hai, jaise BRCA ya Lynch syndrome ke liye? Woh kaun tha, aur usmein kya nikla?',
    es: '¿Alguien de la familia se ha hecho una prueba genética, por ejemplo de BRCA o del síndrome de Lynch? ¿Quién fue, y qué encontraron?',
  },
  sudden: {
    en: 'Did anyone in the family die suddenly without a clear reason before age 50, faint while exercising, or drown?',
    te: 'మన కుటుంబంలో ఎవరైనా 50 ఏళ్ళ లోపే స్పష్టమైన కారణం లేకుండా అకస్మాత్తుగా చనిపోయారా, వ్యాయామం చేస్తున్నప్పుడు స్పృహ తప్పి పడిపోయారా, లేదా నీళ్ళలో మునిగి చనిపోయారా?',
    te_r: 'Mana kutumbamlo evarainaa 50 ella lope spashtamaina kaaranam lekundaa akasmaattugaa chanipoyaaraa, vyaayaamam chestunnappudu spruha tappi padipoyaaraa, leda neellalo munigi chanipoyaaraa?',
    hi: 'क्या परिवार में किसी की 50 साल से पहले बिना किसी साफ़ वजह के अचानक मौत हुई, कोई कसरत करते समय बेहोश हुआ, या किसी की डूबकर मौत हुई?',
    hi_r: 'Kya parivaar mein kisi ki 50 saal se pehle bina kisi saaf wajah ke achaanak maut hui, koi kasrat karte samay behosh hua, ya kisi ki doobkar maut hui?',
    es: '¿Alguien de la familia murió de repente sin una causa clara antes de los 50 años, se desmayó haciendo ejercicio, o se ahogó?',
  },
  related: {
    en: 'Were your parents related to each other by blood, for example cousins, or uncle and niece? Were you and your husband or wife?',
    te: 'మీ అమ్మా నాన్నలు ఒకరికొకరు రక్తసంబంధీకులా, ఉదాహరణకు బావ-మరదలు (మేనరికం), లేదా మేనమామ-మేనకోడలు? మీరూ మీ భర్త / భార్య కూడా బంధువులా?',
    te_r: 'Mee ammaa naannalu okarikokaru raktasambandheekulaa, udaaharanaku baava-maradalu (menarikam), leda menamaama-menakodalu? Meeroo mee bharta / bhaarya koodaa bandhuvulaa?',
    hi: 'क्या आपके माता-पिता आपस में खून के रिश्ते में थे, जैसे चचेरे-ममेरे भाई-बहन, या मामा-भांजी? क्या आप और आपके पति या पत्नी भी रिश्तेदार हैं?',
    hi_r: 'Kya aapke maata-pita aapas mein khoon ke rishte mein the, jaise chachere-mamere bhai-behen, ya maama-bhaanji? Kya aap aur aapke pati ya patni bhi rishtedaar hain?',
    es: '¿Sus padres eran parientes de sangre, por ejemplo primos, o tío y sobrina? ¿Y usted y su esposo o esposa?',
  },
  pregnancy: {
    en: 'In our family, were there miscarriages, stillbirths, or babies who died in their first year?',
    te: 'మన కుటుంబంలో గర్భస్రావాలు, చనిపోయి పుట్టిన బిడ్డలు, లేదా ఏడాది లోపే చనిపోయిన పసిపిల్లలు ఉన్నారా?',
    te_r: 'Mana kutumbamlo garbhasraavaalu, chanipoyi puttina biddalu, leda edaadi lope chanipoyina pasipillalu unnaaraa?',
    hi: 'क्या हमारे परिवार में कभी गर्भपात हुए, बच्चे मरे हुए पैदा हुए, या कोई बच्चा पहले साल में ही गुज़र गया?',
    hi_r: 'Kya hamaare parivaar mein kabhi garbhpaat hue, bachche mare hue paida hue, ya koi bachcha pehle saal mein hi guzar gaya?',
    es: 'En nuestra familia, ¿hubo pérdidas de embarazo, bebés que nacieron sin vida, o bebés que murieron en su primer año?',
  },
  birth: {
    en: 'Was anyone in the family born with a health problem, or did anyone have trouble learning, an intellectual disability, or hearing loss as a child?',
    te: 'మన కుటుంబంలో ఎవరైనా పుట్టుకతోనే ఏదైనా ఆరోగ్య సమస్యతో పుట్టారా? లేదా చిన్నప్పుడు ఎవరికైనా చదువు నేర్చుకోవడంలో ఇబ్బంది, బుద్ధిమాంద్యం, లేదా వినికిడి లోపం ఉండేదా?',
    te_r: 'Mana kutumbamlo evarainaa puttukatone edainaa aarogya samasyato puttaaraa? Leda chinnappudu evarikainaa chaduvu nerchukovadamlo ibbandi, buddhimaandyam, leda vinikidi lopam undedaa?',
    hi: 'क्या परिवार में कोई जन्म से किसी स्वास्थ्य समस्या के साथ पैदा हुआ, या बचपन में किसी को सीखने में दिक्कत, मानसिक विकलांगता, या कम सुनाई देने की समस्या थी?',
    hi_r: 'Kya parivaar mein koi janm se kisi swaasthya samasya ke saath paida hua, ya bachpan mein kisi ko seekhne mein dikkat, maanasik viklaangta, ya kam sunaai dene ki samasya thi?',
    es: '¿Alguien de la familia nació con un problema de salud, o tuvo de niño problemas para aprender, una discapacidad intelectual o pérdida de audición?',
  },
  anesthesia: {
    en: 'Has anyone in the family had a serious reaction to anesthesia during an operation, like a very high fever?',
    te: 'మన కుటుంబంలో ఎవరికైనా ఆపరేషన్ సమయంలో మత్తుమందు (అనస్థీషియా) వల్ల తీవ్రమైన రియాక్షన్ వచ్చిందా, ఉదాహరణకు చాలా ఎక్కువ జ్వరం?',
    te_r: 'Mana kutumbamlo evarikainaa operation samayamlo mattumandu (anesthesia) valla teevramaina reaction vachchindaa, udaaharanaku chaalaa ekkuva jvaram?',
    hi: 'क्या परिवार में किसी को ऑपरेशन के दौरान बेहोशी की दवा (एनेस्थीसिया) से गंभीर रिएक्शन हुआ, जैसे बहुत तेज़ बुखार?',
    hi_r: 'Kya parivaar mein kisi ko operation ke dauraan behoshi ki dawa (anesthesia) se gambheer reaction hua, jaise bahut tez bukhaar?',
    es: '¿Alguien de la familia tuvo una reacción grave a la anestesia durante una operación, como una fiebre muy alta?',
  },
  tobacco: {
    en: 'Did you or your parents smoke, or chew tobacco, gutka or paan? For how many years?',
    te: 'మీరు గానీ మీ అమ్మా నాన్నలు గానీ సిగరెట్ / బీడీ తాగారా, లేదా పొగాకు, గుట్కా, పాన్ నమిలారా? ఎన్ని సంవత్సరాలు?',
    te_r: 'Meeru gaani mee ammaa naannalu gaani cigarette / beedi taagaaraa, leda pogaaku, gutka, paan namilaaraa? Enni samvatsaraalu?',
    hi: 'क्या आप या आपके माता-पिता सिगरेट / बीड़ी पीते थे, या तंबाकू, गुटखा या पान खाते थे? कितने साल तक?',
    hi_r: 'Kya aap ya aapke maata-pita cigarette / beedi peete the, ya tambaakoo, gutkha ya paan khaate the? Kitne saal tak?',
    es: '¿Usted o sus padres fumaban, o masticaban tabaco, gutka o paan? ¿Por cuántos años?',
  },
  ancestry: {
    en: "Where did your parents' and grandparents' families come from?",
    te: 'మీ అమ్మానాన్నల, వాళ్ళ అమ్మానాన్నల కుటుంబాలు ఎక్కడి నుంచి వచ్చాయి?',
    te_r: 'Mee ammaanaannala, vaalla ammaanaannala kutumbaalu ekkadi nunchi vachchaayi?',
    hi: 'आपके माता-पिता और दादा-दादी, नाना-नानी के परिवार कहाँ से आए थे?',
    hi_r: 'Aapke maata-pita aur daada-daadi, naana-naani ke parivaar kahaan se aaye the?',
    es: '¿De dónde venían las familias de sus padres y de sus abuelos?',
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
  kind: {
    en: 'What kind was it?',
    te: 'అది ఏ రకం?', te_r: 'Adi ee rakam?',
    hi: 'वह किस तरह का था?', hi_r: 'Woh kis tarah ka tha?',
    es: '¿De qué tipo era?',
  },
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
  { k: 'siblings', type: 'siblings', who: 'self', tip: 'Tap each brother or sister to save what they had. Add anyone who is missing from the tree.' },
  { k: 'children', type: 'children', who: 'self', tip: "When you interview a grandparent, their children are your parents, aunts and uncles. They count as close relatives for your own risk." },
  // Questions about the whole family. Each answer is saved with the person who gave it.
  { k: 'genetic', type: 'check', tip: 'If someone had a genetic test, ask for a copy of the result. Doctors need the exact gene and change that was found.' },
  { k: 'sudden', type: 'check', tip: 'Sudden deaths in young people are sometimes caused by heart conditions that run in families and can be checked for.' },
  { k: 'related', type: 'check', tip: 'This is common in many families and nothing to be embarrassed about. It helps doctors think about conditions passed down from both sides.' },
  { k: 'pregnancy', type: 'check', tip: 'Ask gently. Some of these memories are painful.' },
  { k: 'birth', type: 'check' },
  { k: 'anesthesia', type: 'check', tip: 'A rare reaction to anesthesia runs in some families. Surgeons and dentists need to know about it.' },
  { k: 'tobacco', type: 'check' },
  { k: 'ancestry', type: 'check', tip: 'Pick all that apply. Ancestry changes some screening advice.' },
  { k: 'closing', type: 'closing' },
];

// Short names for the whole-family questions, used in the doctor report.
const FAMILY_CHECKS = [
  { id: 'genetic', en: 'Genetic test in the family' },
  { id: 'sudden', en: 'Sudden death before 50, fainting with exercise, or drowning' },
  { id: 'related', en: 'Parents related by blood' },
  { id: 'pregnancy', en: 'Miscarriages, stillbirths or infant deaths' },
  { id: 'birth', en: 'Birth differences, learning problems or childhood hearing loss' },
  { id: 'anesthesia', en: 'Serious reaction to anesthesia' },
  { id: 'tobacco', en: 'Smoking or chewing tobacco' },
  { id: 'ancestry', en: 'Where the family comes from' },
];
const CHECK = Object.fromEntries(FAMILY_CHECKS.map(c => [c.id, c]));

/* ---------- Elder mode: short phrases for tap-to-answer screens ---------- */
const ELDER_TEXT = {
  yes: { en: 'Yes', te: 'అవును', te_r: 'Avunu', hi: 'हाँ', hi_r: 'Haan', es: 'Sí' },
  no: { en: 'No', te: 'లేదు', te_r: 'Ledu', hi: 'नहीं', hi_r: 'Nahin', es: 'No' },
  unsure: { en: "Don't know", te: 'తెలియదు', te_r: 'Teliyadu', hi: 'पता नहीं', hi_r: 'Pata nahin', es: 'No sé' },
  next: { en: 'Next', te: 'తరువాత', te_r: 'Taruvaata', hi: 'आगे', hi_r: 'Aage', es: 'Siguiente' },
  back: { en: 'Back', te: 'వెనక్కి', te_r: 'Venakki', hi: 'पीछे', hi_r: 'Peechhe', es: 'Atrás' },
  finish: { en: 'Finish', te: 'పూర్తి', te_r: 'Poorti', hi: 'समाप्त', hi_r: 'Samaapt', es: 'Terminar' },
  age: { en: 'About how old?', te: 'సుమారు ఏ వయసులో?', te_r: 'Sumaaru ee vayasulo?', hi: 'लगभग किस उम्र में?', hi_r: 'Lagbhag kis umar mein?', es: '¿Más o menos a qué edad?' },
  listen: { en: 'Listen', te: 'వినండి', te_r: 'Vinandi', hi: 'सुनिए', hi_r: 'Suniye', es: 'Escuchar' },
  thanks: { en: 'Thank you!', te: 'ధన్యవాదాలు!', te_r: 'Dhanyavaadaalu!', hi: 'धन्यवाद!', hi_r: 'Dhanyavaad!', es: '¡Gracias!' },
  had_self: { en: 'Did a doctor ever tell you that you have this?', te: 'మీకు ఇది ఉందని డాక్టర్ ఎప్పుడైనా చెప్పారా?', te_r: 'Meeku idi undani doctor eppudainaa cheppaaraa?', hi: 'क्या किसी डॉक्टर ने कभी बताया कि आपको यह है?', hi_r: 'Kya kisi doctor ne kabhi bataaya ki aapko yeh hai?', es: '¿Algún médico le dijo alguna vez que tiene esto?' },
  had_mother: { en: 'Did your mother have this?', te: 'మీ అమ్మగారికి ఇది ఉండేదా?', te_r: 'Mee ammagaariki idi undedaa?', hi: 'क्या आपकी माँ को यह था?', hi_r: 'Kya aapki maa ko yeh tha?', es: '¿Su mamá tuvo esto?' },
  had_father: { en: 'Did your father have this?', te: 'మీ నాన్నగారికి ఇది ఉండేదా?', te_r: 'Mee naannagaariki idi undedaa?', hi: 'क्या आपके पिताजी को यह था?', hi_r: 'Kya aapke pitaaji ko yeh tha?', es: '¿Su papá tuvo esto?' },
  about_self: { en: 'About you', te: 'మీ గురించి', te_r: 'Mee gurinchi', hi: 'आपके बारे में', hi_r: 'Aapke baare mein', es: 'Sobre usted' },
  about_mother: { en: 'About your mother', te: 'మీ అమ్మగారి గురించి', te_r: 'Mee ammagaari gurinchi', hi: 'आपकी माँ के बारे में', hi_r: 'Aapki maa ke baare mein', es: 'Sobre su mamá' },
  about_father: { en: 'About your father', te: 'మీ నాన్నగారి గురించి', te_r: 'Mee naannagaari gurinchi', hi: 'आपके पिताजी के बारे में', hi_r: 'Aapke pitaaji ke baare mein', es: 'Sobre su papá' },
  living_q: { en: 'Is this person still living?', te: 'వారు ఇంకా ఉన్నారా?', te_r: 'Vaaru inkaa unnaaraa?', hi: 'क्या वे अभी जीवित हैं?', hi_r: 'Kya ve abhi jeevit hain?', es: '¿Esta persona todavía vive?' },
  death_age_q: { en: 'How old were they when they passed away?', te: 'కాలం చేసినప్పుడు వారి వయసు ఎంత?', te_r: 'Kaalam chesinappudu vaari vayasu entha?', hi: 'देहांत के समय उनकी उम्र कितनी थी?', hi_r: 'Dehaant ke samay unki umar kitni thi?', es: '¿Qué edad tenía cuando falleció?' },
  born_q: { en: 'What year were you born?', te: 'మీరు ఏ సంవత్సరంలో పుట్టారు?', te_r: 'Meeru ee samvatsaramlo puttaaru?', hi: 'आपका जन्म किस साल हुआ?', hi_r: 'Aapka janm kis saal hua?', es: '¿En qué año nació?' },
  welcome: { en: 'Your family asked you to help with a family health history. Tap the answers. You can skip anything.', te: 'కుటుంబ ఆరోగ్య చరిత్ర కోసం మీ సహాయం అడిగారు. జవాబులను తాకండి. ఏదైనా వదిలేయవచ్చు.', te_r: 'Kutumba aarogya charitra kosam mee sahaayam adigaaru. Javaabulanu taakandi. Edainaa vadileyavachchu.', hi: 'आपके परिवार ने पारिवारिक स्वास्थ्य इतिहास में आपकी मदद माँगी है। जवाब पर टैप करें। आप कुछ भी छोड़ सकते हैं।', hi_r: 'Aapke parivaar ne paarivaarik swaasthya itihaas mein aapki madad maangi hai. Jawaab par tap karein. Aap kuchh bhi chhod sakte hain.', es: 'Su familia le pidió ayuda con una historia de salud familiar. Toque las respuestas. Puede saltarse cualquier pregunta.' },
  send_back: { en: 'Send your answers back', te: 'మీ జవాబులను తిరిగి పంపండి', te_r: 'Mee javaabulanu tirigi pampandi', hi: 'अपने जवाब वापस भेजें', hi_r: 'Apne jawaab waapas bhejein', es: 'Enviar sus respuestas' },
  tap_all: { en: 'Tap all that apply.', te: 'సరిపోయే వాటన్నింటినీ తాకండి.', te_r: 'Saripoye vaatanninteenee taakandi.', hi: 'जो-जो लागू हों, सब पर टैप करें।', hi_r: 'Jo-jo laagoo hon, sab par tap karein.', es: 'Toque todas las que correspondan.' },
  about_family: { en: 'About the whole family', te: 'మొత్తం కుటుంబం గురించి', te_r: 'Mottam kutumbam gurinchi', hi: 'पूरे परिवार के बारे में', hi_r: 'Poore parivaar ke baare mein', es: 'Sobre toda la familia' },
};

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
  { cond: 'polyps', words: ['polyp', 'polyps', 'pólipo', 'pólipos', 'पॉलिप', 'పాలిప్', 'पोलिप'] },
  { cond: 'liver', words: ['hepatitis', 'liver disease', 'liver problem', 'cirrhosis', 'fatty liver', 'hemochromatosis', 'hepatitis b', 'hepatitis c', 'cirrosis', 'hígado graso', 'enfermedad del hígado', 'హెపటైటిస్', 'లివర్ జబ్బు', 'లివర్ సిరోసిస్', 'సిరోసిస్', 'ఫ్యాటీ లివర్', 'కాలేయ వ్యాధి', 'liver jabbu', 'हेपेटाइटिस', 'हेपाटाइटिस', 'लिवर की बीमारी', 'जिगर की बीमारी', 'सिरोसिस', 'फैटी लिवर', 'liver ki bimari', 'liver ki beemaari', 'jigar ki bimari'] },
  { cond: 'clots', words: ['blood clot', 'blood clots', 'clot in', 'dvt', 'pulmonary embolism', 'embolism', 'trombosis', 'coágulo', 'coágulos', 'embolia', 'రక్తం గడ్డకట్ట', 'రక్తం గడ్డ కట్ట', 'खून का थक्का', 'खून के थक्के', 'थक्का', 'थक्के', 'khoon ka thakka'] },
  { cond: 'ibd', words: ['crohn', "crohn's", 'crohns', 'ulcerative colitis', 'colitis', 'colitis ulcerosa', 'enfermedad de crohn', 'క్రోన్స్', 'కొలైటిస్', 'क्रोन', 'कोलाइटिस'] },
  { cond: 'celiac', words: ['celiac', 'coeliac', 'gluten', 'celíaca', 'celiaquía', 'celíaco', 'సీలియాక్', 'గ్లూటెన్', 'सीलिएक', 'सीलियक', 'ग्लूटेन'] },
  { cond: 'glaucoma', words: ['glaucoma', 'ग्लूकोमा', 'काला मोतिया', 'kala motia', 'గ్లకోమా', 'గ్లాకోమా', 'ग्लॉकोमा', 'kaala motiya', 'kala motiya'] },
  { cond: 'osteo', words: ['osteoporosis', 'weak bones', 'brittle bones', 'broken hip', 'hip fracture', 'broke her hip', 'broke his hip', 'osteoporosis', 'huesos débiles', 'fractura de cadera', 'ఆస్టియోపొరోసిస్', 'ఎముకలు బలహీన', 'తుంటి ఎముక విరిగ', 'ऑस्टियोपोरोसिस', 'कमज़ोर हड्डि', 'कमजोर हड्डि', 'कूल्हे की हड्डी टूट', 'kamzor haddi', 'kamzor haddiyan'] },
  { cond: 'autoimmune', words: ['lupus', 'rheumatoid', 'autoimmune', 'artritis reumatoide', 'autoinmune', 'లూపస్', 'రుమటాయిడ్', 'ఆటోఇమ్యూన్', 'ल्यूपस', 'रूमेटॉइड', 'रुमेटाइड', 'रूमेटाइड', 'ऑटोइम्यून'] },
  { cond: 'substance', words: ['alcoholic', 'alcoholism', 'addiction', 'addicted', 'drinking problem', 'drug problem', 'alcohólico', 'alcoholismo', 'adicción', 'adicto', 'తాగుడు అలవాటు', 'తాగుబోతు', 'మద్యానికి బానిస', 'మత్తుమందులకు బానిస', 'taagubotu', 'शराब की लत', 'नशे की लत', 'शराबी', 'नशेड़ी', 'sharabi', 'sharaabi', 'sharab ki lat', 'nashe ki lat'] },
  { cond: 'hearing', words: ['deaf', 'hearing loss', 'hard of hearing', 'hearing aid', 'sordo', 'sordera', 'audífono', 'చెవుడు', 'వినికిడి లోపం', 'వినికిడి యంత్రం', 'chevudu', 'बहरापन', 'कम सुनाई', 'कान की मशीन', 'behra', 'behrapan', 'kam sunai'] },
];
// Cancer kinds, only matched in a sentence that also mentions cancer.
const CANCER_LEXICON = [
  { type: 'breast', words: ['breast', 'రొమ్ము', 'rommu', 'స్తన', 'स्तन', 'ब्रेस्ट', 'de mama', 'seno'] },
  { type: 'ovarian', words: ['ovary', 'ovarian', 'అండాశయ', 'andaashaya', 'अंडाशय', 'ovario'] },
  { type: 'smallbowel', words: ['small intestine', 'small bowel', 'duodenum', 'duodenal', 'చిన్నప్రేగు', 'chinnapregu', 'छोटी आंत', 'chhoti aant', 'intestino delgado', 'duodeno'] },
  { type: 'urinary', words: ['ureter', 'ureteral', 'renal pelvis', 'urothelial', 'మూత్ర నాళ', 'mootra naala', 'मूत्र नली', 'mootra nali', 'uréter', 'pelvis renal'] },
  { type: 'colorectal', words: ['colon', 'bowel', 'rectal', 'rectum', 'colorectal', 'పెద్దప్రేగు', 'peddapregu', 'आंत', 'कोलन', 'colorrectal', 'recto'] },
  { type: 'uterine', words: ['uterus', 'uterine', 'womb', 'endometrial', 'గర్భాశయ', 'garbhaashaya', 'गर्भाशय', 'útero', 'endometrio'] },
  { type: 'prostate', words: ['prostate', 'ప్రోస్టేట్', 'प्रोस्टेट', 'próstata'] },
  { type: 'pancreatic', words: ['pancreas', 'pancreatic', 'ప్యాంక్రియాస్', 'క్లోమ', 'पैंक्रियास', 'अग्न्याशय', 'páncreas'] },
  { type: 'stomach', words: ['stomach', 'జీర్ణాశయ', 'కడుపు', 'kadupu', 'पेट', 'estómago'] },
  { type: 'lung', words: ['lung', 'ఊపిరితిత్తు', 'oopiritittu', 'फेफड़', 'pulmón'] },
  { type: 'bloodca', words: ['leukemia', 'leukaemia', 'lymphoma', 'blood cancer', 'రక్త క్యాన్సర్', 'ब्लड कैंसर', 'leucemia', 'linfoma'] },
  { type: 'skin', words: ['melanoma', 'skin', 'చర్మ', 'त्वचा', 'piel'] },
  { type: 'thyroidca', words: ['thyroid', 'tiroides', 'थायरॉइड', 'థైరాయిడ్', 'थायराइड'] },
  { type: 'kidneyca', words: ['kidney', 'renal cell', 'riñón', 'किडनी', 'కిడ్నీ', 'మూత్రపిండ', 'गुर्दे', 'गुर्दा', 'gurde', 'gurda'] },
  { type: 'liverca', words: ['liver', 'hígado', 'लिवर', 'जिगर', 'లివర్', 'కాలేయ', 'लीवर', 'jigar'] },
  { type: 'cervical', words: ['cervix', 'cervical', 'cuello uterino', 'cérvix', 'सर्वाइकल', 'సర్వైకల్', 'సర్విక్స్', 'గర్భాశయ ముఖద్వార', 'सर्विक्स', 'बच्चेदानी का मुँह', 'बच्चेदानी के मुँह', 'बच्चेदानी का मुंह', 'बच्चेदानी के मुंह', 'गर्भाशय ग्रीवा', 'cuello del útero'] },
  { type: 'headneck', words: ['mouth', 'tongue', 'throat', 'oral', 'boca', 'lengua', 'garganta', 'मुंह', 'जीभ', 'गले', 'నోటి', 'నాలుక', 'గొంతు', 'నోరు', 'నోట్లో', 'मुँह', 'गला', 'munh ka', 'munh ke', 'gale ka', 'gale ke'] },
  { type: 'esophagus', words: ['esophagus', 'oesophagus', 'esophageal', 'food pipe', 'esófago', 'ग्रासनली', 'అన్నవాహిక', 'ఆహార నాళ', 'खाने की नली', 'भोजन नली', 'आहार नली'] },
  { type: 'bladder', words: ['bladder', 'vejiga', 'मूत्राशय', 'మూత్రాశయ', 'पेशाब की थैली'] },
  { type: 'brain', words: ['brain', 'cerebro', 'cerebral', 'दिमाग', 'मस्तिष्क', 'మెదడు', 'दिमाग़', 'dimaag', 'dimag', 'medadu'] },
  { type: 'testicular', words: ['testicle', 'testicular', 'testículo', 'अंडकोष', 'వృషణ', 'अंडकोश'] },
  { type: 'sarcoma', words: ['sarcoma', 'bone cancer', 'hueso', 'हड्डी', 'ఎముక', 'सारकोमा', 'सार्कोमा', 'సార్కోమా'] },
];
// Bare गुजर / పోయారు are left out: "गुजरात" and "హైదరాబాద్ పోయారు" (went to Hyderabad) are not deaths.
const DEATH_WORDS = ['died', 'passed away', 'passed on', 'death', 'చనిపోయ', 'కాలం చేశ', 'కాలం చేస', 'మరణించ', 'కన్నుమూశ', 'chanipoy', 'kaalam chesa', 'गुजर ग', 'गुज़र ग', 'गुजर चुके', 'गुज़र चुके', 'चल बस', 'देहांत', 'मृत्यु', 'मौत', 'guzar', 'dehaant', 'murió', 'falleció', 'muerte'];
const NEG_WORDS = ['no', 'not', 'never', "didn't", "doesn't", "don't", "isn't", "wasn't", "weren't", "aren't", "hasn't", "haven't", "hadn't", "won't", 'didnt', 'doesnt', 'dont', 'wasnt', 'hasnt', 'havent', 'nobody', 'none', 'without', 'లేదు', 'లేవు', 'ledu', 'levu', 'नहीं', 'नही', 'nahin', 'nahi', 'nunca', 'sin', 'nadie', 'ninguno', 'ninguna', 'ningún', 'jamás', 'tampoco'];
// The "no" words said BEFORE the illness ("no diabetes", "没有糖尿病", "không bị"). All other NEG_WORDS
// (లేదు, नहीं, இல்லை, নেই…) come after it, so they only count right after the illness word.
const NEG_BEFORE = NEG_WORDS.slice(0, NEG_WORDS.indexOf('లేదు')).concat(['nunca', 'sin', 'nadie', 'ninguno', 'ninguna', 'ningún', 'jamás', 'tampoco', '没', '不是', '从来没', '从没', 'không', 'chưa', 'chẳng']);
// A "no" before these does not reach the illness after them ("no problems until he got diabetes").
const NEG_STOPS = ['until', 'till', 'before', 'after', 'when', 'then', 'later', 'since', 'because', 'hasta', 'antes', 'después', 'luego', 'cuando', 'porque', 'entonces', '后来', '然后', '直到', '以后', '之后', 'sau đó', 'cho đến'];
// "But" words end one part of a sentence (like a comma).
const BUT_WORDS = ['but', 'however', 'although', 'though', 'pero', 'sino', 'aunque', 'lekin', 'magar', 'kaani', 'kani', 'aanaal', 'aadare', 'kintu', 'parantu', 'nhưng', 'लेकिन', 'मगर', 'परंतु', 'కానీ', 'ஆனால்', 'ಆದರೆ', 'কিন্তু', 'પરંતુ', 'لیکن', 'مگر', '但', '可是', '不过', '然而'];
// "And" words can start a part about someone else ("my mom has asthma and my dad has diabetes").
const AND_WORDS = ['and', 'y', 'aur', 'और', 'మరియు', 'மற்றும்', 'ಮತ್ತು', 'এবং', 'અને', 'اور', 'và'];
// Words that tell us a sentence is about the speaker's mother or father.
const KIN_WORDS = {
  mother: { stems: ['mother', 'mom', 'mum', 'amma', 'అమ్మ', 'माँ', 'मां', 'माता', 'mamá', 'madre'], not: ['ammamma', 'అమ్మమ్మ', 'అమ్మాయి', 'mother-in-law', 'मांग', 'माँग', 'मांस', 'माँस'] },
  father: { stems: ['father', 'dad', 'nanna', 'naanna', 'నాన్న', 'पिता', 'पापा', 'papá', 'padre'], not: ['nanamma', 'నానమ్మ', 'father-in-law'] },
  // Relatives the finder cannot place (grandparents, aunts, in-laws…): what is said about them is left out.
  other: { stems: [
    'grandm', 'grandf', 'grandpa', 'granny', 'grandparent', 'great-grand', 'nana', 'uncle', 'aunt', 'brother', 'sister', 'sibling', 'cousin', 'nephew', 'niece',
    'daughter', 'son-in-law', 'husband', 'wife', 'stepm', 'stepf', 'stepd', 'mother-in-law', 'father-in-law', 'children', 'my child', 'kids', 'grandson', 'granddaughter',
    'abuel', 'bisabuel', 'tío', 'tía', 'tio', 'tia', 'herman', 'primos', 'primas', 'mi primo', 'mi prima', 'su primo', 'su prima', 'hijo', 'hija', 'esposo', 'esposa', 'marido', 'sobrin', 'suegr', 'cuñad', 'niet', 'padrastro', 'madrastra',
    'అమ్మమ్మ', 'నానమ్మ', 'తాతయ్య', 'తాతగారు', 'తాతకి', 'తాతకు', 'అన్నయ్య', 'అక్కయ్య', 'అక్కకి', 'అక్కకు', 'తమ్ముడు', 'తమ్ముడి', 'చెల్లెలు', 'చెల్లెలి', 'చెల్లికి', 'మామయ్య', 'బాబాయ్', 'బాబాయి', 'పిన్ని', 'అత్తయ్య', 'పెద్దనాన్న', 'చిన్నాన్న', 'పెద్దమ్మ', 'చిన్నమ్మ', 'కొడుకు', 'కూతురు', 'భర్త', 'భార్య', 'మనవడు', 'మనవరాలు',
    'ammamma', 'nanamma', 'thatha', 'tatayya', 'annayya', 'akkayya', 'tammudu', 'chelli', 'mamayya', 'babai', 'pinni',
    'दादी', 'दादा', 'नानी', 'नाना', 'भाई', 'भैया', 'बहन', 'दीदी', 'चाचा', 'चाची', 'मामा', 'मामी', 'बुआ', 'मौसी', 'मौसा', 'ताऊ', 'ताई', 'बेटा', 'बेटी', 'बेटे', 'पति', 'पत्नी', 'ससुर', 'सास', 'पोता', 'पोती',
    'dadi', 'dada', 'nani', 'bhai', 'bhaiya', 'behen', 'bahan', 'didi', 'chacha', 'chachi', 'mausi', 'beti', 'patni', 'sasur', 'saas', 'mamu', 'mamoo', 'khala', 'phuphi', 'phupho', 'shohar', 'biwi',
    'பாட்டி', 'தாத்தா', 'அண்ணன்', 'அண்ணா', 'அக்கா', 'தம்பி', 'தங்கை', 'தங்கச்சி', 'மாமா', 'அத்தை', 'சித்தி', 'சித்தப்பா', 'பெரியப்பா', 'பெரியம்மா', 'அம்மாச்சி', 'அம்மம்மா', 'அப்பாயி', 'அப்பாத்தா', 'தாய்மாமா', 'மகன்', 'மகள்', 'கணவர்', 'மனைவி', 'paati', 'thaatha', 'annan', 'thambi', 'thangai', 'chithi', 'chithappa', 'periyappa', 'periyamma',
    'ಅಜ್ಜಿ', 'ಅಜ್ಜ', 'ಅಣ್ಣ', 'ಅಕ್ಕ', 'ತಂಗಿ', 'ಮಾವ', 'ಅತ್ತೆ', 'ಚಿಕ್ಕಪ್ಪ', 'ದೊಡ್ಡಪ್ಪ', 'ಚಿಕ್ಕಮ್ಮ', 'ದೊಡ್ಡಮ್ಮ', 'ಅಮ್ಮಮ್ಮ', 'ಮಗಳು', 'ಹೆಂಡತಿ', 'ajji', 'ajja', 'tangi', 'chikkappa', 'doddappa',
    'দাদু', 'ঠাকুমা', 'ঠাকুরমা', 'ঠাকুরদা', 'দিদিমা', 'নানি', 'মামা', 'মামী', 'মামি', 'মাসি', 'মাসী', 'কাকা', 'কাকু', 'কাকিমা', 'পিসি', 'দাদা', 'দিদি', 'ভাই', 'বোন', 'ছেলে', 'মেয়ে', 'স্বামী', 'স্ত্রী', 'মাতামহ',
    'દાદા', 'દાદી', 'ભાઈ', 'બહેન', 'કાકા', 'કાકી', 'મામા', 'મામી', 'માસી', 'ફઈ', 'ફોઈ', 'દીકરો', 'દીકરી', 'પતિ', 'પત્ની', 'માતામહ',
    'دادی', 'دادا', 'نانی', 'نانا', 'بھائی', 'بہن', 'چچا', 'چچی', 'ماموں', 'مامی', 'خالہ', 'پھوپھی', 'بیٹا', 'بیٹی', 'شوہر', 'بیوی',
    '奶奶', '爷爷', '外婆', '外公', '姥姥', '姥爷', '祖母', '祖父', '外祖', '哥哥', '姐姐', '弟弟', '妹妹', '我哥', '我姐', '我弟', '我妹', '叔叔', '阿姨', '舅舅', '姑姑', '伯伯', '伯父', '伯母', '婶婶', '儿子', '女儿', '丈夫', '老公', '妻子', '老婆', '婆婆', '公公', '岳父', '岳母', '孙子', '孙女',
    'ông nội', 'ông ngoại', 'bà nội', 'bà ngoại', 'anh trai', 'chị gái', 'em trai', 'em gái', 'con trai', 'con gái', 'dì',
  ], not: ['ছেলেবেলা'] },
};
// Words a parent word takes when it names someone else's relative: "mom's dad", "माँ के पिता", "el papá de mi mamá".
const KIN_OF = ['के', 'की', 'का', 'ke', 'ki', 'ka', 'کے', 'کی', 'کا', 'వాళ్ళ', 'de'];
const KIN_OF_ENDS = ["'s", 'ের', 'ின்', 'ના', 'ની', 'નો', 'గారి'];
// "I / me" words: a part of a sentence that starts with one is about the person being interviewed.
const SELF_WORDS = ['i', "i'm", "i've", "i'd", 'me', 'myself', 'yo', 'mujhe', 'mujhko', 'maine', 'मुझे', 'मुझको', 'मैंने', 'मैं', 'నేను', 'నాకు', 'nenu', 'naaku', 'naku', 'எனக்கு', 'நான்', 'enakku', 'ನನಗೆ', 'ನಾನು', 'nanage', 'আমি', 'আমাকে', 'મને', 'હું', 'مجھے', '我', 'tôi'];
// Spoken numbers (tens) for ages; "forties" style ranges map to the middle.
const NUM_WORDS = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  twenties: 25, thirties: 35, forties: 45, fifties: 55, sixties: 65, seventies: 75, eighties: 85,
  'ఇరవై': 20, iravai: 20, 'ముప్పై': 30, 'నలభై': 40, 'యాభై': 50, 'అరవై': 60, 'డెబ్బై': 70, 'ఎనభై': 80, 'తొంభై': 90,
  muppai: 30, nalabhai: 40, yaabhai: 50, yabhai: 50, aravai: 60, debbai: 70, enabhai: 80,
  'बीस': 20, 'तीस': 30, 'चालीस': 40, 'पचास': 50, 'साठ': 60, 'सत्तर': 70, 'अस्सी': 80, 'नब्बे': 90,
  bees: 20, tees: 30, chaalis: 40, chalis: 40, pachaas: 50, pachas: 50, saath: 60, sattar: 70, assi: 80,
  veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
  '二十': 20, '三十': 30, '四十': 40, '五十': 50, '六十': 60, '七十': 70, '八十': 80, '九十': 90,
};

// Ones digits that can follow a tens word ("forty-seven", "నలభై ఏడు", "cuarenta y siete").
const NUM_UNITS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  'ఒకటి': 1, 'రెండు': 2, 'మూడు': 3, 'నాలుగు': 4, 'ఐదు': 5, 'ఆరు': 6, 'ఏడు': 7, 'ఎనిమిది': 8, 'తొమ్మిది': 9,
  okati: 1, rendu: 2, moodu: 3, naalugu: 4, aidu: 5, aaru: 6, edu: 7, enimidi: 8, tommidi: 9,
  uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
};
const NUM_TEENS = { ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  veintiuno: 21, veintiún: 21, veintidós: 22, veintidos: 22, veintitrés: 23, veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiséis: 26, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29 };
// Number words that are also everyday words count only before these ("saath" is 60, and also "with").
const NUM_NEEDS = { saath: /^[\s-]*(?:saal|sal|baras|varsh|years?|ki\s+(?:umar|umr|age))/ };
// A number right after these is a label, not an age ("type 2 diabetes", "stage 3"), and so is one before 型/期 ("2型").
const NUM_LABELS = ['type', 'stage', 'grade', 'class', 'tipo', 'etapa', 'estadio', 'grado', 'fase', 'टाइप', 'स्टेज', 'టైప్', 'స్టేజ్', 'டைப்', 'ಟೈಪ್', 'টাইপ', 'ટાઇપ', 'ٹائپ', 'loại', 'giai đoạn'];
const NUM_LABELS_AFTER = ['型', '期'];
// "For ten years", "10 saal se", "10 సంవత్సరాలుగా", "hace 10 años": how long, not how old.
const YEAR_UNITS = ['years', 'year', 'yrs', 'yr', 'saal', 'sal', 'baras', 'साल', 'वर्ष', 'సంవత్సరా', 'ఏళ్ళ', 'ఏళ్ల', 'ఏండ్ల', 'வருட', 'வருஷ', 'ஆண்டு', 'ವರ್ಷ', 'বছর', 'વર્ષ', 'سال', 'años', 'anos'];
const YEARS_LONG = ['年', 'năm']; // Chinese and Vietnamese say ages with 岁 / tuổi, so "十年" / "10 năm" is always a duration.
const FOR_BEFORE = ['for', 'past', 'last', 'since', 'durante', 'hace', 'pichhle', 'pichle', 'पिछले'];
// Said right after the years word, or as its ending (సంవత్సరాలు+గా).
const FOR_AFTER = ['ago', 'back', 'से', 'గా', 'పాటు', 'క్రితం', 'மாக', 'களாக', 'ಗಳಿಂದ', 'ধরে', 'আগে', 'પહેલ', 'سے', 'پہلے', 'pehle', 'pahle', 'पहले', 'atrás', 'antes'];
const FOR_PHRASES = ['saal se', 'sal se', 'saalon se', 'saalo se', 'baras se'];
// Words that look like an illness word but mean something else.
const FALSE_FRIENDS = { 'दिल': ['दिलचस्प', 'दिलाना', 'दिलाया', 'दिलासा'], 'दौरे': ['दिल के दौरे', 'दौरे पर'], '胰': ['胰岛素'], '肾': ['肾上腺'], 'గర్భాశయ': ['గర్భాశయ ముఖద్వార'], 'गर्भाशय': ['गर्भाशय ग्रीवा'], 'útero': ['cuello del útero'], 'मुँह': ['बच्चेदानी का मुँह', 'बच्चेदानी के मुँह'], 'मुंह': ['बच्चेदानी का मुंह', 'बच्चेदानी के मुंह'] };
const LIVING_WORDS = ['still alive', 'alive', 'still living', 'is living', 'బతికే ఉన్నారు', 'బతికున్నారు', 'ఇంకా ఉన్నారు', 'batike unnaaru', 'जीवित', 'ज़िंदा', 'जिंदा', 'zinda', 'jeevit', 'está vivo', 'está viva', 'sigue vivo', 'sigue viva'];
const PRONOUNS = ['he', 'she', 'his', 'her', 'they', 'ఆయన', 'ఆమె', 'వారు', 'వాళ్ళు', 'वह', 'वो', 'उन्हें', 'उनको', 'उनकी', 'उनका', 'él', 'ella'];
const BORN_WORDS = ['born', 'birth', 'పుట్టా', 'పుట్టి', 'puttaa', 'జన్మ', 'जन्म', 'पैदा', 'janm', 'nací', 'nació', 'nacimiento'];

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
  nsgcPedigree: { short: 'NSGC standard pedigree, 2008', full: 'Bennett RL, French KS, Resta RG, Doyle DL. Standardized human pedigree nomenclature: update and assessment of the recommendations of the National Society of Genetic Counselors. J Genet Couns. 2008;17(5):424-433.', url: 'https://pubmed.ncbi.nlm.nih.gov/?term=Standardized+human+pedigree+nomenclature+update+and+assessment' },
  nsgcConsang: { short: 'NSGC recommendations for related couples, 2002', full: 'Bennett RL, Motulsky AG, Bittles A, et al. Genetic counseling and screening of consanguineous couples and their offspring: recommendations of the National Society of Genetic Counselors. J Genet Couns. 2002;11(2):97-119.', url: 'https://pubmed.ncbi.nlm.nih.gov/?term=Genetic+counseling+and+screening+of+consanguineous+couples+and+their+offspring' },
  ahaScd: { short: 'AHA/ACC/HRS sudden cardiac death guideline, 2017', full: 'Al-Khatib SM, et al. 2017 AHA/ACC/HRS guideline for management of patients with ventricular arrhythmias and the prevention of sudden cardiac death. Circulation. 2018;138(13):e272-e391.', url: 'https://pubmed.ncbi.nlm.nih.gov/?term=2017+AHA/ACC/HRS+guideline+ventricular+arrhythmias+prevention+of+sudden+cardiac+death' },
  ahaHcm: { short: 'AHA/ACC cardiomyopathy guideline, 2020', full: 'Ommen SR, et al. 2020 AHA/ACC guideline for the diagnosis and treatment of patients with hypertrophic cardiomyopathy. Circulation. 2020;142(25):e558-e631.', url: 'https://pubmed.ncbi.nlm.nih.gov/?term=2020+AHA/ACC+guideline+diagnosis+and+treatment+of+patients+with+hypertrophic+cardiomyopathy' },
  mhaus: { short: 'Malignant Hyperthermia Association of the US', full: 'Malignant Hyperthermia Association of the United States (MHAUS). What is malignant hyperthermia? Patient information.', url: 'https://www.mhaus.org' },
  cdcHepB: { short: 'CDC hepatitis B screening recommendations, 2023', full: 'Conners EE, et al. Screening and testing for hepatitis B virus infection: CDC recommendations, United States, 2023. MMWR Recomm Rep. 2023;72(RR-1):1-25.', url: 'https://www.cdc.gov/mmwr/volumes/72/rr/rr7201a1.htm' },
  acgCeliac: { short: 'American College of Gastroenterology celiac guideline, 2023', full: 'Rubio-Tapia A, et al. American College of Gastroenterology guidelines update: diagnosis and management of celiac disease. Am J Gastroenterol. 2023;118(1):59-76.', url: 'https://pubmed.ncbi.nlm.nih.gov/?term=American+College+of+Gastroenterology+guidelines+update+diagnosis+and+management+of+celiac+disease' },
  ashVte: { short: 'ASH blood clot (thrombophilia testing) guideline, 2023', full: 'Middeldorp S, et al. American Society of Hematology 2023 guidelines for management of venous thromboembolism: thrombophilia testing. Blood Adv. 2023;7(22):7101-7138.', url: 'https://pubmed.ncbi.nlm.nih.gov/?term=American+Society+of+Hematology+2023+guidelines+venous+thromboembolism+thrombophilia+testing' },
  aaoGlaucoma: { short: 'American Academy of Ophthalmology glaucoma guideline', full: 'Gedde SJ, et al. Primary open-angle glaucoma Preferred Practice Pattern. Ophthalmology. 2021;128(1):P71-P150.', url: 'https://pubmed.ncbi.nlm.nih.gov/?term=Primary+Open-Angle+Glaucoma+Preferred+Practice+Pattern+Gedde' },
  kdigoPkd: { short: 'KDIGO polycystic kidney disease guideline, 2025', full: 'Kidney Disease: Improving Global Outcomes (KDIGO) ADPKD Work Group. KDIGO 2025 clinical practice guideline for the evaluation, management, and treatment of autosomal dominant polycystic kidney disease (ADPKD). Kidney Int. 2025.', url: 'https://pubmed.ncbi.nlm.nih.gov/?term=KDIGO+2025+clinical+practice+guideline+autosomal+dominant+polycystic+kidney+disease' },
};

/* ---------- Family-history risk levels (My risks tab) ----------
   Which conditions are scored, the age that counts as "early" for each,
   and a short, general tip. Cancers are scored per kind. */
const RISK_TOPICS = [
  { key: 'heart', cond: 'heart', types: ['', 'attack', 'failure'], name: 'Heart disease', early: p => p.sex === 'F' ? 65 : 55, tip: 'Ask for a cholesterol check, stay active most days, and skip smoking and vaping.' },
  { key: 'diabetes', cond: 'diabetes', types: ['', 't2', 'gest'], name: 'Type 2 diabetes', early: () => 50, tip: 'Move every day, choose water over sugary drinks, and ask your doctor whether an A1C blood test makes sense.' },
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
  { key: 'inheritedheart', cond: 'heart', types: ['muscle', 'rhythm'], name: 'Inherited heart conditions', early: () => 50, tip: 'Heart muscle and heart rhythm conditions can run in families. Close relatives can be checked with an ECG and a heart ultrasound.' },
  { key: 't1d', cond: 'diabetes', types: ['t1'], name: 'Type 1 diabetes', early: () => 30, tip: 'Know the warning signs: being very thirsty, peeing a lot, and losing weight without trying. A blood test can show early signs in close relatives.' },
  { key: 'polyps', cond: 'polyps', name: 'Colon polyps', early: () => 60, tip: 'Polyps in a parent or sibling can mean starting colon cancer screening earlier.' },
  { key: 'liver', cond: 'liver', name: 'Liver disease and hepatitis', early: () => 50, tip: 'Hepatitis B can pass between family members. A simple blood test checks for it, and the vaccine protects you.' },
  { key: 'clots', cond: 'clots', name: 'Blood clots', early: () => 50, tip: 'Tell your doctor before starting birth control pills with estrogen, and before long flights or surgery.' },
  { key: 'ibd', cond: 'ibd', name: "Crohn's disease and colitis", early: () => 40, tip: 'Tell your doctor about lasting stomach pain, diarrhea or blood in the stool.' },
  { key: 'celiac', cond: 'celiac', name: 'Celiac disease', early: () => 40, tip: 'If you have stomach problems, tiredness or anemia, ask about a celiac blood test. Close relatives are often tested.' },
  { key: 'glaucoma', cond: 'glaucoma', name: 'Glaucoma', early: () => 60, tip: 'Glaucoma has no early symptoms. Tell your eye doctor, who may check your eye pressure sooner.' },
  { key: 'osteo', cond: 'osteo', name: 'Weak bones', early: () => 60, tip: 'Build strong bones now with calcium, vitamin D, and running or jumping exercise.' },
  { key: 'autoimmune', cond: 'autoimmune', name: 'Autoimmune diseases', early: () => 50, tip: 'Mention lasting joint pain, rashes or tiredness to your doctor.' },
  { key: 'substance', cond: 'substance', name: 'Alcohol and drug addiction', early: () => 30, tip: 'Addiction can run in families. Waiting to try alcohol, or not drinking at all, lowers your risk.' },
  { key: 'hearing', cond: 'hearing', name: 'Hearing loss', early: () => 18, tip: 'Ask for a hearing test if you notice trouble hearing, and protect your ears from loud music.' },
  { key: 'thyroidca', cond: 'cancer', types: ['thyroidca'], name: 'Thyroid cancer', early: () => 50, tip: 'Mention it at checkups. Some kinds of thyroid cancer run in families.' },
  { key: 'kidneyca', cond: 'cancer', types: ['kidneyca'], name: 'Kidney cancer', early: () => 50, tip: 'Kidney cancer before 50, or in more than one relative, is a reason to ask about genetic counseling.' },
  { key: 'headneck', cond: 'cancer', types: ['headneck', 'esophagus'], name: 'Mouth, throat and food-pipe cancer', early: () => 50, tip: "Never chew tobacco, gutka or paan, or smoke. They cause most of these cancers." },
  { key: 'sarcoma', cond: 'cancer', types: ['sarcoma', 'brain'], name: 'Sarcoma and brain tumors', early: () => 45, tip: 'These cancers at young ages in a family can be a reason for genetic counseling.' },
];
SOURCES.scheuner = { short: 'Scheuner et al., family history risk method, 1997', full: 'Scheuner MT, Wang SJ, Raffel LJ, Larabell SK, Rotter JI. Family history: a comprehensive genetic risk assessment method for the chronic conditions of adulthood. Am J Med Genet. 1997;71(3):315-324.', url: 'https://pubmed.ncbi.nlm.nih.gov/9268102/' };
SOURCES.healthware = { short: 'CDC Family Healthware, 2009', full: 'Yoon PW, Scheuner MT, Jorgensen C, Khoury MJ. Developing Family Healthware, a family history screening tool to prevent common chronic diseases. Prev Chronic Dis. 2009;6(1):A33.', url: 'https://www.cdc.gov/pcd/issues/2009/jan/08_0046.htm' };

/* ---------- Ancestry ----------
   Some guidelines treat ancestry as a risk factor on its own. Each rule says which ancestries it covers,
   which risk topic it raises, and its source. */
const ANCESTRIES = [
  { id: 'southasian', en: 'South Asian', hint: 'Indian, Pakistani, Bangladeshi, Sri Lankan, Nepali' },
  { id: 'eastasian', en: 'East Asian', hint: 'Chinese, Japanese, Korean' },
  { id: 'seasian', en: 'Southeast Asian', hint: 'Vietnamese, Filipino, Thai, and others' },
  { id: 'mena', en: 'Middle Eastern or North African' },
  { id: 'mediterranean', en: 'Mediterranean', hint: 'Greek, Italian, and others' },
  { id: 'black', en: 'Black or African', hint: 'including Caribbean' },
  { id: 'hispanic', en: 'Hispanic or Latino' },
  { id: 'white', en: 'White or European' },
  { id: 'ashkenazi', en: 'Ashkenazi Jewish' },
  { id: 'native', en: 'American Indian or Alaska Native' },
  { id: 'pacific', en: 'Native Hawaiian or Pacific Islander' },
];
const ANCESTRY_RULES = [
  { topic: 'heart', groups: ['southasian'], source: 'accaha', level: 'discuss', title: 'South Asian ancestry and heart disease',
    text: 'Heart guidelines count South Asian ancestry as a "risk-enhancing factor" by itself, because heart disease tends to start earlier in South Asian families. Ask your doctor to note it on your record.' },
  { topic: 'diabetes', groups: ['southasian', 'eastasian', 'seasian', 'black', 'hispanic', 'native', 'pacific'], source: 'ada', level: 'discuss', title: 'Ancestry and type 2 diabetes',
    text: 'The ADA lists this ancestry as a risk factor when deciding who to test for type 2 diabetes. For Asian American adults, testing starts at a lower weight (BMI 23 instead of 25).' },
  { topic: 'blood', groups: ['southasian', 'seasian', 'eastasian', 'mena', 'mediterranean', 'black'], source: 'acog', level: 'note', title: 'Thalassemia and sickle cell trait',
    text: 'Carrying thalassemia or sickle cell trait is more common with this ancestry. It usually causes no symptoms but matters for future children. A routine blood count, and a hemoglobin test if needed, can check.' },
  { topic: 'breast', groups: ['ashkenazi'], source: 'uspstfBrca', level: 'discuss', title: 'Ashkenazi Jewish ancestry and BRCA',
    text: 'About 1 in 40 people of Ashkenazi Jewish ancestry carries a BRCA1 or BRCA2 change. The USPSTF lists this ancestry as a reason for a breast and ovarian cancer risk assessment.' },
  { topic: 'ovarian', groups: ['ashkenazi'], source: 'uspstfBrca', level: 'discuss', title: 'Ashkenazi Jewish ancestry and BRCA',
    text: 'BRCA changes linked to Ashkenazi Jewish ancestry also raise ovarian cancer risk.' },
  { topic: 'prostate', groups: ['black'], source: 'acsProstate', level: 'discuss', title: 'Ancestry and prostate cancer',
    text: 'Prostate cancer is more common and starts earlier in Black men. The American Cancer Society suggests talking about screening from age 45.' },
];
SOURCES.acog = { short: 'ACOG carrier screening, 2017', full: 'American College of Obstetricians and Gynecologists. Committee Opinion No. 691: Carrier screening for genetic conditions. Obstet Gynecol. 2017;129:e41-e55.', url: 'https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2017/03/carrier-screening-for-genetic-conditions' };

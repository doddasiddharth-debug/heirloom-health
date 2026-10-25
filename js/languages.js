// Seven more interview languages: Tamil, Kannada, Bengali, Gujarati, Urdu, Chinese (Simplified), Vietnamese.
//
// IMPORTANT: these translations and word lists were drafted for the prototype. They have NOT been
// checked by native speakers. Each language must be reviewed by a fluent speaker (ideally one who
// knows how elders in that community talk about health) before the app is used with real families.
//
// Loads after content.js and before the app. It only adds to the globals content.js declares.
// Format below: each language is [native text, easy pronunciation line] when the app shows a
// pronunciation line (roman: true), or just the text for Vietnamese (written in Latin script).
'use strict';

(() => {
  LANGS.push(
    { id: 'ta', label: 'தமிழ் · Tamil', speech: 'ta-IN', roman: true, dir: 'ltr', font: 'Noto Sans Tamil' },
    { id: 'kn', label: 'ಕನ್ನಡ · Kannada', speech: 'kn-IN', roman: true, dir: 'ltr', font: 'Noto Sans Kannada' },
    { id: 'bn', label: 'বাংলা · Bengali', speech: 'bn-IN', roman: true, dir: 'ltr', font: 'Noto Sans Bengali' },
    { id: 'gu', label: 'ગુજરાતી · Gujarati', speech: 'gu-IN', roman: true, dir: 'ltr', font: 'Noto Sans Gujarati' },
    { id: 'ur', label: 'اردو · Urdu', speech: 'ur-IN', roman: true, dir: 'rtl', font: 'Noto Nastaliq Urdu' },
    { id: 'zh', label: '中文（简体） · Chinese (Simplified)', speech: 'zh-CN', roman: true, dir: 'ltr', font: 'Noto Sans SC' },
    { id: 'vi', label: 'Tiếng Việt · Vietnamese', speech: 'vi-VN', roman: false, dir: 'ltr', font: null },
  );

  // Copy { ta: [text, roman], ..., vi: text } onto a content.js entry as ta / ta_r / ... / vi.
  function put(target, data) {
    for (const [lang, v] of Object.entries(data)) {
      if (Array.isArray(v)) { target[lang] = v[0]; target[lang + '_r'] = v[1]; } else target[lang] = v;
    }
  }

  /* ---------- Interview script ---------- */
  const QT = {
    intro: {
      ta: ['நான் என் டாக்டரிடம் காட்டுவதற்காக நம் குடும்பத்தின் உடல்நல வரலாற்றைத் தயாரிக்கிறேன். உங்கள் உடல்நலம் பற்றியும் நம் குடும்பம் பற்றியும் சில கேள்விகள் கேட்கலாமா? எந்தக் கேள்வியை வேண்டுமானாலும் நீங்கள் விட்டுவிடலாம்.',
        'Naan en doctor-idam kaattuvadharkaaga nam kudumbatthin udalnala varalaatrai thayaarikkiren. Ungal udalnalam patriyum nam kudumbam patriyum sila kelvigal ketkalaamaa? Endha kelviyai vendumaanaalum neengal vittuvidalaam.'],
      kn: ['ನನ್ನ ಡಾಕ್ಟರ್‌ಗೆ ತೋರಿಸಲು ನಾನು ನಮ್ಮ ಕುಟುಂಬದ ಆರೋಗ್ಯ ಇತಿಹಾಸವನ್ನು ತಯಾರಿಸುತ್ತಿದ್ದೇನೆ. ನಿಮ್ಮ ಆರೋಗ್ಯ ಮತ್ತು ನಮ್ಮ ಕುಟುಂಬದ ಬಗ್ಗೆ ಕೆಲವು ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳಬಹುದೇ? ನೀವು ಯಾವ ಪ್ರಶ್ನೆಯನ್ನಾದರೂ ಬಿಟ್ಟುಬಿಡಬಹುದು.',
        'Nanna doctor-ge torisalu naanu namma kutumbada aarogya itihaasavannu tayaarisuttiddene. Nimma aarogya mattu namma kutumbada bagge kelavu prashnegalannu kelabahude? Neevu yaava prashneyannaadaroo bittubidabahudu.'],
      bn: ['আমি আমার ডাক্তারকে দেখানোর জন্য আমাদের পরিবারের স্বাস্থ্যের ইতিহাস তৈরি করছি। আপনার স্বাস্থ্য আর আমাদের পরিবার নিয়ে আপনাকে কয়েকটা প্রশ্ন করতে পারি? আপনি যেকোনো প্রশ্ন বাদ দিতে পারেন।',
        'Aami aamaar daktaar-ke dekhaanor jonno aamaader poribaarer shaasthyer itihaash toiri korchhi. Aapnaar shaasthyo aar aamaader poribaar niye aapnaake koyekta proshno korte paari? Aapni jekono proshno baad dite paaren.'],
      gu: ['હું મારા ડૉક્ટરને બતાવવા માટે આપણા કુટુંબનો આરોગ્ય ઇતિહાસ બનાવી રહ્યો/રહી છું. શું હું આપને આપના આરોગ્ય અને આપણા કુટુંબ વિશે થોડા પ્રશ્નો પૂછી શકું? આપ કોઈ પણ પ્રશ્ન છોડી શકો છો.',
        'Hun maaraa doctor-ne bataavvaa maate aapanaa kutumbno aarogya itihaas banaavi rahyo/rahi chhun. Shun hun aapne aapnaa aarogya ane aapanaa kutumb vishe thodaa prashno poochhi shakun? Aap koi pan prashna chhodi shako chho.'],
      ur: ['میں اپنے ڈاکٹر کو دکھانے کے لیے ہمارے خاندان کی صحت کی تاریخ بنا رہا/رہی ہوں۔ کیا میں آپ سے آپ کی صحت اور ہمارے خاندان کے بارے میں کچھ سوال پوچھ سکتا/سکتی ہوں؟ آپ کوئی بھی سوال چھوڑ سکتے ہیں۔',
        'Main apne doctor ko dikhaane ke liye hamaare khaandaan ki sehat ki taareekh bana raha/rahi hoon. Kya main aap se aap ki sehat aur hamaare khaandaan ke baare mein kuchh sawaal poochh sakta/sakti hoon? Aap koi bhi sawaal chhod sakte hain.'],
      zh: ['我在整理我们家的健康史，想拿给我的医生看。我可以问您一些关于您的健康和我们家的问题吗？任何问题您都可以跳过。',
        'Wǒ zài zhěnglǐ wǒmen jiā de jiànkāng shǐ, xiǎng ná gěi wǒ de yīshēng kàn. Wǒ kěyǐ wèn nín yìxiē guānyú nín de jiànkāng hé wǒmen jiā de wèntí ma? Rènhé wèntí nín dōu kěyǐ tiàoguò.'],
      vi: 'Cháu đang làm bản tiền sử sức khỏe của gia đình mình để đưa cho bác sĩ của cháu xem. Cháu hỏi ông/bà vài câu về sức khỏe của ông/bà và về gia đình mình được không ạ? Ông/bà có thể bỏ qua bất kỳ câu nào.',
    },
    born: {
      ta: ['நீங்கள் எந்த வருடம் பிறந்தீர்கள்?', 'Neengal endha varudam pirandheergal?'],
      kn: ['ನೀವು ಯಾವ ವರ್ಷದಲ್ಲಿ ಹುಟ್ಟಿದಿರಿ?', 'Neevu yaava varshadalli huttidiri?'],
      bn: ['আপনি কোন সালে জন্মেছিলেন?', 'Aapni kon saale jonmechhilen?'],
      gu: ['આપનો જન્મ કયા વર્ષમાં થયો હતો?', 'Aapno janma kayaa varshmaan thayo hato?'],
      ur: ['آپ کس سال میں پیدا ہوئے تھے؟', 'Aap kis saal mein paida hue the?'],
      zh: ['您是哪一年出生的？', 'Nín shì nǎ yì nián chūshēng de?'],
      vi: 'Ông/bà sinh năm nào ạ?',
    },
    conds_self: {
      ta: ['இந்த நோய்களில் ஏதாவது உங்களுக்கு இருக்கிறது என்று எப்போதாவது டாக்டர் சொல்லியிருக்கிறாரா? நான் ஒவ்வொன்றாகப் படிக்கிறேன். அது தெரிய வந்தபோது உங்களுக்கு என்ன வயது?',
        'Indha noigalil edhaavadhu ungalukku irukkiradhu endru eppodhaavadhu doctor solliyirukkiraaraa? Naan ovvondraaga padikkiren. Adhu theriya vandhapodhu ungalukku enna vayadhu?'],
      kn: ['ಈ ಕಾಯಿಲೆಗಳಲ್ಲಿ ಯಾವುದಾದರೂ ನಿಮಗೆ ಇದೆ ಎಂದು ಡಾಕ್ಟರ್ ಎಂದಾದರೂ ಹೇಳಿದ್ದಾರಾ? ನಾನು ಒಂದೊಂದಾಗಿ ಓದುತ್ತೇನೆ. ಅದು ಗೊತ್ತಾದಾಗ ನಿಮ್ಮ ವಯಸ್ಸು ಎಷ್ಟು ಆಗಿತ್ತು?',
        'Ee kaayilegalalli yaavudaadaroo nimage ide endu doctor endaadaroo heliddaaraa? Naanu ondondaagi oduttene. Adu gottaadaaga nimma vayassu eshtu aagittu?'],
      bn: ['কোনো ডাক্তার কি কখনো আপনাকে বলেছেন যে আপনার এই অসুখগুলোর কোনোটা আছে? আমি একটা একটা করে পড়ব। যখন জানতে পারলেন, তখন আপনার বয়স কত ছিল?',
        'Kono daktaar ki kokhono aapnaake bolechhen je aapnaar ei oshukhgulor konota aachhe? Aami ekta ekta kore porbo. Jokhon jaante paarlen, tokhon aapnaar boyosh koto chhilo?'],
      gu: ['શું કોઈ ડૉક્ટરે ક્યારેય આપને કહ્યું છે કે આપને આમાંથી કોઈ બીમારી છે? હું એક પછી એક વાંચીશ. જ્યારે ખબર પડી ત્યારે આપની ઉંમર કેટલી હતી?',
        'Shun koi doctor-e kyaarey aapne kahyun chhe ke aapne aamaanthi koi beemaari chhe? Hun ek pachhi ek vaanchish. Jyaare khabar padi tyaare aapni ummar ketli hati?'],
      ur: ['کیا کسی ڈاکٹر نے کبھی آپ کو بتایا ہے کہ آپ کو ان میں سے کوئی بیماری ہے؟ میں ایک ایک کر کے پڑھوں گا/گی۔ جب پتہ چلا، تب آپ کی عمر کتنی تھی؟',
        'Kya kisi doctor ne kabhi aap ko bataaya hai ke aap ko in mein se koi beemaari hai? Main ek ek kar ke padhoonga/padhoongi. Jab pata chala, tab aap ki umar kitni thi?'],
      zh: ['有没有医生跟您说过，您有下面这些病当中的任何一种？我一个一个念给您听。知道的时候您多大年纪？',
        'Yǒu méiyǒu yīshēng gēn nín shuō guo, nín yǒu xiàmiàn zhèxiē bìng dāngzhōng de rènhé yì zhǒng? Wǒ yí gè yí gè niàn gěi nín tīng. Zhīdào de shíhou nín duō dà niánjì?'],
      vi: 'Có bác sĩ nào từng nói ông/bà bị một trong những bệnh này không ạ? Cháu sẽ đọc từng bệnh một. Lúc phát hiện ra, ông/bà bao nhiêu tuổi ạ?',
    },
    other_self: {
      ta: ['வேறு ஏதாவது உடல்நலப் பிரச்சினைகள், அறுவை சிகிச்சைகள் (ஆபரேஷன்), அல்லது தினமும் சாப்பிடும் மருந்துகள் உங்களுக்கு இருக்கின்றனவா?',
        'Veru edhaavadhu udalnala prachchinaigal, aruvai sigichchaigal (operation), alladhu dhinamum saappidum marundhugal ungalukku irukkindranavaa?'],
      kn: ['ಬೇರೆ ಏನಾದರೂ ಆರೋಗ್ಯ ಸಮಸ್ಯೆಗಳು, ಆಪರೇಷನ್‌ಗಳು, ಅಥವಾ ನೀವು ಪ್ರತಿದಿನ ತೆಗೆದುಕೊಳ್ಳುವ ಔಷಧಿಗಳು ಇವೆಯೇ?',
        'Bere enaadaroo aarogya samasyegalu, operation-galu, athavaa neevu pratidina tegedukolluva aushadhigalu iveye?'],
      bn: ['আপনার কি আর কোনো স্বাস্থ্য সমস্যা, অপারেশন, বা রোজ খাওয়ার কোনো ওষুধ আছে?',
        'Aapnaar ki aar kono shaasthyo shomoshsha, operation, ba roj khaawaar kono oshudh aachhe?'],
      gu: ['શું આપને બીજી કોઈ આરોગ્યની તકલીફ, ઓપરેશન, કે રોજ લેવાની દવાઓ છે?',
        'Shun aapne beeji koi aarogyani takleef, operation, ke roj levaani davaao chhe?'],
      ur: ['کیا آپ کو کوئی اور صحت کا مسئلہ ہے، کوئی آپریشن ہوا ہے، یا کوئی دوائیں ہیں جو آپ روز لیتے ہیں؟',
        'Kya aap ko koi aur sehat ka masla hai, koi operation hua hai, ya koi dawaaiyan hain jo aap roz lete hain?'],
      zh: ['您还有没有其他健康问题、做过的手术，或者每天吃的药？',
        'Nín hái yǒu méiyǒu qítā jiànkāng wèntí, zuò guo de shǒushù, huòzhě měitiān chī de yào?'],
      vi: 'Ông/bà còn bệnh gì khác, đã từng mổ, hoặc có thuốc nào uống hằng ngày không ạ?',
    },
    mother_alive: {
      ta: ['உங்கள் அம்மா இன்னும் இருக்கிறார்களா? இல்லையென்றால், அவர்கள் எந்த வயதில் காலமானார்கள், என்ன காரணம்?',
        'Ungal amma innum irukkiraargalaa? Illaiyendraal, avargal endha vayadhil kaalamaanaargal, enna kaaranam?'],
      kn: ['ನಿಮ್ಮ ತಾಯಿಯವರು ಇನ್ನೂ ಇದ್ದಾರಾ? ಇಲ್ಲದಿದ್ದರೆ, ಅವರು ಯಾವ ವಯಸ್ಸಿನಲ್ಲಿ ತೀರಿಕೊಂಡರು, ಕಾರಣ ಏನು?',
        'Nimma taayiyavaru innoo iddaaraa? Illadiddare, avaru yaava vayassinalli teerikondaru, kaarana enu?'],
      bn: ['আপনার মা কি এখনও বেঁচে আছেন? না থাকলে, কত বছর বয়সে মারা গেছেন, আর কী কারণে?',
        'Aapnaar maa ki ekhono benche aachhen? Na thaakle, koto bochhor boyoshe maara gechhen, aar ki kaarone?'],
      gu: ['શું આપનાં માતાજી હજી હયાત છે? જો નહીં, તો કઈ ઉંમરે તેમનું અવસાન થયું, અને કયા કારણે?',
        'Shun aapnaan maataaji haji hayaat chhe? Jo nahin, to kai ummare temnun avsaan thayun, ane kayaa kaarane?'],
      ur: ['کیا آپ کی والدہ حیات ہیں؟ اگر نہیں، تو کس عمر میں اور کس وجہ سے ان کا انتقال ہوا؟',
        'Kya aap ki waalida hayaat hain? Agar nahin, to kis umar mein aur kis wajah se un ka intiqaal hua?'],
      zh: ['您的母亲还健在吗？如果已经去世，她去世时多大年纪，是什么原因？',
        'Nín de mǔqīn hái jiànzài ma? Rúguǒ yǐjīng qùshì, tā qùshì shí duō dà niánjì, shì shénme yuányīn?'],
      vi: 'Mẹ của ông/bà còn sống không ạ? Nếu không, cụ mất năm bao nhiêu tuổi, và vì nguyên nhân gì ạ?',
    },
    mother_cond: {
      ta: ['உங்கள் அம்மாவுக்கு இந்த நோய்களில் ஏதாவது இருந்ததா? அப்போது அவர்களுக்கு என்ன வயது என்று நினைவிருக்கிறதா?',
        'Ungal ammaavukku indha noigalil edhaavadhu irundhadhaa? Appodhu avargalukku enna vayadhu endru ninaivirukkiradhaa?'],
      kn: ['ನಿಮ್ಮ ತಾಯಿಯವರಿಗೆ ಈ ಕಾಯಿಲೆಗಳಲ್ಲಿ ಯಾವುದಾದರೂ ಇತ್ತೇ? ಆಗ ಅವರ ವಯಸ್ಸು ಎಷ್ಟು ಎಂದು ನೆನಪಿದೆಯೇ?',
        'Nimma taayiyavarige ee kaayilegalalli yaavudaadaroo itte? Aaga avara vayassu eshtu endu nenapideye?'],
      bn: ['আপনার মায়ের কি এই অসুখগুলোর কোনোটা ছিল? তখন ওনার বয়স কত ছিল, মনে আছে?',
        'Aapnaar maayer ki ei oshukhgulor konota chhilo? Tokhon onaar boyosh koto chhilo, mone aachhe?'],
      gu: ['શું આપનાં માતાજીને આમાંથી કોઈ બીમારી હતી? ત્યારે તેમની ઉંમર કેટલી હતી, યાદ છે?',
        'Shun aapnaan maataajine aamaanthi koi beemaari hati? Tyaare temni ummar ketli hati, yaad chhe?'],
      ur: ['کیا آپ کی والدہ کو ان میں سے کوئی بیماری تھی؟ کیا یاد ہے کہ تب ان کی عمر کتنی تھی؟',
        'Kya aap ki waalida ko in mein se koi beemaari thi? Kya yaad hai ke tab un ki umar kitni thi?'],
      zh: ['您的母亲得过这些病中的任何一种吗？您记得她当时多大年纪吗？',
        'Nín de mǔqīn dé guo zhèxiē bìng zhōng de rènhé yì zhǒng ma? Nín jìde tā dāngshí duō dà niánjì ma?'],
      vi: 'Mẹ của ông/bà có bị bệnh nào trong những bệnh này không ạ? Ông/bà có nhớ lúc đó cụ bao nhiêu tuổi không ạ?',
    },
    father_alive: {
      ta: ['உங்கள் அப்பா இன்னும் இருக்கிறார்களா? இல்லையென்றால், அவர்கள் எந்த வயதில் காலமானார்கள், என்ன காரணம்?',
        'Ungal appa innum irukkiraargalaa? Illaiyendraal, avargal endha vayadhil kaalamaanaargal, enna kaaranam?'],
      kn: ['ನಿಮ್ಮ ತಂದೆಯವರು ಇನ್ನೂ ಇದ್ದಾರಾ? ಇಲ್ಲದಿದ್ದರೆ, ಅವರು ಯಾವ ವಯಸ್ಸಿನಲ್ಲಿ ತೀರಿಕೊಂಡರು, ಕಾರಣ ಏನು?',
        'Nimma tandeyavaru innoo iddaaraa? Illadiddare, avaru yaava vayassinalli teerikondaru, kaarana enu?'],
      bn: ['আপনার বাবা কি এখনও বেঁচে আছেন? না থাকলে, কত বছর বয়সে মারা গেছেন, আর কী কারণে?',
        'Aapnaar baabaa ki ekhono benche aachhen? Na thaakle, koto bochhor boyoshe maara gechhen, aar ki kaarone?'],
      gu: ['શું આપના પિતાજી હજી હયાત છે? જો નહીં, તો કઈ ઉંમરે તેમનું અવસાન થયું, અને કયા કારણે?',
        'Shun aapnaa pitaaji haji hayaat chhe? Jo nahin, to kai ummare temnun avsaan thayun, ane kayaa kaarane?'],
      ur: ['کیا آپ کے والد صاحب حیات ہیں؟ اگر نہیں، تو کس عمر میں اور کس وجہ سے ان کا انتقال ہوا؟',
        'Kya aap ke waalid sahib hayaat hain? Agar nahin, to kis umar mein aur kis wajah se un ka intiqaal hua?'],
      zh: ['您的父亲还健在吗？如果已经去世，他去世时多大年纪，是什么原因？',
        'Nín de fùqīn hái jiànzài ma? Rúguǒ yǐjīng qùshì, tā qùshì shí duō dà niánjì, shì shénme yuányīn?'],
      vi: 'Bố của ông/bà còn sống không ạ? Nếu không, cụ mất năm bao nhiêu tuổi, và vì nguyên nhân gì ạ?',
    },
    father_cond: {
      ta: ['உங்கள் அப்பாவுக்கு இந்த நோய்களில் ஏதாவது இருந்ததா? அப்போது அவர்களுக்கு என்ன வயது என்று நினைவிருக்கிறதா?',
        'Ungal appaavukku indha noigalil edhaavadhu irundhadhaa? Appodhu avargalukku enna vayadhu endru ninaivirukkiradhaa?'],
      kn: ['ನಿಮ್ಮ ತಂದೆಯವರಿಗೆ ಈ ಕಾಯಿಲೆಗಳಲ್ಲಿ ಯಾವುದಾದರೂ ಇತ್ತೇ? ಆಗ ಅವರ ವಯಸ್ಸು ಎಷ್ಟು ಎಂದು ನೆನಪಿದೆಯೇ?',
        'Nimma tandeyavarige ee kaayilegalalli yaavudaadaroo itte? Aaga avara vayassu eshtu endu nenapideye?'],
      bn: ['আপনার বাবার কি এই অসুখগুলোর কোনোটা ছিল? তখন ওনার বয়স কত ছিল, মনে আছে?',
        'Aapnaar baabaar ki ei oshukhgulor konota chhilo? Tokhon onaar boyosh koto chhilo, mone aachhe?'],
      gu: ['શું આપના પિતાજીને આમાંથી કોઈ બીમારી હતી? ત્યારે તેમની ઉંમર કેટલી હતી, યાદ છે?',
        'Shun aapnaa pitaajine aamaanthi koi beemaari hati? Tyaare temni ummar ketli hati, yaad chhe?'],
      ur: ['کیا آپ کے والد صاحب کو ان میں سے کوئی بیماری تھی؟ کیا یاد ہے کہ تب ان کی عمر کتنی تھی؟',
        'Kya aap ke waalid sahib ko in mein se koi beemaari thi? Kya yaad hai ke tab un ki umar kitni thi?'],
      zh: ['您的父亲得过这些病中的任何一种吗？您记得他当时多大年纪吗？',
        'Nín de fùqīn dé guo zhèxiē bìng zhōng de rènhé yì zhǒng ma? Nín jìde tā dāngshí duō dà niánjì ma?'],
      vi: 'Bố của ông/bà có bị bệnh nào trong những bệnh này không ạ? Ông/bà có nhớ lúc đó cụ bao nhiêu tuổi không ạ?',
    },
    siblings: {
      ta: ['உங்கள் அண்ணன் தம்பிகள், அக்கா தங்கைகளில் யாருக்காவது பெரிய உடல்நலப் பிரச்சினைகள் இருந்தனவா, அல்லது யாராவது சின்ன வயதிலேயே இறந்துவிட்டார்களா?',
        'Ungal annan thambigal, akkaa thangaigalil yaarukkaavadhu periya udalnala prachchinaigal irundhanavaa, alladhu yaaraavadhu chinna vayadhileye irandhuvittaargalaa?'],
      kn: ['ನಿಮ್ಮ ಅಣ್ಣ-ತಮ್ಮಂದಿರು, ಅಕ್ಕ-ತಂಗಿಯರಲ್ಲಿ ಯಾರಿಗಾದರೂ ಗಂಭೀರ ಆರೋಗ್ಯ ಸಮಸ್ಯೆಗಳು ಇದ್ದವೇ, ಅಥವಾ ಯಾರಾದರೂ ಚಿಕ್ಕ ವಯಸ್ಸಿನಲ್ಲೇ ತೀರಿಕೊಂಡರೇ?',
        'Nimma anna-tammandiru, akka-tangiyaralli yaarigaadaroo gambheera aarogya samasyegalu iddave, athavaa yaaraadaroo chikka vayassinalle teerikondare?'],
      bn: ['আপনার ভাই-বোনদের মধ্যে কারও কি কোনো গুরুতর স্বাস্থ্য সমস্যা ছিল, বা কেউ কি অল্প বয়সে মারা গেছেন?',
        'Aapnaar bhai-bonder moddhe kaaro ki kono gurutoro shaasthyo shomoshsha chhilo, ba keu ki olpo boyoshe maara gechhen?'],
      gu: ['શું આપનાં ભાઈ-બહેનોમાંથી કોઈને ગંભીર આરોગ્યની તકલીફ હતી, કે કોઈનું નાની ઉંમરે અવસાન થયું હતું?',
        'Shun aapnaan bhai-behenomaanthi koine gambhir aarogyani takleef hati, ke koinun naani ummare avsaan thayun hatun?'],
      ur: ['کیا آپ کے کسی بھائی یا بہن کو کوئی سنگین صحت کا مسئلہ تھا، یا کسی کا کم عمری میں انتقال ہوا؟',
        'Kya aap ke kisi bhai ya behen ko koi sangeen sehat ka masla tha, ya kisi ka kam umri mein intiqaal hua?'],
      zh: ['您的兄弟姐妹中，有没有人得过严重的病，或者年纪轻轻就去世了？',
        'Nín de xiōngdì jiěmèi zhōng, yǒu méiyǒu rén dé guo yánzhòng de bìng, huòzhě niánjì qīngqīng jiù qùshì le?'],
      vi: 'Trong số anh chị em của ông/bà, có ai bị bệnh nặng, hoặc mất sớm khi còn trẻ không ạ?',
    },
    closing: {
      ta: ['மிக்க நன்றி. இது என் உடல்நலத்தைக் கவனித்துக்கொள்ள எனக்கும் என் டாக்டருக்கும் உதவும்.',
        'Mikka nandri. Idhu en udalnalatthai kavanitthukkolla enakkum en doctor-ukkum udhavum.'],
      kn: ['ತುಂಬಾ ಧನ್ಯವಾದಗಳು. ಇದು ನನ್ನ ಆರೋಗ್ಯವನ್ನು ನೋಡಿಕೊಳ್ಳಲು ನನಗೂ ನನ್ನ ಡಾಕ್ಟರ್‌ಗೂ ಸಹಾಯ ಮಾಡುತ್ತದೆ.',
        'Tumbaa dhanyavaadagalu. Idu nanna aarogyavannu nodikollalu nanagoo nanna doctor-goo sahaaya maaduttade.'],
      bn: ['অনেক ধন্যবাদ। এটা আমার স্বাস্থ্যের যত্ন নিতে আমাকে আর আমার ডাক্তারকে সাহায্য করবে।',
        'Onek dhonnobaad. Eta aamaar shaasthyer jotno nite aamaake aar aamaar daktaar-ke shaahajjo korbe.'],
      gu: ['ખૂબ ખૂબ આભાર. આનાથી મને અને મારા ડૉક્ટરને મારા આરોગ્યની સંભાળ રાખવામાં મદદ મળશે.',
        'Khoob khoob aabhaar. Aanaathi mane ane maaraa doctor-ne maaraa aarogyani sambhaal raakhvaamaan madad malshe.'],
      ur: ['بہت بہت شکریہ۔ اس سے مجھے اور میرے ڈاکٹر کو میری صحت کا خیال رکھنے میں مدد ملے گی۔',
        'Bahut bahut shukriya. Is se mujhe aur mere doctor ko meri sehat ka khayaal rakhne mein madad milegi.'],
      zh: ['非常感谢您。这会帮助我和我的医生照顾好我的健康。',
        'Fēicháng gǎnxiè nín. Zhè huì bāngzhù wǒ hé wǒ de yīshēng zhàogù hǎo wǒ de jiànkāng.'],
      vi: 'Cháu cảm ơn ông/bà rất nhiều. Điều này sẽ giúp cháu và bác sĩ chăm sóc sức khỏe của cháu.',
    },
  };

  /* ---------- Follow-up questions ---------- */
  const FT = {
    cancer_type: {
      ta: ['அது எந்த வகைப் புற்றுநோய்? உடலில் எங்கே தொடங்கியது?', 'Adhu endha vagai putrunoi? Udalil enge thodangiyadhu?'],
      kn: ['ಅದು ಯಾವ ರೀತಿಯ ಕ್ಯಾನ್ಸರ್? ದೇಹದಲ್ಲಿ ಎಲ್ಲಿ ಶುರುವಾಯಿತು?', 'Adu yaava reetiya cancer? Dehadalli elli shuruvaayitu?'],
      bn: ['ওটা কী ধরনের ক্যান্সার ছিল? শরীরের কোথায় শুরু হয়েছিল?', 'Ota ki dhoroner cancer chhilo? Shorirer kothaay shuru hoyechhilo?'],
      gu: ['એ કયા પ્રકારનું કેન્સર હતું? શરીરમાં ક્યાંથી શરૂ થયું હતું?', 'E kayaa prakaarnun cancer hatun? Shareermaan kyaanthi sharoo thayun hatun?'],
      ur: ['وہ کس قسم کا کینسر تھا؟ جسم میں کہاں سے شروع ہوا تھا؟', 'Woh kis qism ka cancer tha? Jism mein kahaan se shuroo hua tha?'],
      zh: ['是哪一种癌症？是从身体哪个部位开始的？', 'Shì nǎ yì zhǒng áizhèng? Shì cóng shēntǐ nǎge bùwèi kāishǐ de?'],
      vi: 'Đó là loại ung thư gì ạ? Bắt đầu ở chỗ nào trong cơ thể ạ?',
    },
    age_you: {
      ta: ['இது கண்டுபிடிக்கப்பட்டபோது உங்களுக்குச் சுமார் என்ன வயது?', 'Idhu kandupidikkappattapodhu ungalukku sumaar enna vayadhu?'],
      kn: ['ಇದು ಪತ್ತೆಯಾದಾಗ ನಿಮ್ಮ ವಯಸ್ಸು ಸುಮಾರು ಎಷ್ಟು?', 'Idu patteyaadaaga nimma vayassu sumaaru eshtu?'],
      bn: ['এটা যখন ধরা পড়ে, তখন আপনার বয়স মোটামুটি কত ছিল?', 'Eta jokhon dhora pore, tokhon aapnaar boyosh motamuti koto chhilo?'],
      gu: ['આ ખબર પડી ત્યારે આપની ઉંમર આશરે કેટલી હતી?', 'Aa khabar padi tyaare aapni ummar aashare ketli hati?'],
      ur: ['جب یہ پتہ چلا تب آپ کی عمر تقریباً کتنی تھی؟', 'Jab yeh pata chala tab aap ki umar taqreeban kitni thi?'],
      zh: ['发现这个病的时候，您大概多大年纪？', 'Fāxiàn zhège bìng de shíhou, nín dàgài duō dà niánjì?'],
      vi: 'Lúc phát hiện bệnh này, ông/bà khoảng bao nhiêu tuổi ạ?',
    },
    age_them: {
      ta: ['இது கண்டுபிடிக்கப்பட்டபோது அவர்களுக்குச் சுமார் என்ன வயது என்று நினைவிருக்கிறதா?', 'Idhu kandupidikkappattapodhu avargalukku sumaar enna vayadhu endru ninaivirukkiradhaa?'],
      kn: ['ಇದು ಪತ್ತೆಯಾದಾಗ ಅವರ ವಯಸ್ಸು ಸುಮಾರು ಎಷ್ಟಿತ್ತು ಎಂದು ನೆನಪಿದೆಯೇ?', 'Idu patteyaadaaga avara vayassu sumaaru eshtittu endu nenapideye?'],
      bn: ['এটা যখন ধরা পড়ে, তখন ওনার বয়স মোটামুটি কত ছিল, মনে আছে?', 'Eta jokhon dhora pore, tokhon onaar boyosh motamuti koto chhilo, mone aachhe?'],
      gu: ['આ ખબર પડી ત્યારે તેમની ઉંમર આશરે કેટલી હતી, યાદ છે?', 'Aa khabar padi tyaare temni ummar aashare ketli hati, yaad chhe?'],
      ur: ['کیا یاد ہے، جب یہ پتہ چلا تب ان کی عمر تقریباً کتنی تھی؟', 'Kya yaad hai, jab yeh pata chala tab un ki umar taqreeban kitni thi?'],
      zh: ['您记得发现这个病的时候，他/她大概多大年纪吗？', 'Nín jìde fāxiàn zhège bìng de shíhou, tā dàgài duō dà niánjì ma?'],
      vi: 'Ông/bà có nhớ lúc phát hiện bệnh này, người đó khoảng bao nhiêu tuổi không ạ?',
    },
    death_cause: {
      ta: ['அவர்கள் எப்படிக் காலமானார்கள் என்று தெரியுமா? திடீரென்றா, அல்லது ஏதாவது நோய்க்குப் பிறகா?', 'Avargal eppadi kaalamaanaargal endru theriyumaa? Thideerendraa, alladhu edhaavadhu noikku piragaa?'],
      kn: ['ಅವರು ಹೇಗೆ ತೀರಿಕೊಂಡರು ಎಂದು ಗೊತ್ತೇ? ಇದ್ದಕ್ಕಿದ್ದಂತೆಯೇ, ಅಥವಾ ಯಾವುದಾದರೂ ಕಾಯಿಲೆಯ ನಂತರವೇ?', 'Avaru hege teerikondaru endu gotte? Iddakkiddanteye, athavaa yaavudaadaroo kaayileya nantarave?'],
      bn: ['উনি কীভাবে মারা গেছেন জানেন? হঠাৎ, নাকি কোনো অসুখের পরে?', 'Uni kibhaabe maara gechhen jaanen? Hothaat, naaki kono oshukher pore?'],
      gu: ['તેમનું અવસાન કેવી રીતે થયું તે આપને ખબર છે? અચાનક, કે કોઈ બીમારી પછી?', 'Temnun avsaan kevi reete thayun te aapne khabar chhe? Achaanak, ke koi beemaari pachhi?'],
      ur: ['کیا آپ کو معلوم ہے ان کا انتقال کیسے ہوا؟ اچانک، یا کسی بیماری کے بعد؟', 'Kya aap ko maaloom hai un ka intiqaal kaise hua? Achaanak, ya kisi beemaari ke baad?'],
      zh: ['您知道他/她是怎么去世的吗？是突然走的，还是生病以后？', 'Nín zhīdào tā shì zěnme qùshì de ma? Shì tūrán zǒu de, háishi shēngbìng yǐhòu?'],
      vi: 'Ông/bà có biết người đó mất như thế nào không ạ? Đột ngột, hay sau khi bị bệnh ạ?',
    },
    death_age: {
      ta: ['அவர்கள் காலமானபோது சுமார் என்ன வயது?', 'Avargal kaalamaanapodhu sumaar enna vayadhu?'],
      kn: ['ಅವರು ತೀರಿಕೊಂಡಾಗ ಸುಮಾರು ಎಷ್ಟು ವಯಸ್ಸಾಗಿತ್ತು?', 'Avaru teerikondaaga sumaaru eshtu vayassaagittu?'],
      bn: ['মারা যাওয়ার সময় ওনার বয়স মোটামুটি কত ছিল?', 'Maara jaawaar shomoy onaar boyosh motamuti koto chhilo?'],
      gu: ['અવસાન વખતે તેમની ઉંમર આશરે કેટલી હતી?', 'Avsaan vakhte temni ummar aashare ketli hati?'],
      ur: ['انتقال کے وقت ان کی عمر تقریباً کتنی تھی؟', 'Intiqaal ke waqt un ki umar taqreeban kitni thi?'],
      zh: ['他/她去世的时候大概多大年纪？', 'Tā qùshì de shíhou dàgài duō dà niánjì?'],
      vi: 'Lúc mất, người đó khoảng bao nhiêu tuổi ạ?',
    },
  };

  /* ---------- Elder mode: short phrases ---------- */
  const ET = {
    yes: { ta: ['ஆமாம்', 'Aamaam'], kn: ['ಹೌದು', 'Houdu'], bn: ['হ্যাঁ', 'Haan'], gu: ['હા', 'Haa'], ur: ['جی ہاں', 'Ji haan'], zh: ['是', 'Shì'], vi: 'Có' },
    no: { ta: ['இல்லை', 'Illai'], kn: ['ಇಲ್ಲ', 'Illa'], bn: ['না', 'Na'], gu: ['ના', 'Naa'], ur: ['نہیں', 'Nahin'], zh: ['不是', 'Bú shì'], vi: 'Không' },
    unsure: { ta: ['தெரியாது', 'Theriyaadhu'], kn: ['ಗೊತ್ತಿಲ್ಲ', 'Gottilla'], bn: ['জানি না', 'Jaani na'], gu: ['ખબર નથી', 'Khabar nathi'], ur: ['معلوم نہیں', 'Maaloom nahin'], zh: ['不知道', 'Bù zhīdào'], vi: 'Không biết' },
    next: { ta: ['அடுத்து', 'Aduththu'], kn: ['ಮುಂದೆ', 'Munde'], bn: ['পরেরটা', 'Porerta'], gu: ['આગળ', 'Aagal'], ur: ['آگے', 'Aage'], zh: ['下一步', 'Xià yí bù'], vi: 'Tiếp' },
    back: { ta: ['பின்னால்', 'Pinnaal'], kn: ['ಹಿಂದೆ', 'Hinde'], bn: ['পিছনে', 'Pichhone'], gu: ['પાછળ', 'Paachhal'], ur: ['پیچھے', 'Peechhe'], zh: ['返回', 'Fǎnhuí'], vi: 'Quay lại' },
    finish: { ta: ['முடிந்தது', 'Mudindhadhu'], kn: ['ಮುಗಿಸಿ', 'Mugisi'], bn: ['শেষ', 'Shesh'], gu: ['પૂરું', 'Poorun'], ur: ['ختم', 'Khatam'], zh: ['完成', 'Wánchéng'], vi: 'Xong' },
    age: { ta: ['சுமார் எந்த வயதில்?', 'Sumaar endha vayadhil?'], kn: ['ಸುಮಾರು ಯಾವ ವಯಸ್ಸಿನಲ್ಲಿ?', 'Sumaaru yaava vayassinalli?'], bn: ['মোটামুটি কত বছর বয়সে?', 'Motamuti koto bochhor boyoshe?'], gu: ['આશરે કઈ ઉંમરે?', 'Aashare kai ummare?'], ur: ['تقریباً کس عمر میں؟', 'Taqreeban kis umar mein?'], zh: ['大概多大年纪？', 'Dàgài duō dà niánjì?'], vi: 'Khoảng bao nhiêu tuổi ạ?' },
    listen: { ta: ['கேளுங்கள்', 'Kelungal'], kn: ['ಕೇಳಿ', 'Keli'], bn: ['শুনুন', 'Shunun'], gu: ['સાંભળો', 'Saambhalo'], ur: ['سنیے', 'Suniye'], zh: ['听一听', 'Tīng yì tīng'], vi: 'Nghe' },
    thanks: { ta: ['நன்றி!', 'Nandri!'], kn: ['ಧನ್ಯವಾದಗಳು!', 'Dhanyavaadagalu!'], bn: ['ধন্যবাদ!', 'Dhonnobaad!'], gu: ['આભાર!', 'Aabhaar!'], ur: ['شکریہ!', 'Shukriya!'], zh: ['谢谢您！', 'Xièxie nín!'], vi: 'Cảm ơn ông/bà!' },
    had_self: {
      ta: ['இது உங்களுக்கு இருக்கிறது என்று டாக்டர் எப்போதாவது சொன்னாரா?', 'Idhu ungalukku irukkiradhu endru doctor eppodhaavadhu sonnaaraa?'],
      kn: ['ಇದು ನಿಮಗೆ ಇದೆ ಎಂದು ಡಾಕ್ಟರ್ ಎಂದಾದರೂ ಹೇಳಿದ್ದಾರಾ?', 'Idu nimage ide endu doctor endaadaroo heliddaaraa?'],
      bn: ['কোনো ডাক্তার কি কখনো বলেছেন যে আপনার এটা আছে?', 'Kono daktaar ki kokhono bolechhen je aapnaar eta aachhe?'],
      gu: ['શું કોઈ ડૉક્ટરે ક્યારેય કહ્યું કે આપને આ છે?', 'Shun koi doctor-e kyaarey kahyun ke aapne aa chhe?'],
      ur: ['کیا کسی ڈاکٹر نے کبھی بتایا کہ آپ کو یہ ہے؟', 'Kya kisi doctor ne kabhi bataaya ke aap ko yeh hai?'],
      zh: ['有没有医生说过您有这个病？', 'Yǒu méiyǒu yīshēng shuō guo nín yǒu zhège bìng?'],
      vi: 'Có bác sĩ nào từng nói ông/bà bị bệnh này không ạ?',
    },
    had_mother: {
      ta: ['உங்கள் அம்மாவுக்கு இது இருந்ததா?', 'Ungal ammaavukku idhu irundhadhaa?'],
      kn: ['ನಿಮ್ಮ ತಾಯಿಯವರಿಗೆ ಇದು ಇತ್ತೇ?', 'Nimma taayiyavarige idu itte?'],
      bn: ['আপনার মায়ের কি এটা ছিল?', 'Aapnaar maayer ki eta chhilo?'],
      gu: ['શું આપનાં માતાજીને આ હતું?', 'Shun aapnaan maataajine aa hatun?'],
      ur: ['کیا آپ کی والدہ کو یہ تھا؟', 'Kya aap ki waalida ko yeh tha?'],
      zh: ['您的母亲有过这个病吗？', 'Nín de mǔqīn yǒu guo zhège bìng ma?'],
      vi: 'Mẹ của ông/bà có bị bệnh này không ạ?',
    },
    had_father: {
      ta: ['உங்கள் அப்பாவுக்கு இது இருந்ததா?', 'Ungal appaavukku idhu irundhadhaa?'],
      kn: ['ನಿಮ್ಮ ತಂದೆಯವರಿಗೆ ಇದು ಇತ್ತೇ?', 'Nimma tandeyavarige idu itte?'],
      bn: ['আপনার বাবার কি এটা ছিল?', 'Aapnaar baabaar ki eta chhilo?'],
      gu: ['શું આપના પિતાજીને આ હતું?', 'Shun aapnaa pitaajine aa hatun?'],
      ur: ['کیا آپ کے والد صاحب کو یہ تھا؟', 'Kya aap ke waalid sahib ko yeh tha?'],
      zh: ['您的父亲有过这个病吗？', 'Nín de fùqīn yǒu guo zhège bìng ma?'],
      vi: 'Bố của ông/bà có bị bệnh này không ạ?',
    },
    about_self: { ta: ['உங்களைப் பற்றி', 'Ungalai patri'], kn: ['ನಿಮ್ಮ ಬಗ್ಗೆ', 'Nimma bagge'], bn: ['আপনার সম্পর্কে', 'Aapnaar shomporke'], gu: ['આપના વિશે', 'Aapnaa vishe'], ur: ['آپ کے بارے میں', 'Aap ke baare mein'], zh: ['关于您', 'Guānyú nín'], vi: 'Về ông/bà' },
    about_mother: { ta: ['உங்கள் அம்மாவைப் பற்றி', 'Ungal ammaavai patri'], kn: ['ನಿಮ್ಮ ತಾಯಿಯವರ ಬಗ್ಗೆ', 'Nimma taayiyavara bagge'], bn: ['আপনার মায়ের সম্পর্কে', 'Aapnaar maayer shomporke'], gu: ['આપનાં માતાજી વિશે', 'Aapnaan maataaji vishe'], ur: ['آپ کی والدہ کے بارے میں', 'Aap ki waalida ke baare mein'], zh: ['关于您的母亲', 'Guānyú nín de mǔqīn'], vi: 'Về mẹ của ông/bà' },
    about_father: { ta: ['உங்கள் அப்பாவைப் பற்றி', 'Ungal appaavai patri'], kn: ['ನಿಮ್ಮ ತಂದೆಯವರ ಬಗ್ಗೆ', 'Nimma tandeyavara bagge'], bn: ['আপনার বাবার সম্পর্কে', 'Aapnaar baabaar shomporke'], gu: ['આપના પિતાજી વિશે', 'Aapnaa pitaaji vishe'], ur: ['آپ کے والد صاحب کے بارے میں', 'Aap ke waalid sahib ke baare mein'], zh: ['关于您的父亲', 'Guānyú nín de fùqīn'], vi: 'Về bố của ông/bà' },
    living_q: { ta: ['இவர்கள் இன்னும் இருக்கிறார்களா?', 'Ivargal innum irukkiraargalaa?'], kn: ['ಇವರು ಇನ್ನೂ ಇದ್ದಾರಾ?', 'Ivaru innoo iddaaraa?'], bn: ['উনি কি এখনও বেঁচে আছেন?', 'Uni ki ekhono benche aachhen?'], gu: ['શું તેઓ હજી હયાત છે?', 'Shun teo haji hayaat chhe?'], ur: ['کیا یہ ابھی حیات ہیں؟', 'Kya yeh abhi hayaat hain?'], zh: ['这个人还健在吗？', 'Zhège rén hái jiànzài ma?'], vi: 'Người này còn sống không ạ?' },
    death_age_q: { ta: ['காலமானபோது அவர்களுக்கு என்ன வயது?', 'Kaalamaanapodhu avargalukku enna vayadhu?'], kn: ['ತೀರಿಕೊಂಡಾಗ ಅವರ ವಯಸ್ಸು ಎಷ್ಟು?', 'Teerikondaaga avara vayassu eshtu?'], bn: ['মারা যাওয়ার সময় ওনার বয়স কত ছিল?', 'Maara jaawaar shomoy onaar boyosh koto chhilo?'], gu: ['અવસાન વખતે તેમની ઉંમર કેટલી હતી?', 'Avsaan vakhte temni ummar ketli hati?'], ur: ['انتقال کے وقت ان کی عمر کتنی تھی؟', 'Intiqaal ke waqt un ki umar kitni thi?'], zh: ['去世的时候多大年纪？', 'Qùshì de shíhou duō dà niánjì?'], vi: 'Lúc mất, người đó bao nhiêu tuổi ạ?' },
    born_q: { ta: ['நீங்கள் எந்த வருடம் பிறந்தீர்கள்?', 'Neengal endha varudam pirandheergal?'], kn: ['ನೀವು ಯಾವ ವರ್ಷದಲ್ಲಿ ಹುಟ್ಟಿದಿರಿ?', 'Neevu yaava varshadalli huttidiri?'], bn: ['আপনি কোন সালে জন্মেছিলেন?', 'Aapni kon saale jonmechhilen?'], gu: ['આપનો જન્મ કયા વર્ષમાં થયો?', 'Aapno janma kayaa varshmaan thayo?'], ur: ['آپ کس سال پیدا ہوئے؟', 'Aap kis saal paida hue?'], zh: ['您是哪一年出生的？', 'Nín shì nǎ yì nián chūshēng de?'], vi: 'Ông/bà sinh năm nào ạ?' },
    welcome: {
      ta: ['குடும்ப உடல்நல வரலாற்றுக்காக உங்கள் குடும்பத்தினர் உங்கள் உதவியைக் கேட்டிருக்கிறார்கள். பதில்களைத் தொடுங்கள். எதையும் விட்டுவிடலாம்.', 'Kudumba udalnala varalaatrukkaaga ungal kudumbatthinar ungal udhaviyai kettirukkiraargal. Badhilgalai thodungal. Edhaiyum vittuvidalaam.'],
      kn: ['ಕುಟುಂಬದ ಆರೋಗ್ಯ ಇತಿಹಾಸಕ್ಕಾಗಿ ನಿಮ್ಮ ಕುಟುಂಬದವರು ನಿಮ್ಮ ಸಹಾಯ ಕೇಳಿದ್ದಾರೆ. ಉತ್ತರಗಳನ್ನು ಒತ್ತಿ. ಯಾವುದನ್ನಾದರೂ ಬಿಡಬಹುದು.', 'Kutumbada aarogya itihaasakkaagi nimma kutumbadavaru nimma sahaaya keliddaare. Uttaragalannu otti. Yaavudannaadaroo bidabahudu.'],
      bn: ['আপনার পরিবার পারিবারিক স্বাস্থ্যের ইতিহাস তৈরিতে আপনার সাহায্য চেয়েছে। উত্তরগুলোতে চাপ দিন। যেকোনো কিছু বাদ দিতে পারেন।', 'Aapnaar poribaar paaribaarik shaasthyer itihaash toirite aapnaar shaahajjo cheyechhe. Uttorgulote chaap din. Jekono kichhu baad dite paaren.'],
      gu: ['આપના પરિવારે કુટુંબના આરોગ્ય ઇતિહાસ માટે આપની મદદ માગી છે. જવાબ પર ટૅપ કરો. આપ કંઈ પણ છોડી શકો છો.', 'Aapnaa parivaare kutumbnaa aarogya itihaas maate aapni madad maagi chhe. Javaab par tap karo. Aap kai pan chhodi shako chho.'],
      ur: ['آپ کے خاندان نے خاندانی صحت کی تاریخ کے لیے آپ سے مدد مانگی ہے۔ جواب پر ٹیپ کریں۔ آپ کچھ بھی چھوڑ سکتے ہیں۔', 'Aap ke khaandaan ne khaandaani sehat ki taareekh ke liye aap se madad maangi hai. Jawaab par tap karein. Aap kuchh bhi chhod sakte hain.'],
      zh: ['您的家人请您帮忙整理家族健康史。请点选答案。任何问题都可以跳过。', 'Nín de jiārén qǐng nín bāngmáng zhěnglǐ jiāzú jiànkāng shǐ. Qǐng diǎnxuǎn dá’àn. Rènhé wèntí dōu kěyǐ tiàoguò.'],
      vi: 'Gia đình nhờ ông/bà giúp làm bản tiền sử sức khỏe gia đình. Xin ông/bà chạm vào câu trả lời. Ông/bà có thể bỏ qua bất cứ câu nào.',
    },
    send_back: { ta: ['உங்கள் பதில்களைத் திருப்பி அனுப்புங்கள்', 'Ungal badhilgalai thiruppi anuppungal'], kn: ['ನಿಮ್ಮ ಉತ್ತರಗಳನ್ನು ವಾಪಸ್ ಕಳುಹಿಸಿ', 'Nimma uttaragalannu vaapas kaluhisi'], bn: ['আপনার উত্তরগুলো ফেরত পাঠান', 'Aapnaar uttorgulo pherot paathaan'], gu: ['આપના જવાબો પાછા મોકલો', 'Aapnaa javaabo paachhaa moklo'], ur: ['اپنے جوابات واپس بھیجیں', 'Apne jawaabaat waapas bhejein'], zh: ['把您的回答发回去', 'Bǎ nín de huídá fā huíqu'], vi: 'Gửi câu trả lời về' },
  };

  /* ---------- Conditions: everyday word first, formal term in parentheses ---------- */
  const CT = {
    heart: { ta: ['இதய நோய் / மாரடைப்பு (ஹார்ட் அட்டாக்)', 'Idhaya noi / maaradaippu (heart attack)'], kn: ['ಹೃದಯ ಕಾಯಿಲೆ / ಹೃದಯಾಘಾತ (ಹಾರ್ಟ್ ಅಟ್ಯಾಕ್)', 'Hrudaya kaayile / hrudayaaghaata (heart attack)'], bn: ['হার্টের অসুখ / হার্ট অ্যাটাক (হৃদরোগ)', 'Heart-er oshukh / heart attack (hridrog)'], gu: ['હૃદયની બીમારી / હાર્ટ એટેક', 'Hrudayni beemaari / heart attack'], ur: ['دل کی بیماری / دل کا دورہ', 'Dil ki beemaari / dil ka daura'], zh: ['心脏病 / 心梗（心肌梗死）', 'Xīnzàngbìng / xīngěng (xīnjī gěngsǐ)'], vi: 'Bệnh tim hoặc nhồi máu cơ tim (đau tim)' },
    stroke: { ta: ['பக்கவாதம் (ஸ்ட்ரோக்)', 'Pakkavaadham (stroke)'], kn: ['ಲಕ್ವ / ಪಾರ್ಶ್ವವಾಯು (ಸ್ಟ್ರೋಕ್)', 'Lakva / paarshvavaayu (stroke)'], bn: ['স্ট্রোক (পক্ষাঘাত)', 'Stroke (pokkhaghaat)'], gu: ['લકવો (સ્ટ્રોક)', 'Lakvo (stroke)'], ur: ['فالج (اسٹروک)', 'Faalij (stroke)'], zh: ['中风（脑卒中）', 'Zhòngfēng (nǎo cùzhòng)'], vi: 'Đột quỵ (tai biến mạch máu não)' },
    bp: { ta: ['பிபி (உயர் ரத்த அழுத்தம்)', 'BP (uyar ratha azhuttham)'], kn: ['ಬಿಪಿ (ಅಧಿಕ ರಕ್ತದೊತ್ತಡ)', 'BP (adhika raktadottada)'], bn: ['হাই প্রেশার (উচ্চ রক্তচাপ)', 'High pressure (uchcho roktochaap)'], gu: ['બીપી (હાઈ બ્લડ પ્રેશર)', 'BP (high blood pressure)'], ur: ['ہائی بلڈ پریشر (بی پی)', 'High blood pressure (BP)'], zh: ['高血压', 'Gāo xuèyā'], vi: 'Huyết áp cao (cao huyết áp)' },
    chol: { ta: ['கொலஸ்ட்ரால் அதிகம்', 'Cholesterol adhigam'], kn: ['ಕೊಲೆಸ್ಟ್ರಾಲ್ ಜಾಸ್ತಿ', 'Cholesterol jaasti'], bn: ['কোলেস্টেরল বেশি', 'Cholesterol beshi'], gu: ['કોલેસ્ટ્રોલ વધારે', 'Cholesterol vadhaare'], ur: ['کولیسٹرول زیادہ', 'Cholesterol zyaada'], zh: ['胆固醇高（血脂高）', 'Dǎngùchún gāo (xuèzhī gāo)'], vi: 'Mỡ máu cao (cholesterol cao)' },
    diabetes: { ta: ['சர்க்கரை நோய் (நீரிழிவு)', 'Sarkkarai noi (neerizhivu)'], kn: ['ಶುಗರ್ (ಸಕ್ಕರೆ ಕಾಯಿಲೆ / ಮಧುಮೇಹ)', 'Sugar (sakkare kaayile / madhumeha)'], bn: ['সুগার (ডায়াবেটিস)', 'Sugar (diabetes)'], gu: ['ડાયાબિટીસ (સુગર)', 'Diabetes (sugar)'], ur: ['شوگر (ذیابیطس)', 'Sugar (ziabetes)'], zh: ['糖尿病（血糖高）', 'Tángniàobìng (xuètáng gāo)'], vi: 'Tiểu đường (đái tháo đường)' },
    cancer: { ta: ['புற்றுநோய் (கேன்சர்)', 'Putrunoi (cancer)'], kn: ['ಕ್ಯಾನ್ಸರ್', 'Cancer'], bn: ['ক্যান্সার', 'Cancer'], gu: ['કેન્સર', 'Cancer'], ur: ['کینسر (سرطان)', 'Cancer (sartaan)'], zh: ['癌症', 'Áizhèng'], vi: 'Ung thư' },
    kidney: { ta: ['சிறுநீரக நோய் (கிட்னி)', 'Siruneeraga noi (kidney)'], kn: ['ಕಿಡ್ನಿ ಕಾಯಿಲೆ', 'Kidney kaayile'], bn: ['কিডনির অসুখ', 'Kidney-r oshukh'], gu: ['કિડનીની બીમારી', 'Kidneyni beemaari'], ur: ['گردے کی بیماری', 'Gurde ki beemaari'], zh: ['肾病', 'Shènbìng'], vi: 'Bệnh thận' },
    thyroid: { ta: ['தைராய்டு பிரச்சினை', 'Thyroid prachchinai'], kn: ['ಥೈರಾಯ್ಡ್ ಸಮಸ್ಯೆ', 'Thyroid samasye'], bn: ['থাইরয়েডের সমস্যা', 'Thyroid-er shomoshsha'], gu: ['થાઇરોઇડની તકલીફ', 'Thyroidni takleef'], ur: ['تھائیرائیڈ کا مسئلہ', 'Thyroid ka masla'], zh: ['甲状腺问题', 'Jiǎzhuàngxiàn wèntí'], vi: 'Bệnh tuyến giáp' },
    asthma: { ta: ['ஆஸ்துமா (இளைப்பு)', 'Aasthuma (ilaippu)'], kn: ['ಉಬ್ಬಸ (ಅಸ್ತಮಾ)', 'Ubbasa (asthma)'], bn: ['হাঁপানি (অ্যাজমা)', 'Haapaani (asthma)'], gu: ['દમ (અસ્થમા)', 'Dam (asthma)'], ur: ['دمہ', 'Dama'], zh: ['哮喘', 'Xiàochuǎn'], vi: 'Hen suyễn' },
    epilepsy: { ta: ['வலிப்பு (ஃபிட்ஸ்)', 'Valippu (fits)'], kn: ['ಮೂರ್ಛೆ ರೋಗ (ಫಿಟ್ಸ್)', 'Moorchhe roga (fits)'], bn: ['মৃগী (খিঁচুনি)', 'Mrigi (khinchuni)'], gu: ['વાઈ (આંચકી)', 'Vaai (aanchki)'], ur: ['مرگی (دورے)', 'Mirgi (daure)'], zh: ['癫痫（羊角风）', 'Diānxián (yángjiǎofēng)'], vi: 'Động kinh hoặc co giật' },
    dementia: { ta: ['ஞாபக மறதி நோய் (டிமென்ஷியா)', 'Nyaabaga maradhi noi (dementia)'], kn: ['ಮರೆವಿನ ಕಾಯಿಲೆ (ಡಿಮೆನ್ಷಿಯಾ)', 'Marevina kaayile (dementia)'], bn: ['ভুলে যাওয়ার রোগ (ডিমেনশিয়া)', 'Bhule jaawaar rog (dementia)'], gu: ['ભૂલવાની બીમારી (ડિમેન્શિયા)', 'Bhoolvaani beemaari (dementia)'], ur: ['بھولنے کی بیماری (ڈیمنشیا)', 'Bhoolne ki beemaari (dementia)'], zh: ['老年痴呆（失智症）', 'Lǎonián chīdāi (shīzhìzhèng)'], vi: 'Lú lẫn, mất trí nhớ (sa sút trí tuệ)' },
    mental: { ta: ['மனச்சோர்வு (டிப்ரஷன்) / மனநலப் பிரச்சினை', 'Manachorvu (depression) / mananala prachchinai'], kn: ['ಖಿನ್ನತೆ (ಡಿಪ್ರೆಶನ್) / ಮಾನಸಿಕ ಆರೋಗ್ಯ ಸಮಸ್ಯೆ', 'Khinnate (depression) / maanasika aarogya samasye'], bn: ['ডিপ্রেশন / মানসিক স্বাস্থ্যের সমস্যা', 'Depression / maanoshik shaasthyer shomoshsha'], gu: ['ડિપ્રેશન / માનસિક આરોગ્યની તકલીફ', 'Depression / maanasik aarogyani takleef'], ur: ['ڈپریشن / ذہنی صحت کا مسئلہ', 'Depression / zehni sehat ka masla'], zh: ['抑郁症或其他心理健康问题', 'Yìyùzhèng huò qítā xīnlǐ jiànkāng wèntí'], vi: 'Trầm cảm hoặc bệnh tâm lý khác' },
    blood: { ta: ['தலசீமியா / அரிவாள் செல் / ரத்த சோகை', 'Thalassemia / arivaal cell / ratha sogai'], kn: ['ಥಲಸ್ಸೇಮಿಯಾ / ಸಿಕಲ್ ಸೆಲ್ / ರಕ್ತಹೀನತೆ', 'Thalassemia / sickle cell / raktaheenate'], bn: ['থ্যালাসেমিয়া / সিকেল সেল / রক্তশূন্যতা', 'Thalassemia / sickle cell / roktoshunnota'], gu: ['થેલેસેમિયા / સિકલ સેલ / લોહીની ઉણપ', 'Thalassemia / sickle cell / lohini unap'], ur: ['تھیلیسیمیا / سکل سیل / خون کی کمی', 'Thalassemia / sickle cell / khoon ki kami'], zh: ['地中海贫血 / 镰状细胞病 / 贫血', 'Dìzhōnghǎi pínxuè / liánzhuàng xìbāo bìng / pínxuè'], vi: 'Tan máu bẩm sinh (thalassemia), hồng cầu hình liềm, hoặc thiếu máu' },
  };

  /* ---------- Cancer kinds ---------- */
  const KT = {
    breast: { ta: ['மார்பகம்', 'Maarbagam'], kn: ['ಸ್ತನ', 'Stana'], bn: ['স্তন', 'Stan'], gu: ['સ્તન', 'Stan'], ur: ['چھاتی', 'Chhaati'], zh: ['乳腺', 'Rǔxiàn'], vi: 'Vú' },
    breast2: { ta: ['இரண்டு மார்பகங்களிலும்', 'Irandu maarbagangalilum'], kn: ['ಎರಡೂ ಸ್ತನಗಳಲ್ಲಿ', 'Eradoo stanagalalli'], bn: ['দুই স্তনেই', 'Dui stonei'], gu: ['બંને સ્તનમાં', 'Banne stanmaan'], ur: ['دونوں چھاتیوں میں', 'Donon chhaatiyon mein'], zh: ['两侧乳腺', 'Liǎng cè rǔxiàn'], vi: 'Cả hai bên vú' },
    ovarian: { ta: ['சினைப்பை (கருமுட்டைப் பை)', 'Sinaippai (karumuttai pai)'], kn: ['ಅಂಡಾಶಯ', 'Andaashaya'], bn: ['ডিম্বাশয়', 'Dimbaashoy'], gu: ['અંડાશય', 'Andaashay'], ur: ['بیضہ دانی', 'Baiza daani'], zh: ['卵巢', 'Luǎncháo'], vi: 'Buồng trứng' },
    colorectal: { ta: ['பெருங்குடல் / மலக்குடல்', 'Perungudal / malakkudal'], kn: ['ದೊಡ್ಡ ಕರುಳು', 'Dodda karulu'], bn: ['বৃহদন্ত্র (কোলন) / মলাশয়', 'Brihodantro (colon) / molaashoy'], gu: ['મોટું આંતરડું (કોલોન)', 'Motun aantardun (colon)'], ur: ['بڑی آنت (کولون)', 'Badi aant (colon)'], zh: ['结肠或直肠（大肠）', 'Jiécháng huò zhícháng (dàcháng)'], vi: 'Đại tràng hoặc trực tràng (ruột già)' },
    uterine: { ta: ['கருப்பை', 'Karuppai'], kn: ['ಗರ್ಭಕೋಶ', 'Garbhakosha'], bn: ['জরায়ু', 'Jorayu'], gu: ['ગર્ભાશય', 'Garbhaashay'], ur: ['بچہ دانی (رحم)', 'Bachcha daani (reham)'], zh: ['子宫', 'Zǐgōng'], vi: 'Tử cung' },
    smallbowel: { ta: ['சிறுகுடல்', 'Sirugudal'], kn: ['ಸಣ್ಣ ಕರುಳು', 'Sanna karulu'], bn: ['ক্ষুদ্রান্ত্র', 'Khudrantro'], gu: ['નાનું આંતરડું', 'Naanun aantardun'], ur: ['چھوٹی آنت', 'Chhoti aant'], zh: ['小肠', 'Xiǎocháng'], vi: 'Ruột non' },
    urinary: { ta: ['சிறுநீர்க் குழாய்', 'Siruneer kuzhaai'], kn: ['ಮೂತ್ರನಾಳ', 'Mootranaala'], bn: ['মূত্রনালি', 'Mutronaali'], gu: ['મૂત્રનળી', 'Mootranali'], ur: ['پیشاب کی نالی', 'Peshaab ki naali'], zh: ['输尿管或肾盂', 'Shūniàoguǎn huò shènyú'], vi: 'Niệu quản hoặc bể thận' },
    prostate: { ta: ['புரோஸ்டேட்', 'Prostate'], kn: ['ಪ್ರಾಸ್ಟೇಟ್', 'Prostate'], bn: ['প্রোস্টেট', 'Prostate'], gu: ['પ્રોસ્ટેટ', 'Prostate'], ur: ['پروسٹیٹ', 'Prostate'], zh: ['前列腺', 'Qiánlièxiàn'], vi: 'Tuyến tiền liệt' },
    pancreatic: { ta: ['கணையம் (பான்க்ரியாஸ்)', 'Kanaiyam (pancreas)'], kn: ['ಮೇದೋಜೀರಕ ಗ್ರಂಥಿ (ಪ್ಯಾಂಕ್ರಿಯಾಸ್)', 'Medojeeraka granthi (pancreas)'], bn: ['অগ্ন্যাশয় (প্যানক্রিয়াস)', 'Ognyaashoy (pancreas)'], gu: ['સ્વાદુપિંડ (પેન્ક્રિયાસ)', 'Swaadupind (pancreas)'], ur: ['لبلبہ (پینکریاز)', 'Lablaba (pancreas)'], zh: ['胰腺', 'Yíxiàn'], vi: 'Tụy' },
    stomach: { ta: ['வயிறு (இரைப்பை)', 'Vayiru (iraippai)'], kn: ['ಹೊಟ್ಟೆ (ಜಠರ)', 'Hotte (jathara)'], bn: ['পাকস্থলী (পেট)', 'Paakostholi (pet)'], gu: ['હોજરી (પેટ)', 'Hojri (pet)'], ur: ['معدہ', 'Meda'], zh: ['胃', 'Wèi'], vi: 'Dạ dày (bao tử)' },
    lung: { ta: ['நுரையீரல்', 'Nuraiyeeral'], kn: ['ಶ್ವಾಸಕೋಶ', 'Shwaasakosha'], bn: ['ফুসফুস', 'Phusphus'], gu: ['ફેફસાં', 'Fefsaan'], ur: ['پھیپھڑے', 'Phephre'], zh: ['肺', 'Fèi'], vi: 'Phổi' },
    bloodca: { ta: ['ரத்தப் புற்றுநோய்', 'Rathap putrunoi'], kn: ['ರಕ್ತದ ಕ್ಯಾನ್ಸರ್', 'Raktada cancer'], bn: ['ব্লাড ক্যান্সার', 'Blood cancer'], gu: ['બ્લડ કેન્સર', 'Blood cancer'], ur: ['خون کا کینسر', 'Khoon ka cancer'], zh: ['血癌（白血病、淋巴瘤）', 'Xuè’ái (báixuèbìng, línbāliú)'], vi: 'Ung thư máu (bệnh bạch cầu, u lympho)' },
    skin: { ta: ['தோல்', 'Thol'], kn: ['ಚರ್ಮ', 'Charma'], bn: ['ত্বক (চামড়া)', 'Twok (chaamra)'], gu: ['ચામડી', 'Chaamdi'], ur: ['جلد', 'Jild'], zh: ['皮肤（黑色素瘤）', 'Pífū (hēisèsùliú)'], vi: 'Da (u hắc tố)' },
    other: { ta: ['வேறு வகை', 'Veru vagai'], kn: ['ಬೇರೆ ರೀತಿಯದು', 'Bere reetiyadu'], bn: ['অন্য ধরনের', 'Onno dhoroner'], gu: ['બીજો પ્રકાર', 'Beejo prakaar'], ur: ['کوئی اور قسم', 'Koi aur qism'], zh: ['其他种类', 'Qítā zhǒnglèi'], vi: 'Loại khác' },
  };

  for (const [k, v] of Object.entries(QT)) put(Q[k], v);
  for (const [k, v] of Object.entries(FT)) put(FOLLOW[k], v);
  for (const [k, v] of Object.entries(ET)) put(ELDER_TEXT[k], v);
  for (const c of CONDS) if (CT[c.id]) put(c, CT[c.id]);
  for (const c of CANCER_TYPES) if (KT[c.id]) put(c, KT[c.id]);

  /* ---------- Answer finder vocabulary ----------
     Latin-script words (romanized Indic/Urdu, Vietnamese) are matched as whole words.
     Other scripts are matched as substrings, so these are stems that still work with
     suffixes attached. Speech engines differ in Unicode normalization (Bengali য়,
     Vietnamese tone marks), so each word is also added in its NFC and NFD forms. */
  const forms = w => [...new Set([w, w.normalize('NFC'), w.normalize('NFD')])];
  function add(list, words) {
    for (const w of words) for (const f of forms(w.toLowerCase())) if (!list.includes(f)) list.push(f);
  }

  const LEX = {
    heart: [
      'மாரடைப்பு', 'இதய', 'ஹார்ட் அட்டாக்', 'maaradaippu', 'maradaippu', 'idhaya', 'ithaya', 'idhayam',
      'ಹೃದಯ', 'ಹಾರ್ಟ್', 'hrudaya', 'hridaya', 'hrudayaghata',
      'হার্ট', 'হৃদরোগ', 'হৃদ্‌রোগ', 'hridrog',
      'હૃદય', 'હ્રદય', 'હાર્ટ', 'hruday', 'hriday',
      'دل کا', 'دل کی', 'دل کے', 'ہارٹ', 'امراض قلب', 'dil', 'dil ki bimari',
      '心脏', '心梗', '心肌梗', '冠心病', '心脏搭桥',
      'bệnh tim', 'đau tim', 'nhồi máu cơ tim', 'tim mạch', 'bị tim', 'đặt stent',
    ],
    stroke: [
      'பக்கவாத', 'ஸ்ட்ரோக்', 'pakkavaadham', 'pakkavatham', 'pakkavaatham',
      'ಪಾರ್ಶ್ವವಾಯು', 'ಲಕ್ವ', 'ಸ್ಟ್ರೋಕ್', 'paarshvavaayu', 'parshvavayu',
      'স্ট্রোক', 'পক্ষাঘাত', 'প্যারালাইসিস', 'pokkhaghat',
      'લકવ', 'સ્ટ્રોક', 'પક્ષાઘાત', 'lakvo',
      'فالج', 'اسٹروک', 'سٹروک', 'falij', 'faalij',
      '中风', '卒中', '脑梗', '脑溢血', '脑出血', '偏瘫',
      'đột quỵ', 'đột quị', 'tai biến', 'liệt nửa người',
    ],
    bp: [
      'பிபி', 'பி.பி', 'ரத்த அழுத்த', 'ரத்தக் கொதிப்பு', 'ரத்த கொதிப்பு', 'ratha azhutham', 'raththa kodhippu', 'ratha kothippu',
      'ಬಿಪಿ', 'ರಕ್ತದೊತ್ತಡ', 'raktadottada',
      'প্রেশার', 'রক্তচাপ', 'বিপি', 'roktochap', 'raktachap',
      'બીપી', 'બ્લડ પ્રેશર', 'પ્રેશર', 'લોહીનું દબાણ',
      'بلڈ پریشر', 'بی پی', 'فشار خون',
      '高血压', '血压',
      'huyết áp',
    ],
    chol: [
      'கொலஸ்ட்ரால்', 'கொலஸ்டிரால்', 'kolastraal',
      'ಕೊಲೆಸ್ಟ್ರಾಲ್', 'ಕೊಲೆಸ್ಟರಾಲ್',
      'কোলেস্টেরল', 'কোলেস্টরল',
      'કોલેસ્ટ્રોલ', 'કોલેસ્ટેરોલ',
      'کولیسٹرول', 'کولیسٹرال', 'کولیسٹرل',
      '胆固醇', '血脂',
      'mỡ máu', 'máu nhiễm mỡ', 'mỡ trong máu',
    ],
    diabetes: [
      'சர்க்கரை', 'சுகர்', 'நீரிழிவு', 'sakkarai', 'sarkkarai', 'sarkarai', 'neerizhivu',
      'ಶುಗರ್', 'ಸಕ್ಕರೆ', 'ಮಧುಮೇಹ', 'sakkare', 'madhumeha',
      'সুগার', 'ডায়াবেটিস', 'ডায়াবেটিক', 'বহুমূত্র', 'মধুমেহ',
      'ડાયાબિટીસ', 'ડાયાબીટીસ', 'ડાયાબિટીઝ', 'સુગર', 'મધુપ્રમેહ', 'madhuprameh',
      'شوگر', 'ذیابیطس', 'ذیابطیس', 'ڈائبیٹیز', 'ziabetes', 'ziabetus',
      '糖尿病', '血糖', '糖尿',
      'tiểu đường', 'đái tháo đường', 'đường huyết',
    ],
    cancer: [
      'புற்று', 'கேன்சர்', 'கான்சர்', 'putrunoi', 'puttrunoi', 'putru noi',
      'ಕ್ಯಾನ್ಸರ್', 'ಕರ್ಕರೋಗ', 'ಗಡ್ಡೆ', 'karkaroga',
      'ক্যান্সার', 'ক্যানসার', 'কর্কট', 'টিউমার',
      'કેન્સર', 'કૅન્સર', 'ગાંઠ',
      'کینسر', 'سرطان', 'رسولی', 'sartan', 'sartaan',
      '癌', '肿瘤',
      'ung thư', 'khối u',
    ],
    kidney: [
      'சிறுநீரக', 'கிட்னி', 'டயாலிசிஸ்', 'siruneeraga', 'siruneeragam',
      'ಕಿಡ್ನಿ', 'ಮೂತ್ರಪಿಂಡ', 'ಡಯಾಲಿಸಿಸ್',
      'কিডনি', 'বৃক্ক', 'ডায়ালাইসিস',
      'કિડની', 'મૂત્રપિંડ', 'ડાયાલિસિસ',
      'گردے', 'گردہ', 'گردوں', 'کڈنی', 'ڈائلیسس', 'gurda', 'gurday',
      '肾', '透析', '尿毒症',
      'bệnh thận', 'suy thận', 'chạy thận', 'lọc thận', 'thận yếu',
    ],
    thyroid: [
      'தைராய்ட',
      'ಥೈರಾಯ್ಡ್', 'ಥೈರಾಯಿಡ್',
      'থাইরয়েড', 'থাইরয়েড',
      'થાઇરોઇડ', 'થાઈરોઈડ',
      'تھائیرائیڈ', 'تھائرائڈ', 'تھائی رائیڈ',
      '甲状腺', '甲亢', '甲减',
      'tuyến giáp', 'bướu cổ', 'cường giáp', 'suy giáp',
    ],
    asthma: [
      'ஆஸ்துமா', 'இளைப்பு', 'மூச்சிரைப்பு', 'aasthuma', 'ilaippu',
      'ಅಸ್ತಮಾ', 'ಆಸ್ತಮಾ', 'ಉಬ್ಬಸ', 'ubbasa',
      'হাঁপানি', 'অ্যাজমা', 'এ্যাজমা', 'hapani', 'haapaani',
      'અસ્થમા', 'દમની', 'દમનો',
      'دمہ', 'استھما', 'dama',
      '哮喘', '气喘',
      'hen suyễn', 'suyễn', 'hen',
    ],
    epilepsy: [
      'வலிப்பு', 'ஃபிட்ஸ்', 'valippu',
      'ಮೂರ್ಛೆ', 'ಮೂರ್ಚೆ', 'ಫಿಟ್ಸ್', 'ಅಪಸ್ಮಾರ', 'moorchhe', 'apasmara',
      'মৃগী', 'খিঁচুনি', 'ফিটের', 'mrigi', 'khichuni',
      'વાઈની', 'વાઈ આવ', 'આંચકી', 'ખેંચ આવ', 'vaai', 'aanchki',
      'مرگی', 'جھٹکے',
      '癫痫', '羊癫疯', '羊角风', '抽搐', '抽风',
      'động kinh', 'co giật', 'kinh phong',
    ],
    dementia: [
      'மறதி', 'டிமென்ஷியா', 'அல்சைமர்', 'nyabaga marathi', 'gnabaga marathi', 'nyaabaga maradhi',
      'ಮರೆವು', 'ಮರೆಗುಳಿ', 'ಡಿಮೆನ್ಷಿಯಾ', 'marevu',
      'ভুলে যাওয়া', 'স্মৃতিভ্রংশ', 'ডিমেনশিয়া', 'আলঝেইমার', 'আলঝাইমার',
      'ભૂલવાની', 'ડિમેન્શિયા', 'સ્મૃતિભ્રંશ', 'ભૂલકણ',
      'بھولنے کی بیماری', 'ڈیمنشیا', 'الزائمر', 'bhoolne ki bimari', 'bhoolne ki beemaari',
      '痴呆', '失智', '阿尔茨海默',
      'lú lẫn', 'bị lẫn', 'lẫn rồi', 'mất trí nhớ', 'sa sút trí tuệ', 'đãng trí',
    ],
    mental: [
      'மனச்சோர்வு', 'மன அழுத்தம்', 'மனநல', 'மனநோய்', 'டிப்ரஷன்', 'manachorvu',
      'ಖಿನ್ನತೆ', 'ಮಾನಸಿಕ', 'ಡಿಪ್ರೆಶನ್', 'khinnate',
      'বিষণ্ণতা', 'মানসিক', 'ডিপ্রেশন', 'মনের অসুখ', 'manasik', 'mansik',
      'ડિપ્રેશન', 'માનસિક', 'હતાશા', 'maanasik',
      'ڈپریشن', 'ذہنی', 'افسردگی', 'نفسیاتی', 'zehni',
      '抑郁', '忧郁', '焦虑', '精神病', '心理问题',
      'trầm cảm', 'lo âu', 'tâm thần',
    ],
    blood: [
      'தலசீமியா', 'ரத்த சோகை', 'அரிவாள் செல்', 'ratha sogai', 'raththa sogai',
      'ಥಲಸ್ಸೇಮಿಯಾ', 'ರಕ್ತಹೀನತೆ', 'ಅನೀಮಿಯಾ', 'ಸಿಕಲ್ ಸೆಲ್', 'raktaheenate',
      'থ্যালাসেমিয়া', 'রক্তশূন্যতা', 'রক্তাল্পতা', 'অ্যানিমিয়া', 'সিকেল সেল', 'roktoshunnota',
      'થેલેસેમિયા', 'લોહીની ઉણપ', 'લોહી ઓછું', 'એનિમિયા', 'સિકલ સેલ',
      'تھیلیسیمیا', 'خون کی کمی', 'سکل سیل', 'انیمیا', 'khoon ki kami',
      '地中海贫血', '贫血', '镰状细胞', '镰刀型',
      'tan máu bẩm sinh', 'thiếu máu', 'hồng cầu hình liềm',
    ],
  };
  const CLEX = {
    breast: ['மார்பக', 'maarbaga', 'marbaga', 'ಸ್ತನ', 'stana', 'স্তন', 'ব্রেস্ট', 'સ્તન', 'બ્રેસ્ટ', 'چھاتی', 'بریسٹ', 'chhati', 'chaati', '乳腺', '乳房', '乳癌', 'vú'],
    ovarian: ['சினைப்பை', 'கருமுட்டைப் பை', 'ஓவரி', 'sinaippai', 'ಅಂಡಾಶಯ', 'ಓವರಿ', 'andashaya', 'ডিম্বাশয়', 'ওভারি', 'dimbashoy', 'અંડાશય', 'ઓવરી', 'andashay', 'بیضہ دانی', 'اووری', 'baiza dani', '卵巢', 'buồng trứng'],
    colorectal: ['பெருங்குடல்', 'மலக்குடல்', 'perungudal', 'ದೊಡ್ಡ ಕರುಳ', 'ಗುದನಾಳ', 'ಕೋಲನ್', 'dodda karulu', 'বৃহদন্ত্র', 'মলাশয়', 'কোলন', 'મોટા આંતરડ', 'મોટું આંતરડ', 'કોલોન', 'મળાશય', 'بڑی آنت', 'کولون', 'badi aant', 'bari aant', '结肠', '直肠', '大肠', 'đại tràng', 'trực tràng', 'ruột già'],
    uterine: ['கருப்பை', 'karuppai', 'ಗರ್ಭಕೋಶ', 'ಗರ್ಭಾಶಯ', 'garbhakosha', 'জরায়ু', 'jorayu', 'ગર્ભાશય', 'garbhashay', 'بچہ دانی', 'بچے دانی', 'رحم', 'bachcha dani', 'bacha dani', '子宫', 'tử cung'],
    prostate: ['புரோஸ்டேட்', 'ப்ராஸ்டேட்', 'ಪ್ರಾಸ್ಟೇಟ್', 'ಪ್ರೋಸ್ಟೇಟ್', 'প্রোস্টেট', 'પ્રોસ્ટેટ', 'پروسٹیٹ', '前列腺', 'tuyến tiền liệt', 'tiền liệt tuyến'],
    pancreatic: ['கணைய', 'kanaiyam', 'ಮೇದೋಜೀರಕ', 'ಪ್ಯಾಂಕ್ರಿಯಾಸ್', 'medojeeraka', 'অগ্ন্যাশয়', 'প্যানক্রিয়াস', 'ognashoy', 'સ્વાદુપિંડ', 'પેન્ક્રિયાસ', 'swadupind', 'لبلبہ', 'پینکریاز', 'lablaba', '胰', 'tụy', 'tuỵ', 'tuyến tụy', 'tuyến tuỵ'],
    stomach: ['வயிறு', 'வயிற்று', 'இரைப்பை', 'vayiru', 'vayitru', 'ಹೊಟ್ಟೆ', 'ಜಠರ', 'hotte', 'পাকস্থলী', 'পেট', 'pakostholi', 'પેટ', 'જઠર', 'હોજરી', 'jathar', 'معدہ', 'پیٹ', 'meda', '胃', 'dạ dày', 'bao tử'],
    lung: ['நுரையீரல்', 'nuraiyeeral', 'ಶ್ವಾಸಕೋಶ', 'shwasakosha', 'ফুসফুস', 'fusfus', 'phusphus', 'ફેફસ', 'fefsa', 'پھیپھڑ', 'phephre', 'phephde', '肺', 'phổi'],
    bloodca: ['ரத்தப் புற்று', 'ரத்த புற்று', 'லுகேமியா', 'லிம்போமா', 'ರಕ್ತ ಕ್ಯಾನ್ಸರ್', 'ರಕ್ತದ ಕ್ಯಾನ್ಸರ್', 'ಬ್ಲಡ್ ಕ್ಯಾನ್ಸರ್', 'ಲ್ಯುಕೇಮಿಯಾ', 'ব্লাড ক্যান্সার', 'রক্তের ক্যান্সার', 'লিউকেমিয়া', 'লিম্ফোমা', 'બ્લડ કેન્સર', 'લોહીનું કેન્સર', 'લ્યુકેમિયા', 'بلڈ کینسر', 'خون کا کینسر', 'لیوکیمیا', 'khoon ka cancer', '白血病', '淋巴瘤', '血癌', 'ung thư máu', 'bệnh bạch cầu', 'máu trắng', 'u lympho', 'ung thư hạch'],
    skin: ['தோல்', 'ಚರ್ಮ', 'charma', 'ত্বক', 'চামড়া', 'ચામડી', 'ત્વચા', 'chamdi', 'جلد کا', 'جلد کے', 'jild', '皮肤', '黑色素瘤', 'ung thư da', 'hắc tố'],
  };
  for (const e of LEXICON) if (LEX[e.cond]) add(e.words, LEX[e.cond]);
  for (const e of CANCER_LEXICON) if (CLEX[e.type]) add(e.words, CLEX[e.type]);

  // Mother / father. Stems are matched at the start of a word (space-separated), so Chinese
  // stems include 我 ("my") to catch the usual "我妈妈…" / "我父亲…" sentence opening.
  // `not` lists words that start the same way but mean something else (grandmother, uncle,
  // "my", "for", "died", "hope", English "apparently").
  add(KIN_WORDS.mother.stems, [
    'அம்மா', 'தாய்', 'ammaa', 'thaai', 'thaayar',
    'ಅಮ್ಮ', 'ತಾಯಿ', 'taayi', 'thaayi',
    'মা', 'মাতা', 'আম্মা', 'আম্মু', 'maa', 'mayer', 'maayer',
    'મા', 'મમ્મી', 'માતા', 'mummy', 'mammi', 'mataji', 'maataaji',
    'امی', 'امّی', 'ماں', 'والدہ', 'ammi', 'ammee', 'walida', 'waalida',
    '我妈', '妈妈', '母亲', '我母亲', '老妈',
    'mẹ', 'má', 'mạ',
  ]);
  add(KIN_WORDS.mother.not, [
    'அம்மாச்சி', 'அம்மம்மா', 'தாய்மாமா', 'தாய்மாமன்', 'ammaachi', 'ammachi',
    'ಅಮ್ಮಮ್ಮ',
    'মামা', 'মামী', 'মামি', 'মাসি', 'মাসী', 'মাথা', 'মাস', 'মানে', 'মাত্র', 'মানুষ', 'মাঝে', 'মারা', 'মাপ', 'মাছ', 'মাটি', 'মাংস', 'মাতামহ',
    'માર', 'માટે', 'માથ', 'માસ', 'મામ', 'માણ', 'માત્ર', 'માં', 'માફ', 'માન', 'માલ', 'માહ', 'માતામહ',
    'امید',
  ]);
  add(KIN_WORDS.father.stems, [
    'அப்பா', 'தந்தை', 'appa', 'appaa', 'thandhai',
    'ಅಪ್ಪ', 'ತಂದೆ', 'tande', 'thande',
    'বাবা', 'পিতা', 'আব্বা', 'আব্বু', 'baba', 'baabaa',
    'પપ્પા', 'બાપુજી', 'બાપા', 'પિતા', 'pappa', 'bapuji', 'pita',
    'ابو', 'ابا', 'ابّا', 'والد', 'abbu', 'abba', 'walid', 'waalid',
    '我爸', '爸爸', '父亲', '我父亲', '老爸',
    'bố', 'cha',
  ]);
  add(KIN_WORDS.father.not, [
    'அப்பாயி', 'அப்பாத்தா', 'appaayi', 'apparent', 'appal', 'appart',
    'ಅಪ್ಪಟ',
    'والدہ', 'walida', 'waalida', 'والدین',
    'pitaama', 'pitamah',
  ]);

  add(NEG_WORDS, [
    'இல்லை', 'இல்ல', 'கிடையாது', 'illai', 'illa', 'illainga', 'kidaiyaadhu', 'kidaiyathu',
    'ಇಲ್ಲ', 'ಲಿಲ್ಲ', 'ಅಲ್ಲ', 'alla', 'iralilla',
    'নেই', ' না ', 'না।', 'ছিল না', 'ছিলো না', 'হয় না', 'হয়নি', 'হয় নি', 'ছিলেন না', 'na', 'nei', 'hoyni',
    'નથી', 'નહીં', 'નહિ', 'નહોત', 'nathi', 'nahotu', 'nahoti',
    'نہیں', 'کبھی نہیں', 'nai', 'nahee',
    '没', '不是', '从来没', '从没',
    'không', 'chưa', 'chẳng',
  ]);
  add(DEATH_WORDS, [
    'இறந்த', 'இறந்து', 'இறப்பு', 'காலமான', 'காலமாகி', 'தவறிட்ட', 'தவறிவிட்ட', 'irandhu', 'irandha', 'iranthu', 'irandhutaanga', 'kaalamaanaar', 'kaalamaanaanga', 'kalamanar',
    'ತೀರಿಕೊಂಡ', 'ತೀರಿ ಹೋದ', 'ನಿಧನ', 'ಮರಣ', 'ಸತ್ತ', 'teerikondru', 'teerikondaru', 'tirikondru', 'nidhana',
    'মারা গে', 'মারা যা', 'মৃত্যু', 'প্রয়াত', 'দেহান্ত', 'mara gechen', 'mara gechhen', 'mara gechhe', 'mara jan', 'mrityu',
    'મૃત્યુ', 'ગુજરી ગ', 'અવસાન', 'મરી ગ', 'દેવલોક', 'gujri', 'gujari', 'avsaan', 'avsan', 'mrutyu',
    'انتقال', 'فوت', 'وفات', 'مر گئ', 'گزر گئ', 'intiqal', 'inteqal', 'intiqaal', 'faut', 'wafat', 'mar gaye', 'guzar gaye',
    '去世', '过世', '逝世', '病逝', '死', '不在了',
    'qua đời', 'từ trần', 'chết', 'đã mất',
  ]);
  add(LIVING_WORDS, [
    'உயிரோடு', 'உயிருடன்', 'இன்னும் இருக்க', 'uyirodu', 'uyiroda',
    'ಬದುಕಿದ್ದಾರೆ', 'ಜೀವಂತ', 'ಇನ್ನೂ ಇದ್ದಾರೆ', 'badukiddare', 'badukiddaare',
    'বেঁচে আছ', 'জীবিত', 'benche achen', 'benche achhen', 'beche ache',
    'જીવે છે', 'હયાત', 'જીવિત', 'જીવંત', 'jive che', 'jive chhe', 'hayat',
    'زندہ', 'حیات', 'بقید حیات', 'hayaat',
    '还活着', '还在世', '健在', '活着',
    'còn sống', 'vẫn sống',
  ]);
})();

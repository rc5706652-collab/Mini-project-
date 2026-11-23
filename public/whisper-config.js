// English keeps the faster .en model; non-English uses multilingual Whisper.
export const WHISPER_MODEL="Xenova/whisper-tiny.en";
export const MULTILINGUAL_MODEL="Xenova/whisper-tiny";
export const LANGUAGES={en:"english",auto:null,hi:"hindi",kn:"kannada",te:"telugu",ta:"tamil",ml:"malayalam"};
export function resolveWhisperModel(language="en",output="original"){
 const lang=Object.hasOwn(LANGUAGES,language)?language:"en";
 return lang==="en"&&output!=="english"?WHISPER_MODEL:MULTILINGUAL_MODEL;
}
export function whisperCallOptions(modelId=WHISPER_MODEL,language="en",output="original"){
 if(/\.en$/i.test(modelId))return {};
 const options={task:output==="english"?"translate":"transcribe"};
 if(language!=="auto"&&Object.hasOwn(LANGUAGES,language))options.language=LANGUAGES[language];
 return options;
}

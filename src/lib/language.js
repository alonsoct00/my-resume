// language.js
export const languageStore = {
  subscribers: [],
  language: localStorage.getItem("lang") || "es",
  subscribe(callback) {
    this.subscribers.push(callback);
    callback(this.language);
  },
  setLanguage(lang) {
    this.language = lang;
    localStorage.setItem("lang", lang);
    this.subscribers.forEach(cb => cb(lang));
  }
};
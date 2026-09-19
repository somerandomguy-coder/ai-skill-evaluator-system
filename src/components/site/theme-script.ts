/** Shared by the inline <head> script and the toggle so they always agree. */
export const THEME_STORAGE_KEY = "pc-theme";

/**
 * Dark is the default: <html> ships with the `dark` class and this script, which
 * runs in <head> before first paint, removes it only for visitors who chose light.
 */
export const THEME_INIT_SCRIPT = `(function(){try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="light")document.documentElement.classList.remove("dark")}catch(e){}})()`;

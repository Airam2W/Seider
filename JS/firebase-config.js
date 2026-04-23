// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
var _0xa0f=(827099^827098)+(743808^743813);const firebaseConfig={'\u0061\u0070\u0069\u004B\u0065\u0079':"\u0041\u0049\u007A\u0061\u0053\u0079\u0044\u0076\u0033\u005A\u0072\u005A\u0067\u005F\u006A\u0079\u0062\u0069\u0078\u004F\u0050\u0032\u0064\u0044\u0053\u0077\u0036\u004B\u004F\u004C\u004E\u0071\u0065\u004D\u007A\u0079\u0034\u0047\u006B",'\u0061\u0075\u0074\u0068\u0044\u006F\u006D\u0061\u0069\u006E':"\u0073\u0065\u0069\u0064\u0065\u0072\u002D\u0065\u0036\u0030\u0031\u0035\u002E\u0066\u0069\u0072\u0065\u0062\u0061\u0073\u0065\u0061\u0070\u0070\u002E\u0063\u006F\u006D","projectId":"seider-e6015",'\u0073\u0074\u006F\u0072\u0061\u0067\u0065\u0042\u0075\u0063\u006B\u0065\u0074':"\u0073\u0065\u0069\u0064\u0065\u0072\u002D\u0065\u0036\u0030\u0031\u0035\u002E\u0066\u0069\u0072\u0065\u0062\u0061\u0073\u0065\u0073\u0074\u006F\u0072\u0061\u0067\u0065\u002E\u0061\u0070\u0070",'\u006D\u0065\u0073\u0073\u0061\u0067\u0069\u006E\u0067\u0053\u0065\u006E\u0064\u0065\u0072\u0049\u0064':"\u0032\u0036\u0038\u0036\u0032\u0032\u0033\u0037\u0036\u0036\u0032\u0030",'\u0061\u0070\u0070\u0049\u0064':"1:268622376620:web:5cdcb472e21cdecfb67909","measurementId":"\u0047\u002D\u0054\u0054\u0039\u0058\u004A\u0056\u0057\u0052\u004A\u0056"};_0xa0f=(486579^486579)+(931498^931501);


// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

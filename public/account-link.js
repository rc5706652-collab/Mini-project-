import {readProfile,sessionName} from "./account-core.js";
function refresh(){const link=document.getElementById("account-link");if(link)link.textContent=sessionName(readProfile())?"Account":"Sign in";}
refresh();window.addEventListener("pageshow",refresh);

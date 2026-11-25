import {readProfile,sessionName} from "./account-core.js";
function refresh(){if(!sessionName(readProfile())){document.documentElement.dataset.entry="signed-out";location.replace("./account.html");return;}const link=document.getElementById("account-link");if(link)link.textContent="Account";}
refresh();window.addEventListener("pageshow",refresh);document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh();});window.addEventListener("storage",refresh);

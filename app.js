import { ZayaAudio } from "./audio.js";
import { ZayaTools } from "./tools.js";

const socket=io(), audio=new ZayaAudio(), tools=new ZayaTools();
const orb=document.querySelector("#orb"), start=document.querySelector("#start"), stopBtn=document.querySelector("#stop");
const connection=document.querySelector("#connection"), state=document.querySelector("#state"), title=document.querySelector("#title");
const subtitle=document.querySelector("#subtitle"), transcript=document.querySelector("#transcript"), model=document.querySelector("#model");
let active=false;

function mode(name,label,t,s){orb.className=`orb ${name}`;state.textContent=label.toUpperCase();title.textContent=t;subtitle.textContent=s}
function online(v){connection.textContent=v?"Gemini Live":"Offline";connection.className=`connection ${v?"online":"offline"}`}

socket.on("connect",()=>online(true));
socket.on("disconnect",()=>{online(false);stop()});
socket.on("sessionStatus",d=>{if(d.status==="connected"){online(true);model.textContent=`Model: ${d.model||"Live"}`}});
socket.on("inputTranscript",d=>{if(d.text)transcript.textContent=`You: ${d.text}`});
socket.on("outputTranscript",d=>{if(d.text)transcript.textContent=`Zaya: ${d.text}`});
socket.on("audio",async b=>{mode("speaking","Speaking","Zaya is speaking","Jump in whenever you want.");await audio.playPCM24k(b)});
socket.on("interrupted",()=>{audio.stopPlayback();if(active)mode("listening","Listening","I'm listening","Your turn, Kiran.")});
socket.on("turnComplete",()=>{if(active)mode("listening","Listening","Your turn","Go ahead, Kiran.")});
socket.on("toolCalls",async({calls})=>{mode("thinking","Thinking","One second…","Zaya is handling that.");const functionResponses=[];for(const call of calls||[]){const result=await tools.run(call.name,call.args||{});functionResponses.push({id:call.id,name:call.name,response:{result}})}socket.emit("toolResponse",{functionResponses})});
socket.on("serverError",d=>{console.error(d.message);mode("idle","Error","Something went wrong",d.message||"Please try again.")});

async function begin(){
  if(active)return;
  try{
    mode("thinking","Starting","Waking Zaya…","Microphone permission is required.");
    await audio.start(b=>{if(!active)return;audio.stopPlayback();mode("listening","Listening","Zaya is listening","Speak naturally.");socket.emit("audio",b)});
    active=true;start.disabled=true;stopBtn.disabled=false;
    mode("listening","Listening","Zaya is listening","Your turn, Kiran.");
  }catch(e){mode("idle","Permission","Microphone permission needed",e?.message||"Allow microphone access and try again.")}
}
function stop(){active=false;audio.stop();start.disabled=false;stopBtn.disabled=true;mode("idle","Idle","Tap to wake Zaya","Voice-first AI, created by Kiran.")}
start.addEventListener("click",begin);stopBtn.addEventListener("click",stop);orb.addEventListener("click",begin);

export class ZayaAudio{
  constructor(){this.inputContext=null;this.outputContext=null;this.stream=null;this.source=null;this.processor=null;this.playback=new Set();this.nextPlayTime=0}
  async start(onChunk){
    this.stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    this.inputContext=new AudioContext();await this.inputContext.resume();
    this.source=this.inputContext.createMediaStreamSource(this.stream);
    this.processor=this.inputContext.createScriptProcessor(4096,1,1);
    this.processor.onaudioprocess=e=>{const pcm=resample16k(e.inputBuffer.getChannelData(0),this.inputContext.sampleRate);if(pcm.length)onChunk(toB64(pcm))};
    const silent=this.inputContext.createGain();silent.gain.value=0;this.source.connect(this.processor);this.processor.connect(silent);silent.connect(this.inputContext.destination);
  }
  async playPCM24k(base64){
    if(!this.outputContext)this.outputContext=new AudioContext();await this.outputContext.resume();
    const bytes=fromB64(base64), samples=new Int16Array(bytes.buffer,bytes.byteOffset,Math.floor(bytes.byteLength/2));
    const buffer=this.outputContext.createBuffer(1,samples.length,24000), channel=buffer.getChannelData(0);
    for(let i=0;i<samples.length;i++)channel[i]=samples[i]/32768;
    const node=this.outputContext.createBufferSource();node.buffer=buffer;node.connect(this.outputContext.destination);
    const at=Math.max(this.outputContext.currentTime+.015,this.nextPlayTime);node.start(at);this.nextPlayTime=at+buffer.duration;
    this.playback.add(node);node.onended=()=>this.playback.delete(node);
  }
  stopPlayback(){for(const n of this.playback){try{n.stop()}catch{}}this.playback.clear();if(this.outputContext)this.nextPlayTime=this.outputContext.currentTime}
  stop(){this.stopPlayback();try{this.processor?.disconnect()}catch{}try{this.source?.disconnect()}catch{}this.stream?.getTracks().forEach(t=>t.stop());this.processor=null;this.source=null;this.stream=null;this.inputContext?.close().catch(()=>{});this.inputContext=null}
}
function resample16k(input,rate){if(rate===16000)return toInt16(input);const ratio=rate/16000,len=Math.max(1,Math.floor(input.length/ratio)),out=new Int16Array(len);for(let i=0;i<len;i++){const p=i*ratio,l=Math.floor(p),r=Math.min(l+1,input.length-1),w=p-l;out[i]=clamp(input[l]*(1-w)+input[r]*w)}return out}
function toInt16(a){const o=new Int16Array(a.length);for(let i=0;i<a.length;i++)o[i]=clamp(a[i]);return o}
function clamp(v){const x=Math.max(-1,Math.min(1,v));return x<0?x*32768:x*32767}
function toB64(buf){const b=new Uint8Array(buf.buffer,buf.byteOffset,buf.byteLength);let s="";for(let i=0;i<b.length;i+=32768)s+=String.fromCharCode(...b.subarray(i,i+32768));return btoa(s)}
function fromB64(s){const b=atob(s),o=new Uint8Array(b.length);for(let i=0;i<b.length;i++)o[i]=b.charCodeAt(i);return o}

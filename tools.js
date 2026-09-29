export class ZayaTools{
  async run(name,args){
    switch(name){
      case"openApp":return this.openApp(args.appName);
      case"callNumber":return this.callNumber(args.phoneNumber);
      case"sendWhatsAppMessage":return this.sendWhatsAppMessage(args.phoneNumber,args.message);
      case"sendEmail":return this.sendEmail(args.recipientEmail,args.subject,args.body);
      default:return{ok:false,error:`Unknown tool: ${name}`};
    }
  }
  openApp(appName=""){
    const n=String(appName).trim().toLowerCase(),sites={youtube:"https://www.youtube.com/",instagram:"https://www.instagram.com/",gmail:"https://mail.google.com/",calculator:"https://www.google.com/search?q=calculator"};
    const url=sites[n]||(/^https?:\/\//i.test(appName)?appName:null);
    if(!url)return{ok:false,error:"Only supported websites or explicit URLs can be opened from a browser."};
    window.open(url,"_blank","noopener,noreferrer");return{ok:true,opened:url};
  }
  callNumber(phoneNumber=""){
    const number=String(phoneNumber).replace(/[^\d+]/g,"");if(!number)return{ok:false,error:"A valid phone number is required."};
    window.location.href=`tel:${encodeURIComponent(number)}`;return{ok:true,opened:`tel:${number}`};
  }
  sendWhatsAppMessage(phoneNumber="",message=""){
    const number=String(phoneNumber).replace(/\D/g,"");if(!number)return{ok:false,error:"Use a phone number with country code."};
    const url=`https://wa.me/${number}?text=${encodeURIComponent(String(message))}`;
    window.open(url,"_blank","noopener,noreferrer");return{ok:true,opened:url,note:"WhatsApp opened with the message pre-filled; the user must confirm sending."};
  }
  sendEmail(recipientEmail="",subject="",body=""){
    const email=String(recipientEmail).trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return{ok:false,error:"Invalid email address."};
    window.location.href=`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return{ok:true,opened:"mailto",recipientEmail:email};
  }
}

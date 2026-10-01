import { CompactEncrypt, compactDecrypt } from "jose";
import { config } from "./config";
const enc=new TextEncoder(); const dec=new TextDecoder(); let keyPromise:Promise<Uint8Array>|undefined;
async function key(){if(!keyPromise){keyPromise=crypto.subtle.digest("SHA-256",enc.encode(config.authSecret)).then(x=>new Uint8Array(x));}return keyPromise;}
export async function seal<T extends object>(kind:string,data:T,ttlSeconds:number){const now=Math.floor(Date.now()/1000);const payload={...data,kind,iat:now,exp:now+ttlSeconds};return new CompactEncrypt(enc.encode(JSON.stringify(payload))).setProtectedHeader({alg:"dir",enc:"A256GCM"}).encrypt(await key());}
export async function unseal<T extends object>(token:string,expectedKind:string):Promise<T&{kind:string;iat:number;exp:number}>{const {plaintext}=await compactDecrypt(token,await key());const data=JSON.parse(dec.decode(plaintext));if(data.kind!==expectedKind)throw new Error("invalid_token_kind");if(!data.exp||data.exp<=Math.floor(Date.now()/1000))throw new Error("expired_token");return data;}
export async function sha256base64url(value:string){const digest=new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(value)));let s="";for(const b of digest)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}
export function timingSafeEqualString(a:string,b:string){const aa=enc.encode(a),bb=enc.encode(b);if(aa.length!==bb.length)return false;let diff=0;for(let i=0;i<aa.length;i++)diff|=aa[i]^bb[i];return diff===0;}

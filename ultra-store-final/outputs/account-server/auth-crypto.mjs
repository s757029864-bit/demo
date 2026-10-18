import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
export function encodePassword(password){const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(password,salt,32).toString('hex')}
export function verify(password,encoded){try{const [salt,key]=encoded.split(':');const got=scryptSync(password,salt,32),want=Buffer.from(key,'hex');return got.length===want.length&&timingSafeEqual(got,want)}catch{return false}}
export const passOK=p=>typeof p==='string'&&p.length>=12&&p.length<=128;

import fs from 'node:fs';
const counter=process.env.DREAM_VERIFIER_TEST_COUNTER;
let attempt=0;try{attempt=Number(fs.readFileSync(counter,'utf8'))}catch{}
fs.writeFileSync(counter,String(++attempt));
if(!process.argv.includes('--verify')||!process.argv.includes('theme with spaces'))throw Error('Arguments lost while starting verifier');
if(process.env.DREAM_VERIFIER_TEST_MODE==='hang'){setInterval(()=>{},1000)}
else if(process.env.DREAM_VERIFIER_TEST_MODE==='fail'||attempt<3){
 await Promise.all([new Promise(r=>process.stdout.write('x'.repeat(100000),r)),new Promise(r=>process.stderr.write('simulated renderer reload\n'+'e'.repeat(100000),r))]);
 process.exitCode=2;
}else{console.log(JSON.stringify({pass:true,attempt}))}

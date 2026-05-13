const monthNames=[
'Januari','Februari','Mars','April','Maj','Juni',
'Juli','Augusti','September','Oktober','November','December'
];

let currentDate=new Date();
currentDate.setDate(1);

let masterJobs=[];

function pad(n){
return String(n).padStart(2,'0');
}

function formatDate(d){
return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
}

function parseDate(str){
const p=str.split('-');
return new Date(Number(p[0]),Number(p[1])-1,Number(p[2]));
}

function isWeekend(d){
return d.getDay()===0 || d.getDay()===6;
}

function moveToWorkday(d){
let x=new Date(d);
while(isWeekend(x)){
x.setDate(x.getDate()+1);
}
return x;
}

function nextWorkday(d){
let x=new Date(d);
x.setDate(x.getDate()+1);
while(isWeekend(x)){
x.setDate(x.getDate()+1);
}
return x;
}

function setMessage(text,bad=false){
const msg=document.getElementById('message');
msg.innerText=text;
msg.style.color=bad?'#ff6b6b':'#7ee787';
}

async function apiGetJobs(){
const res=await fetch('/api/jobs');
if(!res.ok){
throw new Error('Kunde inte hämta jobb från databasen.');
}
return await res.json();
}

async function apiCreateJob(job){
const res=await fetch('/api/jobs',{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify(job)
});

if(!res.ok){
throw new Error('Kunde inte spara jobbet.');
}
}

async function apiUpdateJob(job){
const res=await fetch('/api/jobs/'+job.id,{
method:'PUT',
headers:{'Content-Type':'application/json'},
body:JSON.stringify(job)
});

if(!res.ok){
throw new Error('Kunde inte ändra jobbet.');
}
}

async function apiDeleteJob(id){
const res=await fetch('/api/jobs/'+id,{method:'DELETE'});

if(!res.ok){
throw new Error('Kunde inte ta bort jobbet.');
}
}

async function apiClearJobs(){
const res=await fetch('/api/jobs',{method:'DELETE'});

if(!res.ok){
throw new Error('Kunde inte rensa alla jobb.');
}
}

function buildSchedule(jobs){
let allParts=[];

['1','2'].forEach(machine=>{

let usedPerDay={};

let machineJobs=jobs
.filter(j=>j.machine===machine)
.sort((a,b)=>Number(a.order)-Number(b.order));

machineJobs.forEach(job=>{

let remaining=Number(job.hours);

let d=moveToWorkday(parseDate(job.startDate));

let lastDate=null;

while(remaining>0){

d=moveToWorkday(d);

let dText=formatDate(d);

if(!usedPerDay[dText]){
usedPerDay[dText]=0;
}

let freeHours=8-usedPerDay[dText];

if(freeHours<=0){
d=nextWorkday(d);
continue;
}

let dayHours=Math.min(freeHours,remaining);

allParts.push({
id:job.id,
name:job.name,
machine:job.machine,
date:dText,
hours:dayHours,
deliveryDate:job.deliveryDate
});

usedPerDay[dText]+=dayHours;

remaining-=dayHours;

lastDate=dText;

if(remaining>0){
d=nextWorkday(d);
}

}

let finishDate=parseDate(lastDate);

let delivery=parseDate(job.deliveryDate);

if(finishDate>delivery){
throw new Error('Jobbet "'+job.name+'" blir klart '+formatDate(finishDate)+' men leveransdatum är '+job.deliveryDate);
}

});

});

return allParts;
}

async function refresh(){
try{
masterJobs=await apiGetJobs();
renderCalendar();
}catch(e){
setMessage(e.message,true);
}
}

async function addJob(){
const name=document.getElementById('jobName').value.trim();
const startDate=document.getElementById('startDate').value;
const deliveryDate=document.getElementById('deliveryDate').value;
const hours=parseInt(document.getElementById('hours').value);
const machine=document.getElementById('machine').value;
const insertMode=document.getElementById('insertMode').value;

if(!name || !startDate || !deliveryDate || !hours){
alert('Fyll i jobbnamn, startdatum, leveransdatum, timmar och maskin.');
return;
}

let jobs=[...masterJobs];

let newJob={
id:String(Date.now())+Math.random(),
name:name,
startDate:startDate,
deliveryDate:deliveryDate,
hours:hours,
machine:machine,
order:Date.now()
};

if(insertMode==='between'){
const insertDate=parseDate(startDate);

jobs.forEach(j=>{

if(j.machine===machine && parseDate(j.startDate)>=insertDate){
j.order=Number(j.order)+1000000000;
}

});

newJob.order=Date.now()-1000000000;
}

let testJobs=jobs.concat([newJob]);

try{
buildSchedule(testJobs);
}catch(e){
setMessage('Går inte: '+e.message,true);
alert('Går inte att lägga in. '+e.message);
return;
}

try{

const changedJobs=jobs.filter(j=>{
const old=masterJobs.find(x=>x.id===j.id);
return old && Number(old.order)!==Number(j.order);
});

for(const j of changedJobs){
await apiUpdateJob(j);
}

await apiCreateJob(newJob);

document.getElementById('jobName').value='';
document.getElementById('hours').value='';

currentDate=parseDate(startDate);
currentDate.setDate(1);

setMessage('Jobbet är sparat i databasen.');

await refresh();

}catch(e){
setMessage(e.message,true);
}
}

async function editJob(jobId){
let job=masterJobs.find(j=>j.id===jobId);

if(!job){
alert('Jobbet hittades inte.');
return;
}

let newName=prompt('Jobbnamn:',job.name);
if(newName===null) return;

newName=newName.trim();

if(!newName){
alert('Jobbnamn får inte vara tomt.');
return;
}

let newStart=prompt('Startdatum:',job.startDate);
if(newStart===null) return;

let newDelivery=prompt('Leveransdatum:',job.deliveryDate);
if(newDelivery===null) return;

let newHours=prompt('Timmar:',job.hours);
if(newHours===null) return;

newHours=parseInt(newHours);

let newMachine=prompt('Maskin: skriv 1 eller 2',job.machine);
if(newMachine===null) return;

if(newMachine!=='1' && newMachine!=='2'){
alert('Maskin måste vara 1 eller 2.');
return;
}

let updatedJob={
...job,
name:newName,
startDate:newStart,
deliveryDate:newDelivery,
hours:newHours,
machine:newMachine
};

let updatedJobs=masterJobs.map(j=>{
if(j.id===jobId){
return updatedJob;
}
return j;
});

try{
buildSchedule(updatedJobs);
}catch(e){
alert('Ändringen går inte. '+e.message);
setMessage('Ändringen går inte: '+e.message,true);
return;
}

try{
await apiUpdateJob(updatedJob);

currentDate=parseDate(newStart);
currentDate.setDate(1);

setMessage('Jobbet är ändrat och sparat.');

await refresh();

}catch(e){
setMessage(e.message,true);
}
}

async function deleteJob(jobId){
if(!confirm('Vill du ta bort hela jobbet?')){
return;
}

try{
await apiDeleteJob(jobId);
setMessage('Jobbet är borttaget.');
await refresh();
}catch(e){
setMessage(e.message,true);
}
}

function editOrDeleteJob(jobId){
let choice=prompt('Skriv ÄNDRA för att redigera eller TA BORT för att radera jobbet:','ÄNDRA');

if(choice===null){
return;
}

choice=choice.toLowerCase();

if(choice==='ändra' || choice==='andra' || choice==='a'){
editJob(jobId);
return;
}

if(choice==='ta bort' || choice==='tabort' || choice==='bort' || choice==='radera'){
deleteJob(jobId);
return;
}

alert('Inget ändrades.');
}

async function clearJobs(){
if(!confirm('Vill du rensa alla jobb?')){
return;
}

try{
await apiClearJobs();
setMessage('Alla jobb är rensade.');
await refresh();
}catch(e){
setMessage(e.message,true);
}
}

function prevMonth(){
currentDate.setMonth(currentDate.getMonth()-1);
renderCalendar();
}

function nextMonth(){
currentDate.setMonth(currentDate.getMonth()+1);
renderCalendar();
}

function renderCalendar(){
document.getElementById('monthTitle').innerText=
monthNames[currentDate.getMonth()]+' '+currentDate.getFullYear();

const calendar=document.getElementById('calendar');

calendar.innerHTML='';

const year=currentDate.getFullYear();

const month=currentDate.getMonth();

const firstDay=new Date(year,month,1);

const offset=(firstDay.getDay()+6)%7;

const startDate=new Date(year,month,1-offset);

let parts=[];

try{
parts=buildSchedule(masterJobs);
}catch(e){
setMessage(e.message,true);
}

for(let i=0;i<42;i++){

const d=new Date(startDate);

d.setDate(startDate.getDate()+i);

const cell=document.createElement('div');

cell.className='day';

if(d.getMonth()!==month){
cell.classList.add('other');
}

if(isWeekend(d)){
cell.classList.add('weekend');
}

const num=document.createElement('div');

num.className='day-number';

num.innerText=d.getDate();

cell.appendChild(num);

const dayParts=parts.filter(p=>p.date===formatDate(d));

dayParts.forEach(p=>{

const div=document.createElement('div');

div.className='job '+(p.machine==='1'?'machine1':'machine2');

div.innerText=p.name+' '+p.hours+'h';

div.onclick=function(){
editOrDeleteJob(p.id);
};

cell.appendChild(div);

});

calendar.appendChild(cell);

}

}

document.getElementById('startDate').value=formatDate(new Date());

document.getElementById('deliveryDate').value=formatDate(new Date());

refresh();

const monthNames=[
'Januari','Februari','Mars','April','Maj','Juni',
'Juli','Augusti','September','Oktober','November','December'
];

let currentDate=new Date();
currentDate.setDate(1);

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

function loadJobs(){
return JSON.parse(localStorage.getItem('fals_master_jobs')||'[]');
}

function saveJobs(jobs){
localStorage.setItem('fals_master_jobs',JSON.stringify(jobs));
}

function setMessage(text,bad=false){
const msg=document.getElementById('message');
msg.innerText=text;
msg.style.color=bad?'#ff6b6b':'#7ee787';
}

function buildSchedule(jobs){

const WORK_START_MINUTES = 5 * 60 + 45;
const WORK_END_MINUTES = 14 * 60 + 30;
const DAY_CAPACITY = WORK_END_MINUTES - WORK_START_MINUTES;

let allParts=[];

function formatTime(mins){
let h=Math.floor(mins/60);
let m=mins%60;
return pad(h)+':'+pad(m);
}

['1','2'].forEach(machine=>{

let usedPerDay={};

let machineJobs=jobs
.filter(j=>j.machine===machine)
.sort((a,b)=>{
const dateCompare=parseDate(a.startDate)-parseDate(b.startDate);
if(dateCompare!==0){
return dateCompare;
}
return a.order-b.order;
});

machineJobs.forEach(job=>{

let remaining=Math.round(Number(job.hours)*60);
let d=moveToWorkday(parseDate(job.startDate));
let lastDate=null;

while(remaining>0){

d=moveToWorkday(d);

let dText=formatDate(d);

if(!usedPerDay[dText]){
usedPerDay[dText]=0;
}

let usedToday=usedPerDay[dText];
let freeMinutes=DAY_CAPACITY-usedToday;

if(freeMinutes<=0){
d=nextWorkday(d);
continue;
}

let partMinutes=Math.min(freeMinutes,remaining);
let startMinutes=WORK_START_MINUTES+usedToday;
let endMinutes=startMinutes+partMinutes;

allParts.push({
id:job.id,
name:job.name,
machine:job.machine,
date:dText,
hours:(partMinutes/60).toFixed(1),
startTime:formatTime(startMinutes),
endTime:formatTime(endMinutes),
deliveryDate:job.deliveryDate
});

usedPerDay[dText]+=partMinutes;
remaining-=partMinutes;
lastDate=dText;

if(remaining>0){
d=nextWorkday(d);
}

}

let finishDate=parseDate(lastDate);
let delivery=parseDate(job.deliveryDate);

if(finishDate>delivery){
throw new Error(
'Jobbet "'+job.name+
'" blir klart '+formatDate(finishDate)+
' men leveransdatum är '+job.deliveryDate
);
}

});

});

return allParts;
}

function addJob(){

const name=document.getElementById('jobName').value.trim();
const startDate=document.getElementById('startDate').value;
const deliveryDate=document.getElementById('deliveryDate').value;
const hours=parseFloat(document.getElementById('hours').value);
const machine=document.getElementById('machine').value;
const insertMode=document.getElementById('insertMode').value;

if(!name || !startDate || !deliveryDate || !hours){
alert('Fyll i alla fält.');
return;
}

let jobs=loadJobs();

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
j.order=j.order+1000000000;
}
});

newJob.order=Date.now()-1000000000;
}

let testJobs=jobs.concat([newJob]);

try{
buildSchedule(testJobs);
}catch(e){
setMessage(e.message,true);
alert(e.message);
return;
}

saveJobs(testJobs);

document.getElementById('jobName').value='';
document.getElementById('hours').value='';

currentDate=parseDate(startDate);
currentDate.setDate(1);

setMessage('Jobbet tillagt.');
renderCalendar();
}

function openEdit(jobId){

let jobs=loadJobs();
let job=jobs.find(j=>j.id===jobId);

if(!job){
return;
}

document.getElementById('editId').value=job.id;
document.getElementById('editName').value=job.name;
document.getElementById('editStart').value=job.startDate;
document.getElementById('editDelivery').value=job.deliveryDate;
document.getElementById('editHours').value=job.hours;
document.getElementById('editMachine').value=job.machine;

document.getElementById('editModal').style.display='flex';
}

function closeEdit(){
document.getElementById('editModal').style.display='none';
}

function saveEdit(){

let jobs=loadJobs();
let id=document.getElementById('editId').value;

let updatedJobs=jobs.map(j=>{

if(j.id===id){

return{
...j,
name:document.getElementById('editName').value,
startDate:document.getElementById('editStart').value,
deliveryDate:document.getElementById('editDelivery').value,
hours:parseFloat(document.getElementById('editHours').value),
machine:document.getElementById('editMachine').value
};

}

return j;

});

try{
buildSchedule(updatedJobs);
}catch(e){
alert(e.message);
setMessage(e.message,true);
return;
}

saveJobs(updatedJobs);
closeEdit();

setMessage('Jobbet ändrat.');
renderCalendar();
}

function deleteEditJob(){

if(!confirm('Ta bort jobbet?')){
return;
}

let id=document.getElementById('editId').value;
let jobs=loadJobs().filter(j=>j.id!==id);

saveJobs(jobs);
closeEdit();

setMessage('Jobbet borttaget.');
renderCalendar();
}

function clearJobs(){

if(confirm('Rensa alla jobb?')){
localStorage.removeItem('fals_master_jobs');
renderCalendar();
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
parts=buildSchedule(loadJobs());
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

div.innerText=p.startTime+'-'+p.endTime+' '+p.name+' '+p.hours+'h';

div.onclick=function(){
openEdit(p.id);
};

cell.appendChild(div);

});

calendar.appendChild(cell);

}

}

document.getElementById('startDate').value=formatDate(new Date());
document.getElementById('deliveryDate').value=formatDate(new Date());

renderCalendar();

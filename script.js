const monthNames=[
'Januari',
'Februari',
'Mars',
'April',
'Maj',
'Juni',
'Juli',
'Augusti',
'September',
'Oktober',
'November',
'December'
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
return new Date(p[0],p[1]-1,p[2]);
}

function loadJobs(){
return JSON.parse(localStorage.getItem('fals_jobs')||'[]');
}

function saveJobs(j){
localStorage.setItem('fals_jobs',JSON.stringify(j));
}

function isWeekend(d){
return d.getDay()===0 || d.getDay()===6;
}

function nextWorkday(d){

let x=new Date(d);

x.setDate(x.getDate()+1);

while(isWeekend(x)){
x.setDate(x.getDate()+1);
}

return x;
}

function addJob(){

const name=document.getElementById('jobName').value.trim();

const start=document.getElementById('startDate').value;

const hours=parseInt(document.getElementById('hours').value);

const machine=document.getElementById('machine').value;

if(!name || !start || !hours){

alert('Fyll i alla fält');

return;
}

let jobs=loadJobs();

let remaining=hours;

let d=parseDate(start);

while(isWeekend(d)){
d=nextWorkday(d);
}

while(remaining>0){

let dayHours=Math.min(8,remaining);

jobs.push({
name:name,
date:formatDate(d),
hours:dayHours,
machine:machine
});

remaining-=dayHours;

if(remaining>0){
d=nextWorkday(d);
}

}

saveJobs(jobs);

renderCalendar();
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

const jobs=loadJobs();

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

num.innerText=d.getDate();

cell.appendChild(num);

const dayJobs=jobs.filter(j=>j.date===formatDate(d));

dayJobs.forEach(j=>{

const div=document.createElement('div');

div.className='job '+(j.machine==='1'?'machine1':'machine2');

div.innerText=j.name+' '+j.hours+'h';

cell.appendChild(div);

});

calendar.appendChild(cell);

}

}

document.getElementById('startDate').value=formatDate(new Date());

renderCalendar();

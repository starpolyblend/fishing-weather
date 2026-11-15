// Separate from forecast modules so update still works if those modules fail.
(()=>{
 const button=document.querySelector('#update-site');
 if(!button)return;
 button.addEventListener('click',()=>{
  if(button.disabled)return;
  button.disabled=true;
  button.querySelector('span').textContent='불러오는 중';
  window.location.reload();
 });
})();

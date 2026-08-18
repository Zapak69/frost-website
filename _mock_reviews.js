window.addEventListener('load', function(){
  const rf = window.fetch;
  window.fetch = function(u,o){
    if(String(u).indexOf('reviews')!==-1 || String(u).indexOf('Review')!==-1){
      return Promise.resolve({json:()=>Promise.resolve({ok:true,reviews:[
        {username:'Zipp',stars:5,comment:'Great client, huge FPS boost!',fpsBefore:40,fpsAfter:140,submittedAt:Date.now(),lite:false}
      ]})});
    }
    return rf?rf(u,o):Promise.reject();
  };
});

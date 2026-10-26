const express=require("express");
const http=require("http");
const {Server}=require("socket.io");
const app=express(), server=http.createServer(app), io=new Server(server);
const PORT=process.env.PORT||3000, rooms=new Map(), MAX=5;
app.use(express.static("public"));
function snapshot(r){return {code:r.code,players:[...r.players.values()].map(p=>({id:p.id,name:p.name,x:p.x,y:p.y,hp:p.hp,color:p.color}))};}
function add(socket,room,name){
 const colors=["#ff5b5b","#4c9aff","#50d890","#ffca4c","#c084fc"];
 room.players.set(socket.id,{id:socket.id,name:String(name||"Pemain").slice(0,18),x:10+Math.random()*80,y:10+Math.random()*80,hp:100,color:colors[room.players.size%colors.length]});
 socket.data.roomCode=room.code;socket.join(room.code);io.to(room.code).emit("state",snapshot(room));
}
io.on("connection",socket=>{
 socket.on("createRoom",(data={},reply=()=>{})=>{let code;do{code=Math.random().toString(36).slice(2,6).toUpperCase();}while(rooms.has(code));const r={code,players:new Map()};rooms.set(code,r);add(socket,r,data.name);reply({ok:true,code});});
 socket.on("joinRoom",(data={},reply=()=>{})=>{const r=rooms.get(String(data.code||"").trim().toUpperCase());if(!r)return reply({ok:false,error:"Ruangan tidak ditemukan."});if(r.players.size>=MAX)return reply({ok:false,error:"Ruangan penuh (maksimal 5 pemain)."});add(socket,r,data.name);reply({ok:true,code:r.code});});
 socket.on("move",data=>{const r=rooms.get(socket.data.roomCode),p=r&&r.players.get(socket.id);if(!p)return;p.x=Math.max(4,Math.min(96,Number(data.x)||p.x));p.y=Math.max(4,Math.min(96,Number(data.y)||p.y));io.to(r.code).emit("state",snapshot(r));});
 socket.on("attack",data=>{const r=rooms.get(socket.data.roomCode),a=r&&r.players.get(socket.id),t=r&&r.players.get(data.targetId);if(!a||!t||a.id===t.id)return;t.hp=Math.max(0,t.hp-10);io.to(r.code).emit("state",snapshot(r));});
 socket.on("disconnect",()=>{const code=socket.data.roomCode,r=rooms.get(code);if(!r)return;r.players.delete(socket.id);if(!r.players.size)rooms.delete(code);else io.to(code).emit("state",snapshot(r));});
});
server.listen(PORT,()=>console.log("Server listening on "+PORT));

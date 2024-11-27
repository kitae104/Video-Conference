const express = require('express'); 
const app = express(); 
const server = require('http').Server(app); 
const fs = require('fs'); 
server.listen(process.env.PORT || 8080);

app.use(express.static('public'));  // 정적 파일은 public 폴더에 넣도록 설정 
app.set('view engine', 'ejs');  // ejs를 사용하도록 설정

app.get('/', (req, res) => {
    res.render('frontpage');  // frontpage
});

const { v4: uuidv4 } = require('uuid');
let un, pc;

//=========================================================
// 새로운방 만들기
//=========================================================
app.get('/newroom', (req, res) => {
    un = req.query.username;
    pc = req.query.passcode;
    let roomId = uuidv4();      // 새로운 방의 ID 생성
    fs.appendFileSync("public/meeting-log.txt", roomId + ":" + pc + "\n", "utf-8"); // 방 정보를 로그에 기록
    res.redirect(`/${roomId}`); // 새로운 방을 만들고 방으로 리다이렉트
});

//=========================================================
// 방에 들어가기 
//=========================================================
app.get('/:room', (req, res) => {
    res.render('meeting-room', {
        roomId: req.params.room,
        username: un,
    });
});
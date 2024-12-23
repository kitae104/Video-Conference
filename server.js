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

let unJ, inJ, pcJ;
app.get('/joinroom', (req, res) => {
    unJ = req.query.username;
    inJ = req.query.invitation;
    pcJ = req.query.passcode;
    let log = fs.readFileSync("public/meeting-log.txt", "utf-8");
    let findInvitation = log.indexOf(inJ + ":" + pcJ);
    if (findInvitation != -1) {
        res.redirect(`/${inJ}`);
        un = unJ,
        pc = pcJ
    } else {
        let findInvitation = log.indexOf(inJ);
        if (findInvitation == -1) {
            res.send("Invalid invitation. Please <a href=/>go back</a>");
        } else {
            let findPassCode = log.indexOf(inJ + ":" + pcJ);
            if (findPassCode == -1) {
                res.send("Invalid password. Please <a href=/>go back</a>");
            }
        }
    }
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

const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, {
    debug: true
});
app.use('/peerjs', peerServer);

const io = require('socket.io')(server);
io.on('connection', socket => {
    socket.on('join-room', (roomId, peerId) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-connected', peerId);

        // 화면 공유
        socket.on('stop-screen-share', (peerId) => {
            socket.to(roomId).emit('no-share', peerId);
        });

        // 채팅 기능
        socket.on('message', (message, sender, color, time) => {
            io.to(roomId).emit('createMessage', message, sender, color, time);
        });

        // 채팅방 나가기 
        socket.on('leave-meeting', (peerId, peerName) => {
            io.to(roomId).emit('user-leave', peerId, peerName);
        });
    });
});

app.post('/upload', (req, res) => {
    let fileName = req.headers['file-name'];  // 요청 헤더에서 파일 이름 추출        

    // 데이터 청크 수신 이벤트
    req.on('data', (chunk) => {
        fs.appendFileSync(__dirname + '/public/uploaded-files/' + fileName, chunk);
    })
    
    res.end('uploaded');

    // req.on('data', (chunk) => {
    //     // 수신된 청크 데이터를 파일에 추가(비동기 처리)
    //     fs.appendFile(__dirname + '/public/uploaded-files/' + fileName, chunk, (err) => {
    //         if (err) {
    //             console.error('Error appending file:', err);
    //             res.status(500).end('Error');
    //         }
    //     });
    // });

    // req.on('end', () => {
    //     res.end('uploaded');
    // });
});
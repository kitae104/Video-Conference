const videoGrid = document.getElementById('video-grid');
let myVideoStream;

async function getMedia() {
    try {
        const stream =
            await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true
            });
        myVideoStream = stream;
        addVideo("my-label-mini-vid", USERNAME, myVideoStream);
        changeMainVideo(stream);
    } catch (err) { }
}
getMedia();

function addVideo(labelMiniVidId, username, stream) {
    const video = document.createElement('video');
    video.className = "vid";
    video.srcObject = stream;
    
    video.addEventListener('loadedmetadata', () => {
        video.play();
    })
    video.addEventListener('click', () => {
        changeMainVideo(stream);
    })
    
    const labelMiniVid = document.createElement('div');
    labelMiniVid.id = labelMiniVidId;
    labelMiniVid.className = "label-mini-vid";
    labelMiniVid.innerHTML = username;
    const miniVid = document.createElement('div');
    miniVid.className = "mini-vid";
    miniVid.append(video);
    miniVid.append(labelMiniVid);
    videoGrid.append(miniVid);

    // countUser();
}

const mainVid = document.getElementById("main-video");
function changeMainVideo(stream) {
    mainVid.srcObject = stream;
}

const socket = io('/');
let myPeerId;
let peerList = [];
let peer = new Peer(undefined, {
    path: '/peerjs',
    host: '/',
    port: '8088'
}); 
peer.on('open', id => {
    socket.emit('join-room', ROOM_ID, id);
    myPeerId = id;
    peerList[id] = USERNAME;
})

socket.on('user-connected', (peerId) => {
    connecToOther(peerId, myVideoStream);
})

let sharedStream;
const connecToOther = (peerId, stream) => {
    const call = peer.call(peerId, stream);
    peerList[call.peer] = "";
    let i = 1;
    call.on('stream', userVideoStream => {
        if (i <= 1) {
            addVideo(call.peer, "", userVideoStream);
            // let conn = peer.connect(peerId);
            // conn.on('open', function () {
            //     conn.send(myPeerId + "," + USERNAME);
            // });
        }
        i++;
    })

    // if (shareState == 1) {
    //     const call1 = peer.call(peerId, sharedStream);
    // }
}

let myVideoStream1;
peer.on('call', call => {
    navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
    }).then(stream => {
        myVideoStream1 = stream;
        call.answer(stream);
        let conn = peer.connect(call.peer);
        conn.on('open', function () {
            conn.send(myPeerId + "," + USERNAME);
        });
    })

    peerList[call.peer] = "";

    // if (peerList.hasOwnProperty(call.peer) == false) {
    //     let i = 1;
    //     call.on('stream', userVideoStream => {
    //         if (i <= 1) {
    //             addVideo(call.peer, "", userVideoStream);
    //         } i++;
    //     })
    //     peerList[call.peer] = "";
    // } else {
    //     call.on('stream', userVideoStream => {
    //         changeMainVideo(userVideoStream);
    //         streamBack = userVideoStream;
    //         document.getElementById("shareControl").onclick = getSharedVideo;
    //         document.getElementById("shareText").innerHTML = "Back in";
    //     })
    // }
})

let peerName;
peer.on('connection', function (conn) {
    conn.on('data', function (data) {
        let message = data.split(",");
        peerList[message[0]] = message[1];
        document.getElementById(message[0]).innerHTML = message[1];
    });
});
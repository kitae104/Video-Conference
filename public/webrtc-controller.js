const videoGrid = document.getElementById('video-grid');
let myVideoStream;

// WebRTC에서 MediaStream API를 사용하여 사용자의 디바이스에서
// 오디오와 비디오 스트림을 가져오는 비동기 함수
async function getMedia() {
	try {
		// 비동기 작업이 완료될 때까지 기다림
		const stream = await navigator.mediaDevices.getUserMedia({
			// 브라우저에서 사용자 디바이스의 미디어 입력을 요청
			audio: true,
			video: true,
		});
		myVideoStream = stream; // 가져온 MediaStream 객체를 전역 변수 myVideoStream에 저장
		addVideo('my-label-mini-vid', USERNAME, myVideoStream); // 사용자 비디오를 UI에 추가하는 함수 호출
		changeMainVideo(stream); // 가져온 스트림을 메인 비디오 화면으로 전환하는 함수
	} catch (err) {}
}
getMedia();

// 특정 사용자에 대한 비디오 스트림과 해당 사용자의 이름을 UI에 추가하는 기능을 구현
// 주로 화상 회의 앱에서 사용자의 비디오를 화면에 표시할 때 사용
function addVideo(labelMiniVidId, username, stream) {
	// 1. 비디오 요소 생성
	const video = document.createElement('video');
	video.className = 'vid'; // 비디오에 클래스 추가
	video.srcObject = stream; // 비디오 소스 설정 (MediaStream 연결)

	// 2. 메타데이터 로드 후 비디오 재생
	video.addEventListener('loadedmetadata', () => {
		video.play(); // 비디오 자동 재생
	});

	// 3. 비디오 클릭 이벤트: 메인 비디오 변경
	video.addEventListener('click', () => {
		changeMainVideo(stream); // 클릭 시 메인 비디오 전환
	});

	// 4. 사용자 이름을 포함할 div 요소 생성
	const labelMiniVid = document.createElement('div');
	labelMiniVid.id = labelMiniVidId; // 사용자 라벨에 ID 설정
	labelMiniVid.className = 'label-mini-vid'; // CSS 클래스 추가
	labelMiniVid.innerHTML = username; // 사용자 이름 표시

	// 5. 비디오와 라벨을 포함할 컨테이너 div 생성
	const miniVid = document.createElement('div');
	miniVid.className = 'mini-vid'; // 비디오 컨테이너에 클래스 추가
	miniVid.append(video); // 비디오 추가
	miniVid.append(labelMiniVid); // 사용자 이름 라벨 추가

	// 6. 비디오 컨테이너를 비디오 그리드에 추가
	videoGrid.append(miniVid);	

	// 7. 사용자 수 업데이트
	countUser(); // 사용자 수를 세는 함수
}

function countUser() {
	let numb = videoGrid.childElementCount;
	document.getElementById('participant').innerHTML = numb;
}

const mainVid = document.getElementById('main-video');
function changeMainVideo(stream) {
	mainVid.srcObject = stream; // 매개변수로 전달된 stream(MediaStream 객체)를 메인 비디오의 소스로 설정
}

// WebRTC와 Socket.IO를 사용하여 화상 회의 애플리케이션에서 사용자 간 연결을 설정
const socket = io('/'); // 소켓 초기화 및 서버와 연결
let myPeerId;
let peerList = [];
let peer = new Peer(undefined, {
	// 고유 피어 ID는 PeerJS 서버에서 자동 생성
	path: '/peerjs', // PeerJS 서버 경로.
	host: '/', // PeerJS 서버 호스트
	port: '8080', // PeerJS 서버 포트
	// secure: true, // 보안 연결 사용 (https)
	// port: '443', // 보안 연결 포트
});

// 피어가 PeerJS 서버와 연결되었을 때 발생하는 이벤트
peer.on('open', (id) => {
	// PeerJS 서버가 할당한 고유 피어 ID.
	socket.emit('join-room', ROOM_ID, id); // 현재 사용자의 피어 ID를 join-room 이벤트와 함께 서버로 보냄
	myPeerId = id; // 현재 사용자의 피어 ID를 저장
	peerList[id] = USERNAME; // peerList 배열에 사용자 ID와 사용자 이름(USERNAME)을 매핑하여 저장	
});

// 서버에서 user-connected 이벤트가 발생하면 호출
// 새로운 사용자가 방에 참여했음을 알림
socket.on('user-connected', (peerId) => {
	connectToOther(peerId, myVideoStream); // 새로 참여한 사용자와 연결을 설정하고, 자신의 비디오 스트림(myVideoStream)을 공유
});

//  WebRTC와 PeerJS를 사용하여 특정 피어(peerId)와 연결을 설정하고, 미디어 스트림(예: 비디오, 오디오)을 공유
let sharedStream;

// peer.call과 peer.connect를 활용하여 미디어 스트림을 공유하고, 사용자 정보를 동기화하는 함수
const connectToOther = (peerId, stream) => {
	const call = peer.call(peerId, stream); // 현재 사용자의 미디어 스트림(stream)을 대상 피어(peerId)에게 전송하는 WebRTC 호출을 설정
	peerList[call.peer] = '';

	let i = 1;

	// 대상 피어로부터 미디어 스트림(userVideoStream)을 수신했을 때 실행
	call.on('stream', (userVideoStream) => {
		if (i <= 1) {
			addVideo(call.peer, '', userVideoStream); 	// 수신한 비디오 스트림을 UI에 추가
			let conn = peer.connect(peerId); 			// 대상 피어와 데이터 연결(WebRTC 데이터 채널)을 설정
			conn.on('open', function () {
				conn.send(myPeerId + ',' + USERNAME); 	// 현재 피어의 ID와 사용자 이름을 대상 피어에게 전송
			});			
		}
		i++;
	});

	if (shareState == 1) {
		// 화면 공유 상태, 1일 경우
		const call1 = peer.call(peerId, sharedStream); // 화면 공유 스트림(sharedStream)을 대상 피어에게 전송
	}
};

// PeerJS를 활용하여 WebRTC 호출을 처리하고, 피어 간의 스트림 교환 및 화면 공유 상태를 관리
let myVideoStream1;

// 다른 피어가 현재 피어로 WebRTC 호출을 전송할 때 실행
peer.on('call', (call) => {
	navigator.mediaDevices
		.getUserMedia({
			// 현재 피어의 비디오 및 오디오 스트림을 캡처
			video: true,
			audio: true,
		})
		.then((stream) => {
			myVideoStream1 = stream;
			call.answer(stream); // WebRTC 호출에 응답하고, 현재 피어의 미디어 스트림을 전송
			let conn = peer.connect(call.peer); // 호출한 피어와 데이터 연결(WebRTC 데이터 채널)을 설정
			conn.on('open', function () {
				conn.send(myPeerId + ',' + USERNAME); // 데이터 채널을 통해 현재 피어의 myPeerId와 USERNAME을 호출한 피어로 전송
			});
		});

	if (peerList.hasOwnProperty(call.peer) == false) {
		// peerList에 해당 피어가 존재하지 않는 경우
		let i = 1;
		call.on('stream', (userVideoStream) => {
			if (i <= 1) {
				addVideo(call.peer, '', userVideoStream);
			}
			i++;
		});
		peerList[call.peer] = '';
	} else {
		// peerList에 해당 피어가 존재하는 경우
		call.on('stream', (userVideoStream) => {
			changeMainVideo(userVideoStream); 	// 수신된 스트림을 메인 비디오로 설정
			streamBack = userVideoStream; 		// 수신된 스트림을 전역 변수 streamBack에 저장
			// UI 업데이트
			document.getElementById('shareControl').onclick = getSharedVideo;
			document.getElementById('shareText').innerHTML = 'Back in';
		});
	}
});

// 피어 간의 데이터 통신을 설정하고, 수신된 데이터를 사용해 사용자 정보를 업데이트하는 기능
let peerName;

peer.on('connection', function (conn) {
	// 다른 피어가 현재 피어와 연결을 요청할 때 발생
	conn.on('data', function (data) {
		// 연결을 통해 데이터를 수신할 때 발생하는 이벤트
		let message = data.split(','); // 수신된 데이터를 쉼표(,)로 구분하여 배열로 변환, "peerId,username" → ["peerId", "username"]
		peerList[message[0]] = message[1]; // message[0]: 피어 ID, message[1]: 사용자 이름
		document.getElementById(message[0]).innerHTML = message[1]; // 피어 ID에 해당하는 HTML 요소를 찾아서, 그 내용(innerHTML)을 사용자 이름으로 업데이트

		// 각 방에 새로 참가한 사람에 대한 정보를 보여줌.
		Toastify({
			text: `${message[1]} 님이 대화방에 참여했습니다.`, // 입장 메시지
			duration: 3000, 	// 표시 시간 (ms)
			gravity: 'bottom', 	// 위치 (top, bottom)
			position: 'right', 	// 위치 (left, center, right)
			backgroundColor: 'linear-gradient(to right, #ff5f6d, #ffc371)', // 배경 색상
			className: 'info', 	// CSS 클래스
		}).showToast();
	});
});

//================================================================================================
// 마이크 제어
//================================================================================================
function muteUnmute() {
	const enabled = myVideoStream.getAudioTracks()[0].enabled;
	if (enabled) {
		const html = `
            <i class="material-icons">&#xe02b;</i>
            <p class="label">Mic</p>
            `;
		document.getElementById('audioControl').innerHTML = html;
		myVideoStream.getAudioTracks()[0].enabled = false;
		myVideoStream1.getAudioTracks()[0].enabled = false;
	} else {
		const html = `
            <i class="material-icons">&#xe029;</i>
            <p class="label">Mic</p>
            `;
		document.getElementById('audioControl').innerHTML = html;
		myVideoStream.getAudioTracks()[0].enabled = true;
		myVideoStream1.getAudioTracks()[0].enabled = true;
	}
}

//================================================================================================
// 카메라 제어
//================================================================================================
function playStop() {
	let enabled = myVideoStream.getVideoTracks()[0].enabled;
	if (enabled) {
		myVideoStream.getVideoTracks()[0].enabled = false;
		myVideoStream1.getVideoTracks()[0].enabled = false;
		const html = `
            <i class="material-icons">&#xe04c;</i>
            <p class="label">Cam</p>
            `;
		document.getElementById('videoControl').innerHTML = html;
	} else {
		myVideoStream.getVideoTracks()[0].enabled = true;
		myVideoStream1.getVideoTracks()[0].enabled = true;
		const html = `
            <i class="material-icons">&#xe04b;</i>
            <p class="label">Cam</p>
            `;
		document.getElementById('videoControl').innerHTML = html;
	}
}

//================================================================================================
// 화면 공유
//================================================================================================
let shareState = 0; // 화면 공유 상태 (0: 공유 안 함, 1: 공유 중)
let videoTrack; // 공유 중인 비디오 트랙
let streamBack; // 화면 공유 스트림 백업

// 화면 공유 버튼 클릭 시 호출되는 함수
function shareScreen() {
	if (shareState == 0) {
		startShareScreen(); // 공유 시작
	} else {
		stopShareScreen(); // 공유 중단
	}
}

// 화면 공유를 시작하는 함수
function startShareScreen() {
	navigator.mediaDevices
		.getDisplayMedia({
			// 화면 공유를 요청
			video: { cursor: 'always' }, // 커서가 항상 보이도록 설정
			audio: {
				// 오디오 설정
				echoCancellation: true, // 에코 제거
				noiseSuppression: true, // 소음 제거
			},
		})
		.then((stream) => {
			sharedStream = stream; // 공유 스트림 저장
			shareState = 1; // 상태를 '공유 중'으로 변경
			document.getElementById('shareControl').style.color = '#fd6f13'; // 버튼 색상 변경

			let peerToCall = Object.keys(peerList) + ''; // 연결된 피어 목록 가져오기
			const peerArray = peerToCall.split(','); // 피어 ID 배열로 변환
			for (let i = 1; i <= peerArray.length; i++) {
				// 각 피어에게 화면 공유 스트림 전송
				const call = peer.call(peerArray[i], stream); // 스트림 전송
				changeMainVideo(stream); // 메인 비디오 변경
			}

			videoTrack = stream.getVideoTracks()[0]; // 공유 중인 비디오 트랙 가져오기
			videoTrack.onended = function () {
				// 화면 공유 종료 이벤트
				stopShareScreen(); // 공유 중단 호출
			};
		})
		.catch((err) => {
			console.log('unable to share screen ' + err); // 에러 로그 출력
		});
}

// 화면 공유를 중단하는 함수
function stopShareScreen() {
	shareState = 0; // 상태를 '공유 안 함'으로 변경
	document.getElementById('shareControl').style.color = '#000000'; // 버튼 색상 복원
	videoTrack.stop(); // 비디오 트랙 종료
	changeMainVideo(myVideoStream); // 메인 비디오를 기본 스트림으로 변경
	socket.emit('stop-screen-share', myPeerId); // 다른 피어들에게 화면 공유 중단 알림
}

// 다른 피어가 화면 공유를 중단했을 때 처리
socket.on('no-share', (peerId) => {
	changeMainVideo(myVideoStream); // 메인 비디오를 기본 스트림으로 변경
	document.getElementById('shareControl').onclick = shareScreen; // 버튼 이벤트 복원
	document.getElementById('shareText').innerHTML = 'Share'; // 버튼 텍스트 복원
});

// 공유된 화면 스트림을 메인 비디오로 설정
function getSharedVideo() {
	changeMainVideo(streamBack); // 공유된 스트림을 메인 비디오로 설정
}

//================================================================================================
// 화면 저장
// - 화면 및 오디오를 녹화하고 이를 .mp4 파일로 저장하는 기능
//================================================================================================
let recordState = 1; // 녹화 상태 (1: 녹화 중지, 0: 녹화 중)
let stream = null,
	audio = null,
	mixedStream = null,
	chunks = [],
	recorder = null;

// 녹화 버튼 클릭 시 호출되는 함수
function recordMeeting() {
	if (recordState == 1) {
		startRecording(); // 녹화 시작
	} else {
		stopRecording(); // 녹화 중단
	}
}

// 녹화를 시작하는 함수
async function startRecording() {
	try {
		// 화면 스트림 가져오기
		stream = await navigator.mediaDevices.getDisplayMedia({
			video: true, // 비디오 포함
			audio: true, // 오디오 포함
		});

		// 오디오 스트림 가져오기
		audio = await navigator.mediaDevices.getUserMedia({
			audio: {
				echoCancellation: true, // 에코 제거
				noiseSuppression: true, // 소음 제거
				sampleRate: 44100, // 샘플링 속도 설정
			},
		});

		recordState = 0; // 상태를 '녹화 중'으로 변경
		document.getElementById('recordControl').style.color = '#fd6f13'; // UI 색상 변경
	} catch (err) {
		console.error(err); // 에러 발생 시 로그 출력
	}

	// 화면 및 오디오 스트림이 모두 준비된 경우
	if (stream && audio) {
		mixedStream = new MediaStream([
			...stream.getTracks(), // 화면 스트림 트랙 추가
			...audio.getTracks(), // 오디오 스트림 트랙 추가
		]);

		// MediaRecorder를 사용하여 녹화 객체 생성
		recorder = new MediaRecorder(mixedStream);
		recorder.ondataavailable = handleDataAvailable; // 데이터 청크 처리
		recorder.onstop = handleStop; // 녹화 중단 처리
		recorder.start(1000); // 1초마다 데이터 청크 생성
	}
}

// 데이터 청크를 처리하는 함수
function handleDataAvailable(e) {
	chunks.push(e.data); // 녹화된 데이터를 배열에 저장
}

// 녹화가 중단되었을 때 호출되는 함수
function handleStop(e) {
	// 저장된 청크를 Blob 형태로 변환 (MP4 형식)
	const blob = new Blob(chunks, { type: 'video/mp4' });

	chunks = []; // 청크 배열 초기화

	// 스트림과 오디오 트랙 중지
	stream.getTracks().forEach((track) => track.stop());
	audio.getTracks().forEach((track) => track.stop());

	// 다운로드 링크 생성 및 자동 다운로드
	let element = document.createElement('a');
	element.href = URL.createObjectURL(blob); // Blob을 URL로 변환
	element.download = 'video.mp4'; // 파일명 설정
	element.style.display = 'none'; // 화면에 표시하지 않음
	document.body.appendChild(element); // DOM에 추가
	element.click(); // 다운로드 실행
	document.body.removeChild(element); // DOM에서 제거
}

// 녹화를 중단하는 함수
function stopRecording() {
	recordState = 1; // 상태를 '녹화 중지'로 변경
	document.getElementById('recordControl').style.color = '#000000'; // UI 색상 복원
	recorder.stop(); // 녹화 중단
}

//================================================================================================
// 텍스트 채팅
// - 사용자 입력 메시지를 서버로 전송하고, 서버에서 메시지를 수신하여 채팅방에 표시
// - 추가적으로 파일 업로드 기능과 채팅 인터페이스의 스크롤 동작을 처리
//================================================================================================
let text = $('#textchat'); // 입력 필드 변수 선언

// Enter 키로 메시지 전송
$('#textchat').keydown((e) => {
	let hour = new Date().getHours(); // 현재 시간(시) 가져오기
	hour = ('0' + hour).slice(-2); // 두 자리 형식으로 변경
	let minute = new Date().getMinutes(); // 현재 시간(분) 가져오기
	minute = ('0' + minute).slice(-2); // 두 자리 형식으로 변경
	let time = hour + '.' + minute; // HH.MM 형식으로 시간 생성

	// Enter 키(코드 13)를 누르고 메시지가 비어있지 않을 때
	if (e.which == 13 && text.val().length !== 0) {
		socket.emit('message', text.val(), USERNAME, RANDOM_COLOR, time); // 메시지를 서버로 전송
		text.val(''); // 입력 필드 초기화
	}
});

let uploadState = 0; // 업로드 상태 (0: 메시지 전송, 1: 파일 업로드)

// 버튼 클릭으로 메시지 또는 파일 전송
$('#sendMessage').click(() => {
	let hour = new Date().getHours();
	hour = ('0' + hour).slice(-2);
	let minute = new Date().getMinutes();
	minute = ('0' + minute).slice(-2);
	let time = hour + ':' + minute;

	if (uploadState == 0) {
		// 메시지 전송
		socket.emit('message', text.val(), USERNAME, RANDOM_COLOR, time); // 메시지를 서버로 전송
		text.val(''); // 입력 필드 초기화
	} else {
		// 파일 업로드
		uploadFile(); // 파일 업로드 함수 호출
		const html = `<a href="uploaded-files/${text.val()}" target="_blank">${text.val()}</a>`;
		socket.emit('message', html, USERNAME, RANDOM_COLOR, time); // 파일 링크를 서버로 전송
		text.val(''); // 입력 필드 초기화
	}
});

// 서버에서 메시지를 수신하면 채팅방에 추가
socket.on('createMessage', (message, sender, color, time) => {
	let initial = sender.substring(0, 1); // 발신자의 이름 첫 글자 추출
	$('#chatroom').append(`
<div id="left-chatroom" style="background-color: ${color}"> <!-- 발신자 프로필 표시 -->
  <p class="profil">${initial}</p> <!-- 프로필 첫 글자 -->
 <div class="mini-active"></div> <!-- 활동 상태 -->
</div>
<div id="right-chatroom">
 <div id="message">
  <p id="message-user" style="color: #303030; font-weight: bold;">${sender}</p> <!-- 발신자 이름 -->
  <p id="message-text">${message}</p> <!-- 메시지 내용 -->
  </div>
</div>
 <p id="time-text" style="font-size:11px; color:#303030; margin-left: 55px; margin-top: 0px; padding-top: 0px; margin-bottom: 12px; color: white;">${time}</p> <!-- 메시지 시간 -->
 `);
	scrollToBottom(); // 새 메시지가 추가될 때 스크롤 동작
});

// 채팅방 스크롤을 최하단으로 이동하는 함수
function scrollToBottom() {
	let d = $('#chatroom'); // 채팅방 요소 선택
	d.scrollTop(d.prop('scrollHeight')); // 스크롤을 채팅방 맨 아래로 설정
}

//================================================================================================
// 파일 업로드
//================================================================================================
// 파일 선택 시 호출되며, 파일 이름을 추출하고 입력 필드에 표시하며 업로드 상태(uploadState)를 활성화
function selectFile(val) {
	console.log('호출 : ' + val);
	let filename = val.replace(/C:\\fakepath\\/i, ''); // 파일 경로에서 파일 이름만 추출
	console.log(filename);
	document.getElementById('textchat').value = filename; // 파일 이름을 입력 필드에 표시
	uploadState = 1; // 업로드 상태 활성화
}

// 파일을 서버로 업로드하는 함수
function uploadFile() {
	//alert("파일 업로드...");                      // 업로드 시작 알림
	uploadState = 0; // 업로드 상태 초기화

	const file = document.getElementById('file'); // 파일 입력 요소 가져오기
	const fileReader = new FileReader(); // FileReader 객체 생성
	const theFile = file.files[0]; // 선택된 파일 가져오기

	fileReader.onload = async (ev) => {
		// 파일 크기에 따라 청크 수 계산
		const chunkCount =
			Math.floor(ev.target.result.byteLength / (1024 * 1024)) + 1;
		const CHUNK_SIZE = ev.target.result.byteLength / chunkCount; // 청크 크기 계산
		const fileName = theFile.name; // 파일 이름 가져오기

		// 파일을 청크 단위로 나눠 서버로 전송
		for (let chunkId = 0; chunkId < chunkCount + 1; chunkId++) {
			// 현재 청크 데이터 추출
			const chunk = ev.target.result.slice(
				chunkId * CHUNK_SIZE,
				chunkId * CHUNK_SIZE + CHUNK_SIZE
			);
			// 서버로 청크 전송
			await fetch('/upload', {
				method: 'POST', // POST 요청
				headers: {
					'content-type': 'application/octet-stream', // 바이너리 데이터 전송
					'file-name': fileName, // 파일 이름
					'content-length': chunk.length, // 청크 크기
				},
				body: chunk, // 청크 데이터를 요청 본문에 포함
			});
		}
	};

	// 파일을 ArrayBuffer 형식으로 읽기 시작
	fileReader.readAsArrayBuffer(theFile);
	file.value = ''; // 파일 입력 필드 초기화
}

// 사용자가 회의를 떠날 때 호출되는 함수
function leaveMeeting() {
	let text = '정말 나갈까요?'; // 확인 메시지
	if (confirm(text) == true) {
		// 사용자가 확인 버튼을 클릭했는지 확인
		socket.emit('leave-meeting', myPeerId, USERNAME); // 서버에 퇴장 이벤트 알림
		peer.disconnect(); // P2P 연결 종료
		location.assign('/'); // 메인 페이지로 이동
	}
}

// 다른 사용자가 회의에서 나갔을 때 서버에서 호출
socket.on('user-leave', (peerId, peerName) => {
	Toastify({
		text: `${peerName} 님이 대화방을 나갔습니다.`, // 퇴장 메시지
		duration: 3000, // 표시 시간 (ms)
		gravity: 'top', // 위치 (top, bottom)
		position: 'right', // 위치 (left, center, right)
		backgroundColor: 'linear-gradient(to right, #ff5f6d, #ffc371)', // 배경 색상
		className: 'info', // CSS 클래스
	}).showToast();

	// 퇴장한 사용자의 비디오 노드를 DOM에서 제거
	let node = document.getElementById(peerId).parentNode;
	videoGrid.removeChild(node);
	countUser(); // 현재 사용자 수를 업데이트
});

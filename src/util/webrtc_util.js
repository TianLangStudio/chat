//端点对象
import {console} from "next/dist/compiled/@edge-runtime/primitives/console";

let rtcPeerConnection;

//本地视频流
let localMediaStream = null;

//ice服务器信息, 用于创建 SDP 对象
let iceServers = {
    "iceServers": [
        // {"url": "stun:stun.l.google.com:19302"},
        {"urls": ["stun:159.75.239.36:3478"]},
        {"urls": ["turn:159.75.239.36:3478"], "username": "chr", "credential": "123456"},
    ]
};

// 本地音视频信息, 用于 打开本地音视频流
export const mediaConstraints = {
    video: {width: 500, height: 300},
    audio: true //由于没有麦克风，所有如果请求音频，会报错，不过不会影响视频流播放
};

// 创建 offer 的信息
export const offerOptions = {
    iceRestart: true,
    offerToReceiveAudio: true, //由于没有麦克风，所有如果请求音频，会报错，不过不会影响视频流播放
};
// 1、打开本地音视频流
export const openLocalMedia = (callback) => {
    console.log('打开本地视频流');
    navigator.mediaDevices.getUserMedia(mediaConstraints)
        .then(stream => {
            localMediaStream = stream;
            //将 音视频流 添加到 端点 中
            for (const track of localMediaStream.getTracks()) {
                rtcPeerConnection.addTrack(track, localMediaStream);
            }
            callback(localMediaStream);
        })
}
// 2、创建 PeerConnection 对象
export const createPeerConnection = () => {
    rtcPeerConnection = new RTCPeerConnection(iceServers);
}
// 3、创建用于 offer 的 SDP 对象
export const createOffer = (callback) => {
    console.log("createOffer");
    // 调用PeerConnection的 CreateOffer 方法创建一个用于 offer的SDP对象，SDP对象中保存当前音视频的相关参数。
    rtcPeerConnection.createOffer(offerOptions)
        .then(sdp => {
            console.log('offer sdp', sdp);
            // 保存自己的 SDP 对象
            rtcPeerConnection.setLocalDescription(sdp)
                .then(() => callback(sdp));
        })
        .catch(() => console.log('createOffer 失败'));
}
// 4、创建用于 answer 的 SDP 对象
export const createAnswer = (callback) => {
    // 调用PeerConnection的 CreateAnswer 方法创建一个 answer的SDP对象
    rtcPeerConnection.createAnswer(offerOptions)
        .then(sdp => {
            console.log('answer sdp', sdp);
            // 保存自己的 SDP 对象
            rtcPeerConnection.setLocalDescription(sdp)
                .then(() => callback(sdp));
        })
        .catch(() => console.log('createAnswer 失败'))
}
// 5、保存远程的 SDP 对象
export const saveSdp = (answerSdp, callback) => {
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(answerSdp))
        .then(callback);
}
// 6、保存 candidate 信息
export const saveIceCandidate = (candidate) => {
    let iceCandidate = new RTCIceCandidate(candidate);
    rtcPeerConnection.addIceCandidate(iceCandidate)
        .then(() => console.log('addIceCandidate 成功'));
}
// 7、收集 candidate 的回调
export const bindOnIceCandidate = (callback) => {
    // 绑定 收集 candidate 的回调
    rtcPeerConnection.onicecandidate = (event) => {
        console.log('onicecandidate', event);
        if (event.candidate) {
            callback(event.candidate);
        }
    };
};
// 8、获得 远程视频流 的回调
export const bindOnTrack = (callback) => {
    rtcPeerConnection.ontrack = (event) => callback(event.streams[0]);
};

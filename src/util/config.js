//chat
//webrtc
const iceServers = {
    "iceServers": [
        {"url": "stun:stun.l.google.com:19302"},
        {"urls": ["stun:159.75.239.36:3478"]},
        {"urls": ["turn:159.75.239.36:3478"], "username": "chr", "credential": "123456"},
    ]
};
export const getIceServers = () => {
    return iceServers;
}
export const offerOptions = {
    iceRestart: true,
    offerToReceiveAudio: true, //由于没有麦克风，所有如果请求音频，会报错，不过不会影响视频流播放
};


